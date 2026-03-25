#!/usr/bin/env node
/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

let path = require('path');

let program = require('jake').program;
delete global.jake; // NO NOT WANT
program.setTaskNames = function (n) { this.taskNames = n; };

let ejs = require('../lib/ejs');
let { hyphenToCamel } = require('../lib/utils');
let fs = require('fs');
let args = process.argv.slice(2);
let usage = fs.readFileSync(`${__dirname}/../usage.txt`).toString();

const CLI_OPTS = [
  { full: 'output-file',
    abbr: 'o',
    expectValue: true,
  },
  { full: 'data-file',
    abbr: 'f',
    expectValue: true,
  },
  { full: 'data-input',
    abbr: 'i',
    expectValue: true,
  },
  { full: 'delimiter',
    abbr: 'm',
    expectValue: true,
    passThrough: true,
  },
  { full: 'open-delimiter',
    abbr: 'p',
    expectValue: true,
    passThrough: true,
  },
  { full: 'close-delimiter',
    abbr: 'c',
    expectValue: true,
    passThrough: true,
  },
  { full: 'strict',
    abbr: 's',
    expectValue: false,
    allowValue: false,
    passThrough: true,
  },
  { full: 'no-with',
    abbr: 'n',
    expectValue: false,
    allowValue: false,
  },
  { full: 'locals-name',
    abbr: 'l',
    expectValue: true,
    passThrough: true,
  },
  { full: 'rm-whitespace',
    abbr: 'w',
    expectValue: false,
    allowValue: false,
    passThrough: true,
  },
  { full: 'debug',
    abbr: 'd',
    expectValue: false,
    allowValue: false,
    passThrough: true,
  },
  { full: 'help',
    abbr: 'h',
    passThrough: true,
  },
  { full: 'version',
    abbr: 'V',
    passThrough: true,
  },
  // Alias lowercase v
  { full: 'version',
    abbr: 'v',
    passThrough: true,
  },
];

let preempts = {
  version: function () {
    program.die(ejs.VERSION);
  },
  help: function () {
    program.die(usage);
  }
};

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    stdin += chunk;
  }
});

function run() {

  program.availableOpts = CLI_OPTS;
  program.parseArgs(args);

  let templatePath = program.taskNames[0];
  let pVals = program.envVars;
  let pOpts = {};

  for (let p in program.opts) {
    let name = hyphenToCamel(p);
    pOpts[name] = program.opts[p];
  }

  let opts = {};
  let vals = {};

  // Same-named 'passthrough' opts
  CLI_OPTS.forEach((opt) => {
    let optName = hyphenToCamel(opt.full);
    if (opt.passThrough && typeof pOpts[optName] != 'undefined') {
      opts[optName] = pOpts[optName];
    }
  });

  // Bail out for help/version
  for (let p in opts) {
    if (preempts[p]) {
      return preempts[p]();
    }
  }

  // Ensure there's a template to render
  if (!templatePath) {
    throw new Error('Please provide a template path. (Run ejs -h for help)');
  }

  if (opts.strict) {
    pOpts.noWith = true;
  }
  if (pOpts.noWith) {
    opts._with = false;
  }

  // Grab and parse any input data, in order of precedence:
  // 1. Stdin
  // 2. CLI arg via -i
  // 3. Data file via -f
  // Any individual vals passed at the end (e.g., foo=bar) will override
  // any vals previously set
  let input;
  let err = new Error('Please do not pass data multiple ways. Pick one of stdin, -f, or -i.');
  if (stdin) {
    input = stdin;
  }
  else if (pOpts.dataInput) {
    if (input) {
      throw err;
    }
    input = decodeURIComponent(pOpts.dataInput);
  }
  else if (pOpts.dataFile) {
    if (input) {
      throw err;
    }
    input = fs.readFileSync(pOpts.dataFile).toString();
  }

  if (input) {
    vals = JSON.parse(input);
  }

  // Override / set any individual values passed from the command line
  for (let p in pVals) {
    vals[p] = pVals[p];
  }

  opts.filename = path.resolve(process.cwd(), templatePath);
  let template = fs.readFileSync(opts.filename).toString();
  let output = ejs.render(template, vals, opts);
  if (pOpts.outputFile) {
    fs.writeFileSync(pOpts.outputFile, output);
  }
  else {
    process.stdout.write(output);
  }
  process.exit();
}

// Defer execution so that stdin can be read if necessary
setImmediate(run);
