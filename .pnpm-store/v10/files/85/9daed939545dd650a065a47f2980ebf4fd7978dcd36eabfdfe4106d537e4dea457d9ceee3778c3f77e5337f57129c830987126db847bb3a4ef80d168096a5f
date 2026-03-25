## object-sizeof

[![Build](https://img.shields.io/npm/v/object-sizeof)](https://img.shields.io/npm/v/object-sizeof) ![GitHub contributors](https://img.shields.io/github/contributors/miktam/sizeof) [![NPM](https://img.shields.io/npm/dy/object-sizeof)](https://img.shields.io/npm/dy/object-sizeof) [![codecov](https://codecov.io/gh/miktam/sizeof/branch/master/graph/badge.svg?token=qPHxmWpC1K)](https://codecov.io/gh/miktam/sizeof)

### Get the size of a JavaScript object in Bytes

Node.js version uses the Buffer.from(objectToString) method to convert the object's string representation to a buffer, and then it uses the byteLength property to obtain the buffer size in bytes.

The module uses a combination of recursion and a stack to iterate through all of its properties, adding up the number of bytes for each data type it encounters.

Please note that this function will only work in some cases, especially when dealing with complex data structures or when the object contains functions.

### Supported Standard built-in and complex types

- Map
- Set
- BigInt
- Function
- Typed Arrays (Int8Array, Uint32Array, Float64Array, etc)

### Error handling

Errors indicated by returned -1 in following cases:

- JSON serialization error, e.g. circular references.
- Unrecognizable TypedArray object.

It prevents potential exceptions or infinite loops, improving reliability.

### Coding standards

The project follows [JavaScript Standard Style](https://standardjs.com/) as a JavaScript style guide.
Code coverage reports are done using Codecov.io.

Code is written with the assumptions that any code added, which is not tested properly, is already or will be buggy.
Hence test coverage, with the BDD style unit tests, stating the intent, and expected behaviour, is a must.

### Get size of a JavaScript object in Bytes - version 1.x

JavaScript does not provide sizeof (like in C), and programmer does not need to care about memory allocation/deallocation.

However, according to [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/), each String value is represented by 16-bit unsigned integer, Number uses the double-precision 64-bit format IEEE 754 values including the special "Not-a-Number" (NaN) values, positive infinity, and negative infinity.

Having this knowledge, the module calculates how much memory object will allocate.

### Installation

`npm install object-sizeof`

### Examples

```javascript
// import sizeof from 'object-sizeof'
const sizeof = require('object-sizeof')
const sizeObj = sizeof({ abc: 'def' })
console.log(`Size of the object: ${sizeObj} bytes`)
const sizeInt = sizeof(12345)
console.log(`Size of the int: ${sizeInt} bytes`)
```

### Licence

The MIT License (MIT)

Copyright (c) 2015, Andrei Karpushonak aka @miktam

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmiktam%2Fsizeof.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmiktam%2Fsizeof?ref=badge_shield)
