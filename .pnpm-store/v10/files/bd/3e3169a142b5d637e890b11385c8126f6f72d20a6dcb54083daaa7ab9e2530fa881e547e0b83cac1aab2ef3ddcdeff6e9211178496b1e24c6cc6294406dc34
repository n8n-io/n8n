// This is an example of using tokens to add a custom behaviour.
//
// This adds a option order check so that --some-unstable-option
// may only be used after --enable-experimental-options
//
// Note: this is not a common behaviour, the order of different options
// does not usually matter.

import { parseArgs } from '../index.js';

function findTokenIndex(tokens, target) {
  return tokens.findIndex((token) => token.kind === 'option' &&
    token.name === target
  );
}

const experimentalName = 'enable-experimental-options';
const unstableName = 'some-unstable-option';

const options = {
  [experimentalName]: { type: 'boolean' },
  [unstableName]: { type: 'boolean' },
};

const { values, tokens } = parseArgs({ options, tokens: true });

const experimentalIndex = findTokenIndex(tokens, experimentalName);
const unstableIndex = findTokenIndex(tokens, unstableName);
if (unstableIndex !== -1 &&
  ((experimentalIndex === -1) || (unstableIndex < experimentalIndex))) {
  throw new Error(`'--${experimentalName}' must be specified before '--${unstableName}'`);
}

console.log(values);

/* eslint-disable max-len */
// Try the following:
//    node ordered-options.mjs
//    node ordered-options.mjs --some-unstable-option
//    node ordered-options.mjs --some-unstable-option --enable-experimental-options
//    node ordered-options.mjs --enable-experimental-options --some-unstable-option
