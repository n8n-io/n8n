#!/usr/bin/env node

var argv = parseArgs({
  'f': {
    'type': 'string',
    'description': 'Output File',
    'alias': 'output'
  },
  'map': {
    'type': 'string',
    'description': 'Source Map File'
  },
  'a': {
    'type': 'boolean',
    'description': 'Exports amd style (require.js)',
    'alias': 'amd'
  },
  'c': {
    'type': 'string',
    'description': 'Exports CommonJS style, path to Handlebars module',
    'alias': 'commonjs',
    'default': null
  },
  'h': {
    'type': 'string',
    'description': 'Path to handlebar.js (only valid for amd-style)',
    'alias': 'handlebarPath',
    'default': ''
  },
  'k': {
    'type': 'string',
    'description': 'Known helpers',
    'alias': 'known'
  },
  'o': {
    'type': 'boolean',
    'description': 'Known helpers only',
    'alias': 'knownOnly'
  },
  'm': {
    'type': 'boolean',
    'description': 'Minimize output',
    'alias': 'min'
  },
  'n': {
    'type': 'string',
    'description': 'Template namespace',
    'alias': 'namespace',
    'default': 'Handlebars.templates'
  },
  's': {
    'type': 'boolean',
    'description': 'Output template function only.',
    'alias': 'simple'
  },
  'N': {
    'type': 'string',
    'description': 'Name of passed string templates. Optional if running in a simple mode. Required when operating on multiple templates.',
    'alias': 'name'
  },
  'i': {
    'type': 'string',
    'description': 'Generates a template from the passed CLI argument.\n"-" is treated as a special value and causes stdin to be read for the template value.',
    'alias': 'string'
  },
  'r': {
    'type': 'string',
    'description': 'Template root. Base value that will be stripped from template names.',
    'alias': 'root'
  },
  'p': {
    'type': 'boolean',
    'description': 'Compiling a partial template',
    'alias': 'partial'
  },
  'd': {
    'type': 'boolean',
    'description': 'Include data when compiling',
    'alias': 'data'
  },
  'e': {
    'type': 'string',
    'description': 'Template extension.',
    'alias': 'extension',
    'default': 'handlebars'
  },
  'b': {
    'type': 'boolean',
    'description': 'Removes the BOM (Byte Order Mark) from the beginning of the templates.',
    'alias': 'bom'
  },
  'v': {
    'type': 'boolean',
    'description': 'Prints the current compiler version',
    'alias': 'version'
  },
  'help': {
    'type': 'boolean',
    'description': 'Outputs this message'
  }
});

argv.files = argv._;
delete argv._;

var Precompiler = require('../dist/cjs/precompiler');
Precompiler.loadTemplates(argv, function(err, opts) {

  if (err) {
    throw err;
  }

  if (opts.help || (!opts.templates.length && !opts.version)) {
    printUsage(argv._spec, 120);
  } else {
    Precompiler.cli(opts);
  }
});

function pad(n) {
  var str = '';
  while (str.length < n) {
    str += ' ';
  }
  return str;
}

function parseArgs(spec) {
  var opts = { alias: {}, boolean: [], default: {}, string: [] };

  Object.keys(spec).forEach(function (arg) {
    var opt = spec[arg];
    opts[opt.type].push(arg);
    if ('alias' in opt) opts.alias[arg] = opt.alias;
    if ('default' in opt) opts.default[arg] = opt.default;
  });

  var argv = require('minimist')(process.argv.slice(2), opts);
  argv._spec = spec;
  return argv;
}

function printUsage(spec, wrap) {
  var wordwrap = require('wordwrap');

  console.log('Precompile handlebar templates.');
  console.log('Usage: handlebars [template|directory]...');

  var opts = [];
  var width = 0;
  Object.keys(spec).forEach(function (arg) {
    var opt = spec[arg];

    var name = (arg.length === 1 ? '-' : '--') + arg;
    if ('alias' in opt) name += ', --' + opt.alias;

    var meta = '[' + opt.type + ']';
    if ('default' in opt) meta += ' [default: ' + JSON.stringify(opt.default) + ']';

    opts.push({ name: name, desc: opt.description, meta: meta });
    if (name.length > width) width = name.length;
  });

  console.log('Options:');
  opts.forEach(function (opt) {
    var desc = wordwrap(width + 4, wrap + 1)(opt.desc);

    console.log('  %s%s%s%s%s',
      opt.name,
      pad(width - opt.name.length + 2),
      desc.slice(width + 4),
      pad(wrap - opt.meta.length - desc.split(/\n/).pop().length),
      opt.meta
      );
  });
}
