# Upper Case

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

Upper case a string.

Supports Unicode (non-ASCII characters) and non-string entities, such as objects with a `toString` property, numbers and booleans. Empty values (`null` and `undefined`) will result in an empty string.

## Installation

```
npm install upper-case --save
```

## Usage

```js
var upperCase = require('upper-case')

upperCase(null)           //=> ""
upperCase('string')       //=> "STRING"
upperCase('string', 'tr') //=> "STRİNG"

upperCase({ toString: function () { return 'test' } }) //=> "TEST"
```

## Typings

Includes a [TypeScript definition](upper-case.d.ts).

## License

MIT

[npm-image]: https://img.shields.io/npm/v/upper-case.svg?style=flat
[npm-url]: https://npmjs.org/package/upper-case
[downloads-image]: https://img.shields.io/npm/dm/upper-case.svg?style=flat
[downloads-url]: https://npmjs.org/package/upper-case
[travis-image]: https://img.shields.io/travis/blakeembrey/upper-case.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/upper-case
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/upper-case.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/upper-case?branch=master
