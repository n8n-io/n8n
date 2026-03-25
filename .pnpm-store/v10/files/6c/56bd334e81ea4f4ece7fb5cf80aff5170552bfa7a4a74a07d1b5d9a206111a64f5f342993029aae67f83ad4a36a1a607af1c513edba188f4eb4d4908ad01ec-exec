#!/usr/bin/env node
/*eslint no-console:0*/

'use strict';


var fs = require('fs');
var argparse = require('argparse');


////////////////////////////////////////////////////////////////////////////////

var cli = new argparse.ArgumentParser({
  prog: 'markdown-it',
  add_help: true
});

cli.add_argument('-v', '--version', {
  action: 'version',
  version: require('../package.json').version
});

cli.add_argument('--no-html', {
  help:   'Disable embedded HTML',
  action: 'store_true'
});

cli.add_argument('-l', '--linkify', {
  help:   'Autolink text',
  action: 'store_true'
});

cli.add_argument('-t', '--typographer', {
  help:   'Enable smartquotes and other typographic replacements',
  action: 'store_true'
});

cli.add_argument('--trace', {
  help:   'Show stack trace on error',
  action: 'store_true'
});

cli.add_argument('file', {
  help: 'File to read',
  nargs: '?',
  default: '-'
});

cli.add_argument('-o', '--output', {
  help: 'File to write',
  default: '-'
});

var options = cli.parse_args();


function readFile(filename, encoding, callback) {
  if (options.file === '-') {
    // read from stdin
    var chunks = [];

    process.stdin.on('data', function (chunk) { chunks.push(chunk); });

    process.stdin.on('end', function () {
      return callback(null, Buffer.concat(chunks).toString(encoding));
    });
  } else {
    fs.readFile(filename, encoding, callback);
  }
}


////////////////////////////////////////////////////////////////////////////////

readFile(options.file, 'utf8', function (err, input) {
  var output, md;

  if (err) {
    if (err.code === 'ENOENT') {
      console.error('File not found: ' + options.file);
      process.exit(2);
    }

    console.error(
      options.trace && err.stack ||
      err.message ||
      String(err));

    process.exit(1);
  }

  md = require('..')({
    html: !options.no_html,
    xhtmlOut: false,
    typographer: options.typographer,
    linkify: options.linkify
  });

  try {
    output = md.render(input);

  } catch (e) {
    console.error(
      options.trace && e.stack ||
      e.message ||
      String(e));

    process.exit(1);
  }

  if (options.output === '-') {
    // write to stdout
    process.stdout.write(output);
  } else {
    fs.writeFileSync(options.output, output);
  }
});
