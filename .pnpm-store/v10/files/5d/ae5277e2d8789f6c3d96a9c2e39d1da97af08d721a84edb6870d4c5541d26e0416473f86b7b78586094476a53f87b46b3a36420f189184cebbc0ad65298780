'use strict';

// This example shows how to understand if a default value is used or not.

// 1. const { parseArgs } = require('node:util'); // from node
// 2. const { parseArgs } = require('@pkgjs/parseargs'); // from package
const { parseArgs } = require('..'); // in repo

const options = {
  file: { short: 'f', type: 'string', default: 'FOO' },
};

const { values, tokens } = parseArgs({ options, tokens: true });

const isFileDefault = !tokens.some((token) => token.kind === 'option' &&
 token.name === 'file'
);

console.log(values);
console.log(`Is the file option [${values.file}] the default value? ${isFileDefault}`);

// Try the following:
//    node is-default-value.js
//    node is-default-value.js -f FILE
//    node is-default-value.js --file FILE
