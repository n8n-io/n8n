'use strict';

// This example is used in the documentation.

// 1. const { parseArgs } = require('node:util'); // from node
// 2. const { parseArgs } = require('@pkgjs/parseargs'); // from package
const { parseArgs } = require('..'); // in repo

const args = ['-f', '--bar', 'b'];
const options = {
  foo: {
    type: 'boolean',
    short: 'f'
  },
  bar: {
    type: 'string'
  }
};
const {
  values,
  positionals
} = parseArgs({ args, options });
console.log(values, positionals);

// Try the following:
//    node simple-hard-coded.js
