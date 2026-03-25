
Description
===========

A simple [node.js](https://nodejs.org) binding to [cpu_features](https://github.com/google/cpu_features) for obtaining information about installed CPU(s).


Requirements
============

* [node.js](http://nodejs.org/) -- v10.0.0 or newer
* An appropriate build environment -- see [node-gyp's documentation](https://github.com/nodejs/node-gyp/blob/master/README.md)


Install
=======

    npm install cpu-features


Example
=======

```js
  // Generally it's a good idea to just call this once and
  // reuse the result since `cpu-features` does not cache
  // the result itself.
  const features = require('cpu-features')();

  console.log(features);
  // example output:
  // { arch: 'x86',
  //   brand: 'Intel(R) Core(TM) i7-3770K CPU @ 3.50GHz',
  //   family: 6,
  //   model: 58,
  //   stepping: 9,
  //   uarch: 'INTEL_IVB',
  //   flags:
  //    { fpu: true,
  //      tsc: true,
  //      cx8: true,
  //      clfsh: true,
  //      mmx: true,
  //      aes: true,
  //      erms: true,
  //      f16c: true,
  //      sse: true,
  //      sse2: true,
  //      sse3: true,
  //      ssse3: true,
  //      sse4_1: true,
  //      sse4_2: true,
  //      avx: true,
  //      pclmulqdq: true,
  //      cx16: true,
  //      popcnt: true,
  //      rdrnd: true,
  //      ss: true } }
```
