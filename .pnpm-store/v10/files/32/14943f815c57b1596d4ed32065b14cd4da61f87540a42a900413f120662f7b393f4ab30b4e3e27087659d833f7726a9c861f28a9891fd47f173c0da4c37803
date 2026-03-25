# random-bytes

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

Generate strong pseudo-random bytes.

This module is a simple wrapper around the Node.js core `crypto.randomBytes` API,
with the following additions:

  * A `Promise` interface for environments with promises.
  * For Node.js versions that do not wait for the PRNG to be seeded, this module
    will wait a bit.

## Installation

```sh
$ npm install random-bytes
```

## API

```js
var randomBytes = require('random-bytes')
```

### randomBytes(size, callback)

Generates strong pseudo-random bytes. The `size` argument is a number indicating
the number of bytes to generate.

```js
randomBytes(12, function (error, bytes) {
  if (error) throw error
  // do something with the bytes
})
```

### randomBytes(size)

Generates strong pseudo-random bytes and return a `Promise`. The `size` argument is
a number indicating the number of bytes to generate.

**Note**: To use promises in Node.js _prior to 0.12_, promises must be
"polyfilled" using `global.Promise = require('bluebird')`.

```js
randomBytes(18).then(function (string) {
  // do something with the string
})
```

### randomBytes.sync(size)

A synchronous version of above.

```js
var bytes = randomBytes.sync(18)
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/random-bytes.svg
[npm-url]: https://npmjs.org/package/random-bytes
[node-version-image]: https://img.shields.io/node/v/random-bytes.svg
[node-version-url]: http://nodejs.org/download/
[travis-image]: https://img.shields.io/travis/crypto-utils/random-bytes/master.svg
[travis-url]: https://travis-ci.org/crypto-utils/random-bytes
[coveralls-image]: https://img.shields.io/coveralls/crypto-utils/random-bytes/master.svg
[coveralls-url]: https://coveralls.io/r/crypto-utils/random-bytes?branch=master
[downloads-image]: https://img.shields.io/npm/dm/random-bytes.svg
[downloads-url]: https://npmjs.org/package/random-bytes
