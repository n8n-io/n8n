#!/usr/bin/env node

var fs = require('fs'),
    path = require('path');

var Mustache = require('..');
var pkg = require('../package');
var partials = {};

var partialsPaths = [];
var partialArgIndex = -1;

while ((partialArgIndex = process.argv.indexOf('-p')) > -1) {
  partialsPaths.push(process.argv.splice(partialArgIndex, 2)[1]);
}

var viewArg = process.argv[2];
var templateArg = process.argv[3];
var outputArg = process.argv[4];

if (hasVersionArg()) {
  return console.log(pkg.version);
}

if (!templateArg || !viewArg) {
  console.error('Syntax: mustache <view> <template> [output]');
  process.exit(1);
}

run(readPartials, readView, readTemplate, render, toStdout);

/**
 * Runs a list of functions as a waterfall.
 * Functions are runned one after the other in order, providing each
 * function the returned values of all the previously invoked functions.
 * Each function is expected to exit the process if an error occurs.
 */
function run (/*args*/) {
  var values = [];
  var fns = Array.prototype.slice.call(arguments);

  function invokeNextFn (val) {
    values.unshift(val);
    if (fns.length === 0) return;
    invoke(fns.shift());
  }

  function invoke (fn) {
    fn.apply(null, [invokeNextFn].concat(values));
  }

  invoke(fns.shift());
}

function readView (cb) {
  var view;
  if (isJsFile(viewArg)) {
    view = require(path.join(process.cwd(),viewArg));
    cb(view);
  } else {
    if (isStdin(viewArg)) {
      view = process.openStdin();
    } else {
      view = fs.createReadStream(viewArg);
    }
    streamToStr(view, function onDone (str) {
      cb(parseView(str));
    });
  }
}

function parseView (str) {
  try {
    return JSON.parse(str);
  } catch (ex) {
    console.error(
      'Shooot, could not parse view as JSON.\n' +
      'Tips: functions are not valid JSON and keys / values must be surround with double quotes.\n\n' +
      ex.stack);

    process.exit(1);
  }
}

function readPartials (cb) {
  if (!partialsPaths.length) return cb();
  var partialPath = partialsPaths.pop();
  var partial = fs.createReadStream(partialPath);
  streamToStr(partial, function onDone (str) {
    partials[getPartialName(partialPath)] = str;
    readPartials(cb);
  });
}

function readTemplate (cb) {
  var template = fs.createReadStream(templateArg);
  streamToStr(template, cb);
}

function render (cb, templateStr, jsonView) {
  cb(Mustache.render(templateStr, jsonView, partials));
}

function toStdout (cb, str) {
  if (outputArg) {
    cb(fs.writeFileSync(outputArg, str));
  } else {
    cb(process.stdout.write(str));
  }
}

function streamToStr (stream, cb) {
  var data = '';

  stream.on('data', function onData (chunk) {
    data += chunk;
  }).once('end', function onEnd () {
    cb(data.toString());
  }).on('error', function onError (err) {
    if (wasNotFound(err)) {
      console.error('Could not find file:', err.path);
    } else {
      console.error('Error while reading file:', err.message);
    }
    process.exit(1);
  });
}

function isStdin (view) {
  return view === '-';
}

function isJsFile (view) {
  var extension = path.extname(view);
  return extension === '.js' || extension === '.cjs';
}

function wasNotFound (err) {
  return err.code && err.code === 'ENOENT';
}

function hasVersionArg () {
  return ['--version', '-v'].some(function matchInArgs (opt) {
    return process.argv.indexOf(opt) > -1;
  });
}

function getPartialName (filename) {
  return path.basename(filename, '.mustache');
}
