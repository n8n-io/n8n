# SnappyJS [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) ![Node.js CI](https://github.com/zhipeng-jia/snappyjs/actions/workflows/test.yml/badge.svg)
A pure JavaScript implementation of Google's [Snappy](https://github.com/google/snappy) compression library.

This implementation is reasonably fast (see benchmark below). It takes advantage of `ArrayBuffer`.

## Install

If using with Node.js,
~~~
npm install snappyjs
~~~

If using with Bower,
~~~
bower install snappyjs
~~~

## Usage

### Node.js

SnappyJS works with Node.js 10.x or later.
~~~javascript
var SnappyJS = require('snappyjs')
var buffer = new ArrayBuffer(100)
// fill data in buffer
var compressed = SnappyJS.compress(buffer)
var uncompressed = SnappyJS.uncompress(compressed)
~~~

### Browser

You can also use SnappyJS in browser. Adding `dist/snappyjs.js` or `dist/snappyjs.min.js` will introduce `SnappyJS` in the global scope.

SnappyJS relies on `ArrayBuffer`. All major browsers support it now ([http://caniuse.com/#feat=typedarrays](http://caniuse.com/#feat=typedarrays)). Also, as I tested, SnappyJS has high performance on latest version of Google Chrome, Safari, Firefox, and Microsoft Edge.

**When using webpack to build your project**, and you plan to only use `ArrayBuffer` or `Uint8Array` as input parameters, make sure to put the following in your webpack config to prevent it from automatically bundling a `Buffer` polyfill:

```js
  node: {
    Buffer: false,
  }
```

## API

### SnappyJS.compress(input)

Compress `input`, which must be type of `ArrayBuffer`, `Buffer`, or `Uint8Array`.
Compressed byte stream is returned, with same type of `input`.

### SnappyJS.uncompress(compressed, [maxLength])

Uncompress `compressed`, which must be type of `ArrayBuffer`, `Buffer`, or `Uint8Array`.
Uncompressed byte stream is returned, with same type of `compressed`.

If `maxLength` is provided, uncompress function will throw an exception if the data length
encoded in the header exceeds `maxLength`. This is a protection mechanism for malicious data stream.

## Benchmark

Although JavaScript is dynamic-typing, all major JS engines are highly optimized.
Thus well-crafted JavaScript code can have competitive performance even compared to native C++ code.

I benchmark SnappyJS against `node-snappy` (which is Node.js binding of native implementation).

Command for benchmark is `node benchmark`. Below is the result running on Node.js v5.5.0.

~~~
Real text #1 (length 618425, byte length 618425), repeated 100 times:
node-snappy#compress x 2.31 ops/sec ±1.47% (10 runs sampled)
snappyjs#compress x 0.91 ops/sec ±0.92% (7 runs sampled)
node-snappy#uncompress x 7.22 ops/sec ±4.07% (22 runs sampled)
snappyjs#uncompress x 2.45 ops/sec ±1.53% (11 runs sampled)

Real text #2 (length 3844590, byte length 3844591), repeated 10 times:
node-snappy#compress x 7.68 ops/sec ±2.78% (23 runs sampled)
snappyjs#compress x 3.56 ops/sec ±1.44% (13 runs sampled)
node-snappy#uncompress x 17.94 ops/sec ±4.71% (33 runs sampled)
snappyjs#uncompress x 7.24 ops/sec ±2.57% (22 runs sampled)

Random string (length 1000000, byte length 1500098), repeated 50 times:
node-snappy#compress x 6.69 ops/sec ±5.23% (21 runs sampled)
snappyjs#compress x 2.39 ops/sec ±2.54% (10 runs sampled)
node-snappy#uncompress x 14.94 ops/sec ±6.90% (40 runs sampled)
snappyjs#uncompress x 5.92 ops/sec ±4.28% (19 runs sampled)

Random string (length 100, byte length 147), repeated 100000 times:
node-snappy#compress x 4.17 ops/sec ±2.96% (15 runs sampled)
snappyjs#compress x 5.45 ops/sec ±1.51% (18 runs sampled)
node-snappy#uncompress x 4.39 ops/sec ±3.83% (15 runs sampled)
snappyjs#uncompress x 14.01 ops/sec ±2.06% (38 runs sampled)
~~~

From the result, we see that SnappyJS has 35%~45% performance of native implementation.
If input size is small, SnappyJS may have better performance than `node-snappy`.
It is because calling native function in JS is much more expensive than calling JS function.

## License

MIT License
