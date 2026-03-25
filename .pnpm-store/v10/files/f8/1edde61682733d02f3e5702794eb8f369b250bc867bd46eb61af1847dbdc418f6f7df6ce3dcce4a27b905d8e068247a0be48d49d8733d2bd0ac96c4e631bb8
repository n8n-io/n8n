'use strict';

// This is an example of using tokens to add a custom behaviour.
//
// Require the use of `=` for long options and values by blocking
// the use of space separated values.
// So allow `--foo=bar`, and not allow `--foo bar`.
//
// Note: this is not a common behaviour, most CLIs allow both forms.

// 1. const { parseArgs } = require('node:util'); // from node
// 2. const { parseArgs } = require('@pkgjs/parseargs'); // from package
const { parseArgs } = require('..'); // in repo

const options = {
  file: { short: 'f', type: 'string' },
  log: { type: 'string' },
};

const { values, tokens } = parseArgs({ options, tokens: true });

const badToken = tokens.find((token) => token.kind === 'option' &&
  token.value != null &&
  token.rawName.startsWith('--') &&
  !token.inlineValue
);
if (badToken) {
  throw new Error(`Option value for '${badToken.rawName}' must be inline, like '${badToken.rawName}=VALUE'`);
}

console.log(values);

// Try the following:
//    node limit-long-syntax.js -f FILE --log=LOG
//    node limit-long-syntax.js --file FILE
