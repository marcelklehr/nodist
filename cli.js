'use strict';
/*!
 * nodist
 * A Node version manager for the windows folks out there.
 * Copyright 2012 by Marcel Klehr <mklehr@gmx.net>
 *
 * (MIT LICENSE)
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var version = process.argv[2];
var nodist = require('./lib/nodist');
var npm = require('./lib/npm');
var path = require('path');
var fs = require('fs');

// Exit with a code and (optionally) with a message
var exit = function exit(code, msg){
  if(msg) console.log(msg);
  process.exit(code);
};

// Abort with an optional message being displayed
var abort = function abort(msg) {
  exit(1, !msg? null : msg.split('. ').join('.\r\n'));
};

// Display the command line help and exit
function help() {
  fs.readFile(__dirname+'\\usage.txt', function(err, usage) {
    if(err){
      abort(
        'Could not fetch help info. You will have to look at the README. Sorry.'
      );
    }
    console.log(usage.toString());
    exit();
  });
}


/**
 * Set the process title
 * @type {string}
 */
process.title = 'nodist';

if(!process.env.NODIST_PREFIX){
  abort(
    'Please set the path to the nodist directory ' +
    'in the NODIST_PREFIX environment variable.'
  );
}

var distUrl = 'https://nodejs.org/dist';
var iojsDistUrl = 'https://iojs.org/dist';
var nodistPrefix = process.env.NODIST_PREFIX.replace(/"/g, '');
var proxy = (
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  ''
);
var wantX64 = (+process.env.NODIST_X64) === 1;
var envVersion = process.env.NODIST_VERSION ?
  process.env.NODIST_VERSION.replace(/"/g, '') : process.env.NODIST_VERSION;

// Create a nodist instance
var n = new nodist(
  distUrl,
  iojsDistUrl,
  nodistPrefix,
  proxy,
  wantX64,
  envVersion
);

// Parse args
var argv = process.argv.splice(2);


/**
 * Store extra args
 * @type {Array}
 */
argv.remainder = [];
if(argv.indexOf('--') !== -1) {
  argv.remainder = argv.splice(argv.indexOf('--')).slice(1);
}
var args = argv.join(' ');
var command = argv[0];



// -V Display nodist version
if (args.match(/-v/i) !== null) {
  console.log(require('./package.json').version);
  exit();
}

// --HELP Display help
if (args.match(/--help/i)) {
  help();
}

// (bare call of 'nodist') -> list
if (!argv[0]) {
  command = 'list';
}

// LIST all installed buids
if (command.match(/^list|ls$/i)) {

  n.getGlobal(function(err, global){
    if(err) void(0);
    n.getEnv(function(err, env){
      if(err) void(0);
      n.listInstalled(function(err, ls) {
        if(err) abort(err.message+'. Sorry.');
        if(n.wantX64) console.log('  (x64)');
        if(ls.length === 0) abort('No builds installed, yet.');
        var current = env || local || global;
        // display all versions
        ls.forEach(function(version) {
          var del = '  ';
          var note = ' ';
          if (version === env) {
            note += ' (env)';
          }
          if (version === global) {
            note += ' (global)';
          }
          if (version === current) del ='> ';// highlight current

          console.log(del + version+note);
        });
        exit();
      });
    });
  });
}
// DIST list all available buids
else if (command.match(/^dist|ds$/i)) {
  n.listAvailable(function(err, ls) {
    if(err) abort(err.message+'. Sorry.');
    if(ls.length === 0) abort('No builds available. Strange...');
    // display all versions
    ls.forEach(function(version) {
      console.log('  '+version);
    });
    if(n.proxy) console.log('\n  (Proxy: ' + n.proxy + ')');
    exit();
  });
}
//NPM version management
else if (command.match(/^npm/i)){
  //so now what shall we do with npm, we probably want something like
  //'latest' and then 'version' with similar version parsing to node version
  version = argv[1];
  if('remove' === version){
    version = argv[2];
    npm.resolveVersion(version, function(er, v){
      if(er) abort(er.message+'. Sorry.');
      console.log('Resolved NPM version to ' + v);
      npm.remove(v,function(err,v){
        if(err) abort(err.message + '. Sorry.');
        console.log('NPM ' + v + ' removed!');
      });
    });
  } else {
    npm.resolveVersion(version, function(er, v) {
      if(er) abort(er.message+'. Sorry.');
      console.log('Resolved NPM version to ' + v);
      npm.install(v, function(err, v) {
        if(err) abort(err.message+'. Sorry.');
        console.log('NPM ' + v + ' installed and in use!');
      });
    });
  }
}
// ADD fetch a specific build
else if ((command.match(/^add|\+$/i)) && argv[1]) {
  version = argv[1];
  if(version.match(/^all$/i)) {
    n.installAll(function(err, real_version) {
      if(err) return console.log(err.message+'.');
      console.log('Installed '+real_version);
    });
  } else {
    n.resolveVersion(version, function(er, v) {
      if(er) abort(er.message+'. Sorry.');
      n.install(v, function(err) {
        if(err) abort(err.message+'. Sorry.');
        console.log(v);
        exit();
      });
    });
  }
}
// REMOVE an installed build
else if (command.match(/^remove|rm|-$/i) && argv[1]) {
  version = argv[1];
  n.resolveVersion(version, function(er, v) {
    if(er) abort(er.message+'. Sorry.');
    n.remove(v, function(er) {
      if(er) abort(er.message+'. Sorry.');
      exit();
    });
  });
}
// RUN a specific build
else if (command.match(/^run|r$/i) && argv[1]) {
  version = argv[1];
  n.resolveVersion(version, function(er, v) {
    if(er) abort(er.message+'. Sorry.');
    n.emulate(v, argv.remainder, function(err, code) {
      if(err) abort(err.message+'. Sorry.');
      exit(code);
    });
  });
}
// BIN get the path to a specific version
else if (command.match(/^bin$/i) && argv[1]) {
  version = argv[1];
  n.resolveVersion(version, function(er, v) {
    if(er) abort(er.message+'. Sorry.');
    n.install(v, function(err) {
      if(err) abort(err.message+'. Sorry.');
      console.log(n.getPathToExe(v));
      exit();
    });
  });
}
// PATH get the directory of a specific version to be added to the path
else if (command.match(/^path$/i) && argv[1]) {
  version = argv[1];
  n.resolveVersion(version, function(er, v) {
    if(er) abort(er.message+'. Sorry.');
    n.install(v, function(err, v) {
      if(err) abort(err.message+'. Sorry.');
      console.log(path.dirname(n.getPathToExe(v)));
    });
  });
}
// ARGS globally use the specified node version
else if (command.match(/^args$/i) && argv[1]) {
  version = argv[1];
  args = argv.slice(2).join(' ');
  n.resolveVersion(version, function(er, v) {
    if(er) abort(er.message+'. Sorry.');
    n.setArgsForVersion(v, args, function(err) {
      if(err) abort(err.message+'. Sorry.');
      console.log(v, args);
      exit();
    });
  });
}
// GLOBAL globally use the specified node version
else if (command.match(/^global$/i) && argv[1] || argv[0] && !argv[1]) {
  version = argv[1] || argv[0];
  n.resolveVersion(version, function(er, v) {
    if(er) abort(er.message+'. Sorry.');
    n.setGlobal(v, function(err) {
      if(err) abort(err.message+'. Sorry.');
      console.log(v);
      exit();
    });
  });
}
// HELP display help for unknown cli parameters
else {
  help();
}
