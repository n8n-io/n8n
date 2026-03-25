# hash-base

[![NPM Package](https://img.shields.io/npm/v/hash-base.svg?style=flat-square)](https://www.npmjs.org/package/hash-base)
[![Build Status](https://img.shields.io/travis/crypto-browserify/hash-base.svg?branch=master&style=flat-square)](https://travis-ci.org/crypto-browserify/hash-base)
[![Dependency status](https://img.shields.io/david/crypto-browserify/hash-base.svg?style=flat-square)](https://david-dm.org/crypto-browserify/hash-base#info=dependencies)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Abstract base class to inherit from if you want to create streams implementing the same API as node crypto [Hash][1] (for [Cipher][2] / [Decipher][3] check [crypto-browserify/cipher-base][4]).

## Example

```js
function MyHash () {
  HashBase.call(64) // in bytes
}

inherti(MyHash, HashBase)

MyHash.prototype._update = function () {
  // hashing one block with buffer this._block
}

MyHash.prototype._digest = function () {
  // create padding and produce result
}
```
You also can check [source code](index.js) or [crypto-browserify/md5.js][5]

## LICENSE

MIT

[1]: https://nodejs.org/api/crypto.html#crypto_class_hash
[2]: https://nodejs.org/api/crypto.html#crypto_class_cipher
[3]: https://nodejs.org/api/crypto.html#crypto_class_decipher
[4]: https://github.com/crypto-browserify/cipher-base
[5]: https://github.com/crypto-browserify/md5.js
