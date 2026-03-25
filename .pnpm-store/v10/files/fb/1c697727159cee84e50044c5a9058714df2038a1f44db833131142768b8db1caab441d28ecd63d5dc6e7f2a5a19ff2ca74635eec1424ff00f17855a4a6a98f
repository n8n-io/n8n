#!/usr/bin/env node

/**
 * Marked CLI
 * Copyright (c) 2011-2013, Christopher Jeffrey (MIT License)
 */

import { promises } from 'fs';
import { marked } from '../lib/marked.esm.js';

const { readFile, writeFile } = promises;

/**
 * Man Page
 */

async function help() {
  const { spawn } = await import('child_process');

  const options = {
    cwd: process.cwd(),
    env: process.env,
    setsid: false,
    stdio: 'inherit'
  };

  const { dirname, resolve } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const helpText = await readFile(resolve(__dirname, '../man/marked.1.txt'), 'utf8');

  // eslint-disable-next-line promise/param-names
  await new Promise(res => {
    spawn('man', [resolve(__dirname, '../man/marked.1')], options)
      .on('error', () => {
        console.log(helpText);
      })
      .on('close', res);
  });
}

async function version() {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const pkg = require('../package.json');
  console.log(pkg.version);
}

/**
 * Main
 */

async function main(argv) {
  const files = [];
  const options = {};
  let input;
  let output;
  let string;
  let arg;
  let tokens;
  let opt;

  function getarg() {
    let arg = argv.shift();

    if (arg.indexOf('--') === 0) {
      // e.g. --opt
      arg = arg.split('=');
      if (arg.length > 1) {
        // e.g. --opt=val
        argv.unshift(arg.slice(1).join('='));
      }
      arg = arg[0];
    } else if (arg[0] === '-') {
      if (arg.length > 2) {
        // e.g. -abc
        argv = arg.substring(1).split('').map(function(ch) {
          return '-' + ch;
        }).concat(argv);
        arg = argv.shift();
      } else {
        // e.g. -a
      }
    } else {
      // e.g. foo
    }

    return arg;
  }

  while (argv.length) {
    arg = getarg();
    switch (arg) {
      case '-o':
      case '--output':
        output = argv.shift();
        break;
      case '-i':
      case '--input':
        input = argv.shift();
        break;
      case '-s':
      case '--string':
        string = argv.shift();
        break;
      case '-t':
      case '--tokens':
        tokens = true;
        break;
      case '-h':
      case '--help':
        return await help();
      case '-v':
      case '--version':
        return await version();
      default:
        if (arg.indexOf('--') === 0) {
          opt = camelize(arg.replace(/^--(no-)?/, ''));
          if (!marked.defaults.hasOwnProperty(opt)) {
            continue;
          }
          if (arg.indexOf('--no-') === 0) {
            options[opt] = typeof marked.defaults[opt] !== 'boolean'
              ? null
              : false;
          } else {
            options[opt] = typeof marked.defaults[opt] !== 'boolean'
              ? argv.shift()
              : true;
          }
        } else {
          files.push(arg);
        }
        break;
    }
  }

  async function getData() {
    if (!input) {
      if (files.length <= 2) {
        if (string) {
          return string;
        }
        return await getStdin();
      }
      input = files.pop();
    }
    return await readFile(input, 'utf8');
  }

  const data = await getData();

  const html = tokens
    ? JSON.stringify(marked.lexer(data, options), null, 2)
    : marked(data, options);

  if (output) {
    return await writeFile(output, html);
  }

  process.stdout.write(html + '\n');
}

/**
 * Helpers
 */

function getStdin() {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let buff = '';

    stdin.setEncoding('utf8');

    stdin.on('data', function(data) {
      buff += data;
    });

    stdin.on('error', function(err) {
      reject(err);
    });

    stdin.on('end', function() {
      resolve(buff);
    });

    stdin.resume();
  });
}

/**
 * @param {string} text
 */
function camelize(text) {
  return text.replace(/(\w)-(\w)/g, function(_, a, b) {
    return a + b.toUpperCase();
  });
}

function handleError(err) {
  if (err.code === 'ENOENT') {
    console.error('marked: output to ' + err.path + ': No such directory');
    return process.exit(1);
  }
  throw err;
}

/**
 * Expose / Entry Point
 */

process.title = 'marked';
main(process.argv.slice()).then(code => {
  process.exit(code || 0);
}).catch(err => {
  handleError(err);
});
