# Param Case

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

Param case a string.

Supports Unicode (non-ASCII characters) and non-string entities, such as objects with a `toString` property, numbers and booleans. Empty values (`null` and `undefined`) will result in an empty string.

## Installation

```
npm install param-case --save
```

## Usage

```javascript
var paramCase = require('param-case')

paramCase('string')        //=> "string"
paramCase('camelCase')     //=> "camel-case"
paramCase('sentence case') //=> "sentence-case"

paramCase('MY STRING', 'tr') //=> "my-strıng"
```

## Typings

Includes a [TypeScript definition](param-case.d.ts).

## License

MIT

[npm-image]: https://img.shields.io/npm/v/param-case.svg?style=flat
[npm-url]: https://npmjs.org/package/param-case
[downloads-image]: https://img.shields.io/npm/dm/param-case.svg?style=flat
[downloads-url]: https://npmjs.org/package/param-case
[travis-image]: https://img.shields.io/travis/blakeembrey/param-case.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/param-case
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/param-case.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/param-case?branch=master
