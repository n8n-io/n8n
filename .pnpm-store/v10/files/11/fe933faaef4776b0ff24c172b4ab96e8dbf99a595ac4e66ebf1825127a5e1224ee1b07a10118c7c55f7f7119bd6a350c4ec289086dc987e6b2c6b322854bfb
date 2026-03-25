
# thenify

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

Promisify a callback-based function using [`any-promise`](https://github.com/kevinbeaty/any-promise).

- Preserves function names
- Uses a native promise implementation if available and tries to fall back to a promise implementation such as `bluebird`
- Converts multiple arguments from the callback into an `Array`, also support change the behavior by `options.multiArgs`
- Resulting function never deoptimizes
- Supports both callback and promise style

An added benefit is that `throw`n errors in that async function will be caught by the promise!

## API

### fn = thenify(fn, options)

Promisifies a function.

### Options

`options` are optional.

- `options.withCallback` - support both callback and promise style, default to `false`.
- `options.multiArgs` - change the behavior when callback have multiple arguments. default to `true`.
  - `true` - converts multiple arguments to an array
  - `false`- always use the first argument
  - `Array` - converts multiple arguments to an object with keys provided in `options.multiArgs`

- Turn async functions into promises

```js
var thenify = require('thenify');

var somethingAsync = thenify(function somethingAsync(a, b, c, callback) {
  callback(null, a, b, c);
});
```

- Backward compatible with callback

```js
var thenify = require('thenify');

var somethingAsync = thenify(function somethingAsync(a, b, c, callback) {
  callback(null, a, b, c);
}, { withCallback: true });

// somethingAsync(a, b, c).then(onFulfilled).catch(onRejected);
// somethingAsync(a, b, c, function () {});
```

or use `thenify.withCallback()`

```js
var thenify = require('thenify').withCallback;

var somethingAsync = thenify(function somethingAsync(a, b, c, callback) {
  callback(null, a, b, c);
});

// somethingAsync(a, b, c).then(onFulfilled).catch(onRejected);
// somethingAsync(a, b, c, function () {});
```

- Always return the first argument in callback

```js
var thenify = require('thenify');

var promise = thenify(function (callback) {
  callback(null, 1, 2, 3);
}, { multiArgs: false });

// promise().then(function onFulfilled(value) {
//   assert.equal(value, 1);
// });
```

- Converts callback arguments to an object

```js
var thenify = require('thenify');

var promise = thenify(function (callback) {
  callback(null, 1, 2, 3);
}, { multiArgs: [ 'one', 'tow', 'three' ] });

// promise().then(function onFulfilled(value) {
//   assert.deepEqual(value, {
//     one: 1,
//     tow: 2,
//     three: 3
//   });
// });
```

[gitter-image]: https://badges.gitter.im/thenables/thenify.png
[gitter-url]: https://gitter.im/thenables/thenify
[npm-image]: https://img.shields.io/npm/v/thenify.svg?style=flat-square
[npm-url]: https://npmjs.org/package/thenify
[github-tag]: http://img.shields.io/github/tag/thenables/thenify.svg?style=flat-square
[github-url]: https://github.com/thenables/thenify/tags
[travis-image]: https://img.shields.io/travis/thenables/thenify.svg?style=flat-square
[travis-url]: https://travis-ci.org/thenables/thenify
[coveralls-image]: https://img.shields.io/coveralls/thenables/thenify.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/thenables/thenify
[david-image]: http://img.shields.io/david/thenables/thenify.svg?style=flat-square
[david-url]: https://david-dm.org/thenables/thenify
[license-image]: http://img.shields.io/npm/l/thenify.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/thenify.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/thenify
