duplexpair
==============

[![NPM Version](https://img.shields.io/npm/v/duplexpair.svg?style=flat)](https://npmjs.org/package/duplexpair)
[![NPM Downloads](https://img.shields.io/npm/dm/duplexpair.svg?style=flat)](https://npmjs.org/package/duplexpair)
[![Build Status](https://travis-ci.org/addaleax/duplexpair.svg?style=flat&branch=master)](https://travis-ci.org/addaleax/duplexpair?branch=master)
[![Coverage Status](https://coveralls.io/repos/addaleax/duplexpair/badge.svg?branch=master)](https://coveralls.io/r/addaleax/duplexpair?branch=master)
[![Dependency Status](https://david-dm.org/addaleax/duplexpair.svg?style=flat)](https://david-dm.org/addaleax/duplexpair)

Make a full duplex stream with 2 Duplex endpoints.

**Note:**

This is a fork of `duplexpair`, changed to use the "native" `Duplex` stream that is part
of Node.JS instead of the version from the `readable-stream` package.

Install:
`npm install native-duplexpair`

```js
const DuplexPair = require('native-duplexpair');

const { socket1, socket2 } = new DuplexPair();

socket1.write('Hi');
console.log(socket2.read());  // => <Buffer 48 69>

// Or, using options that are passed to the Duplex constructor:

const { socket1, socket2 } = new DuplexPair({ encoding: 'utf8' });

socket1.write('Hi');
console.log(socket2.read());  // => 'Hi'
```

License
=======

MIT
