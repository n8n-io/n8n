# Standard asCallback
A performant and standard (Bluebird) library that registers a node-style callback on a promise. It's used by [ioredis](https://github.com/luin/ioredis).

[![Build Status](https://github.com/ioredis/as-callback/workflows/Test/badge.svg)](https://github.com/ioredis/as-callback/actions?query=workflow%3ATest+branch%3Amaster) [![npm latest version](https://img.shields.io/npm/v/@ioredis/as-callback/latest.svg)](https://www.npmjs.com/package/@ioredis/as-callback)


## Install

```
$ npm install @ioredis/as-callback
```

## Usage

```javascript
const asCallback = require('@ioredis/as-callback').defaults;

const promise = new Promise(function (resolve) {
  setTimeout(function () {
    resolve('hello world!')
  }, 1000)
})

asCallback(promise, function callback (err, res) {
  console.log(err, res) // null, 'hello world!'
})
```

## Motivation
There are many libraries serve similar functionality. However, none of them I'd found are exactly the same as Bluebird's `asCallback` function (in terms of either performance or functionality). Thus this library comes out.

## Thanks

Most code of this library are ported from the awesome Bluebird library.

## License
The MIT License.
