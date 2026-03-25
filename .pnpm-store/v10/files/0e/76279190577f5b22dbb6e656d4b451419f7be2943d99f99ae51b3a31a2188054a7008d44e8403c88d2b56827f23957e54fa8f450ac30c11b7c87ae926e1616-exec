#!/usr/bin/env node

'use strict';

var parseArgs = require('minimist');
var gonzales = require('..');
var fs = require('fs');
var path = require('path');

var options = getOptions();

if (options.help) {
  displayHelp();
  process.exit(0);
}

if (isSTDIN()) {
  processSTDIN();
} else {
  processFile(options._[0]);
}

function getOptions() {
  var parserOptions = {
    boolean: ['silent', 'simple'],
    alias: {
      help: 'h',
      syntax: 's',
      context: 'c'
    }
  };
  return parseArgs(process.argv.slice(2), parserOptions);
}

function isSTDIN() {
  return options._.indexOf('-') !== -1;
}

function processSTDIN() {
  var input = '';
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', data => {
    input += data;
  });
  process.stdin.on('end', () => {
    processInputData(input);
  });
}

function processFile(file) {
  if (!file) process.exit(0);
  if (!options.syntax) options.syntax = path.extname(file).substring(1);
  var css = fs.readFileSync(file, 'utf-8').trim();
  processInputData(css);
}

function processInputData(input) {
  try {
    var ast = gonzales.parse(input, {
      syntax: options.syntax,
      context: options.context
    });
    printTree(ast);
    process.exit(0);
  } catch (e) {
    if (!options.silent) process.stderr.write(e.toString());
    process.exit(1);
  }
}

function printTree(ast) {
  if (!options.simple) {
    var tree = ast.toJson();
    process.stdout.write(tree);
  } else {
    var lastLevel;

    ast.traverse(function(node, i, parent, lastLevel) {
      var type = node.type;
      var spaces = new Array(lastLevel).join(' |');
      if (typeof node.content === 'string') {
        var content = JSON.stringify(node.content);
        console.log(spaces, '->', type);
        console.log(spaces, '  ', content);
      } else {
        console.log(spaces, '->', type);
      }
    });

    var spaces = new Array(lastLevel).join(' -');
    console.log(spaces);
  }
}

function displayHelp() {
  var help = [
      'NAME',
      '    gonzlaes-pe — Parse a css file and print its parse tree in JSON',
      '',
      'SYNOPSIS',
      '    gonzales-pe [options] file.js',
      '    cat file.js | gonzales-pe [options] -',
      '',
      'OPTIONS',
      '    -s, --syntax',
      '        Syntax name: css, less, sass or scss.',
      '    -c, --context',
      '        Context of code part. See docs on node types for more info.',
      '    --simple',
      '        Print a simplified parse tree structure instead of JSON.',
      '    --silent',
      '        Don\'t print any error messages.'
  ];
  console.log(help.join('\n'));
}
