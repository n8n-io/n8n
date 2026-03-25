# No Case

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/blakeembrey/no-case.svg)](https://greenkeeper.io/)

Transform a string to lower space cased. Optional locale and replacement character supported.

Supports Unicode (non-ASCII characters) and non-string entities, such as objects with a `toString` property, numbers and booleans. Empty values (`null` and `undefined`) will result in an empty string.

## Installation

```
npm install no-case --save
```

## Usage

```javascript
var noCase = require('no-case')

noCase(null)              //=> ""
noCase('string')          //=> "string"
noCase('dot.case')        //=> "dot case"
noCase('camelCase')       //=> "camel case"
noCase('Beyoncé Knowles') //=> "beyoncé knowles"

noCase('A STRING', 'tr') //=> "a strıng"

noCase('HELLO WORLD!', null, '_') //=> "hello_world"
```

## Typings

Includes a [TypeScript definition](no-case.d.ts).

## License

MIT

[npm-image]: https://img.shields.io/npm/v/no-case.svg?style=flat
[npm-url]: https://npmjs.org/package/no-case
[downloads-image]: https://img.shields.io/npm/dm/no-case.svg?style=flat
[downloads-url]: https://npmjs.org/package/no-case
[travis-image]: https://img.shields.io/travis/blakeembrey/no-case.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/no-case
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/no-case.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/no-case?branch=master
