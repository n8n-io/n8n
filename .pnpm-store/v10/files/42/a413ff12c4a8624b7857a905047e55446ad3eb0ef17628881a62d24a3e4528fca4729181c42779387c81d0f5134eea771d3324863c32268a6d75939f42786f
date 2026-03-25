# is-expression

Validates a string as a JavaScript expression

[![Build Status](https://img.shields.io/travis/pugjs/is-expression/master.svg)](https://travis-ci.org/pugjs/is-expression)
[![Dependency Status](https://img.shields.io/david/pugjs/is-expression.svg)](https://david-dm.org/pugjs/is-expression)
[![Rolling Versions](https://img.shields.io/badge/Rolling%20Versions-Enabled-brightgreen)](https://rollingversions.com/pugjs/is-expression)
[![npm version](https://img.shields.io/npm/v/is-expression.svg)](https://www.npmjs.org/package/is-expression)

## Installation

    npm install is-expression

## Usage

### `isExpression(src[, options])`

Validates a string as a JavaScript expression.

`src` contains the source.

`options` can contain any Acorn options (since we use Acorn under-the-hood),
or any of the following:

- `throw`: Throw an error if the string is not an expression. The error can
  be an Acorn error, with location information in `err.loc` and `err.pos`.
  Defaults to `false`.
- `strict`: Use strict mode when trying to parse the string. Defaults to
  `false`. Even if this option is `false`, if you have provided
  `options.sourceType === 'module'` which imples strict mode under ES2015,
  strict mode will be used.
- `lineComment`: When `true`, allows line comments in the expression.
  Defaults to `false` for safety.

See the examples below for usage.

## Examples

```js
var isExpression = require('is-expression')

isExpression('myVar')
//=> true
isExpression('var')
//=> false
isExpression('["an", "array", "\'s"].indexOf("index")')
//=> true

isExpression('var', {throw: true})
// SyntaxError: Unexpected token (1:0)
//     at Parser.pp.raise (acorn/dist/acorn.js:940:13)
//     at ...

isExpression('public')
//=> true
isExpression('public', {strict: true})
//=> false

isExpression('abc // my comment')
//=> false
isExpression('abc // my comment', {lineComment: true})
//=> true
```

## License

MIT
