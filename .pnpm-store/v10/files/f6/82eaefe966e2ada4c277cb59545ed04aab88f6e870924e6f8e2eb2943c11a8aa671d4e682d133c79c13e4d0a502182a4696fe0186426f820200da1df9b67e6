'use strict';

// This is an example of using tokens to add a custom behaviour.
//
// Throw an error if an option is used more than once.

// 1. const { parseArgs } = require('node:util'); // from node
// 2. const { parseArgs } = require('@pkgjs/parseargs'); // from package
const { parseArgs } = require('..'); // in repo

const options = {
  ding: { type: 'boolean', short: 'd' },
  beep: { type: 'boolean', short: 'b' }
};
const { values, tokens } = parseArgs({ options, tokens: true });

const seenBefore = new Set();
tokens.forEach((token) => {
  if (token.kind !== 'option') return;
  if (seenBefore.has(token.name)) {
    throw new Error(`option '${token.name}' used multiple times`);
  }
  seenBefore.add(token.name);
});

console.log(values);

// Try the following:
//    node no-repeated-options --ding --beep
//    node no-repeated-options --beep -b
//    node no-repeated-options -ddd
