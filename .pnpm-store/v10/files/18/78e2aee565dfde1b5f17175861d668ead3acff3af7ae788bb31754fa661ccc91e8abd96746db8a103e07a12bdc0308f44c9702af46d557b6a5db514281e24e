# Standard asCallback
A performant and standard (Bluebird) library that registers a node-style callback on a promise.

[![Build Status](https://travis-ci.org/luin/asCallback.svg?branch=master)](https://travis-ci.org/luin/asCallback)

## Install

```
$ npm install standard-as-callback
```

## Usage

```javascript
const asCallback = require('standard-as-callback')

const promise = new Promise(function (resolve) {
  setTimeout(function () {
    resolve('hello world!')
  }, 1000)
})

asCallback(promise, function callback (err, res) {
  console.log(err, res) // null, 'hello world!'
})
```

## Thanks

Most code of this library are ported from the awesome Bluebird library.

## License
The MIT License.
