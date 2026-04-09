# xxhash-wasm

[![Node.js][actions-nodejs-badge]][actions-nodejs-link]
[![npm][npm-badge]][npm-link]

A WebAssembly implementation of [xxHash][xxhash], a fast non-cryptographic hash
algorithm. It can be called seamlessly from JavaScript. You can use it like any
other JavaScript library but still get the benefits of WebAssembly, no special
setup needed.

## Table of Contents

<!-- vim-markdown-toc GFM -->

* [Installation](#installation)
  * [From npm](#from-npm)
  * [From Unpkg](#from-unpkg)
    * [ES Modules](#es-modules)
    * [UMD build](#umd-build)
  * [Cloudflare Workers](#cloudflare-workers)
* [Usage](#usage)
  * [Streaming Example](#streaming-example)
  * [Node](#node)
* [Performance](#performance)
  * [Engine Requirements](#engine-requirements)
* [API](#api)
  * [h32](#h32)
  * [h64](#h64)
  * [Streaming](#streaming)
* [Comparison to xxhashjs](#comparison-to-xxhashjs)
  * [Benchmarks](#benchmarks)
  * [Bundle size](#bundle-size)

<!-- vim-markdown-toc -->

## Installation

### From npm

```sh
npm install --save xxhash-wasm
```

Or with Yarn:

```sh
yarn add xxhash-wasm
```

### From [Unpkg][unpkg]

#### ES Modules

```html
<script type="module">
  import xxhash from "https://unpkg.com/xxhash-wasm/esm/xxhash-wasm.js";
</script>
```

#### UMD build

```html
<script src="https://unpkg.com/xxhash-wasm/umd/xxhash-wasm.js"></script>
```

The global `xxhash` will be available.

### Cloudflare Workers

If you are using [Cloudflare Workers](https://developers.cloudflare.com/workers/) (workerd) you can use the installed
npm package as is. The `xxhash-wasm` package is compatible with Cloudflare Workers.

```javascript
import xxhash from "xxhash-wasm";
```

Importing it will pick the correct file base on the [conditional
import](https://developers.cloudflare.com/workers/wrangler/bundling/#conditional-exports)
from the package.json.

## Usage

The WebAssembly is contained in the JavaScript bundle, so you don't need to
manually fetch it and create a new WebAssembly instance.

```javascript
import xxhash from "xxhash-wasm";

// Creates the WebAssembly instance.
xxhash().then(hasher => {
  const input = "The string that is being hashed";

  // 32-bit version
  hasher.h32(input); // 3998627172 (decimal representation)
  // For convenience, get hash as string of its zero-padded hex representation
  hasher.h32ToString(input); // "ee563564"

  // 64-bit version
  hasher.h64(input); // 5776724552493396044n (BigInt)
  // For convenience, get hash as string of its zero-padded hex representation
  hasher.h64ToString(input); // "502b0c5fc4a5704c"
});
```

Or with `async`/`await` and destructuring:

```javascript
// Creates the WebAssembly instance.
const { h32, h64 } = await xxhash();

const input = "The string that is being hashed";
// 32-bit version
h32(input); // 3998627172 (decimal representation)
// 64-bit version
h64(input); // 5776724552493396044n (BigInt)
```

### Streaming Example

`xxhash-wasm` supports a `crypto`-like streaming api, useful for avoiding memory
consumption when hashing large amounts of data:

```javascript
const { create32, create64 } = await xxhash();

// 32-bit version
create32()
  .update("some data")
  // update accepts either a string or Uint8Array
  .update(Uint8Array.from([1, 2, 3]))
  .digest(); // 955607085

// 64-bit version
create64()
  .update("some data")
  // update accepts either a string or Uint8Array
  .update(Uint8Array.from([1, 2, 3]))
  .digest(); // 883044157688673477n
```

### Node

It doesn't matter whether you are using CommonJS or ES Modules in Node
(e.g. with `"type": "module"` in `package.json` or using the explicit file
extensions `.cjs` or `.mjs` respectively), importing `xxhash-wasm` will always
load the corresponding module, as both bundles are provided and specified in
the `exports` field of its `package.json`, therefore the appropriate one will
automatically be selected.

**Using ES Modules**

```javascript
import xxhash from "xxhash-wasm";
```

**Using CommonJS**

```javascript
const xxhash = require("xxhash-wasm");
```

## Performance

For performance sensitive applications, `xxhash-wasm` provides the `h**` and
`h**Raw` APIs, which return raw numeric hash results rather than zero-padded hex
strings. The overhead of the string conversion in the `h**ToString` APIs can be
as much as 20% of overall runtime when hashing small byte-size inputs, and the
string result is often inconsequential (for example when simply checking if the
the resulting hashes are the same). When necessary, getting a zero-padded hex
string from the provided `number` or [`BigInt`][bigint-mdn] results is easily
achieved via `result.toString(16).padStart(16, "0")` and the `h**ToString` APIs
are purely for convenience.

The `h**`, `h**ToString`, and streaming APIs make use of
[`TextEncoder.encodeInto`][textencoder-encodeinto-mdn] to directly encode
strings as a stream of UTF-8 bytes into the WebAssembly memory buffer, meaning
that for string-hashing purposes, these APIs will be significantly faster than
converting the string to bytes externally and using the `Raw` API. That said,
for large strings it may be beneficial to consider the streaming API or another
approach to encoding, as `encodeInto` is forced to allocate 3-times the string
length to account for the chance the input string contains high-byte-count
code units.

*If possible, defer the encoding of the string to the hashing, unless you need
to use the encoded string (bytes) for other purposes as well, or you are
creating the bytes differently (e.g. different encoding), in which case it's
much more efficient to use the `h**Raw` APIs instead of having to unnecessarily
convert them to a string first.*

### Engine Requirements

In an effort to make this library as performant as possible, it uses several
recent additions to browsers, Node and the WebAssembly specification.
Notably, these include:

1. [`BigInt`][bigint-mdn] support in WebAssembly
2. Bulk memory operations in WebAssembly
3. [`TextEncoder.encodeInto`][textencoder-encodeinto-mdn]

Taking all of these requirements into account, `xxhash-wasm` should be
compatible with:

* Chrome >= 85
* Edge >= 79
* Firefox >= 79
* Safari >= 15.0
* Node >= 15.0

If support for an older engine is required, `xxhash-wasm@0.4.2` is available
with much broader engine support, but 3-4x slower hashing performance.

## API

```js
const {
  h32,
  h32ToString,
  h32Raw,
  create32,
  h64,
  h64ToString,
  h64Raw,
  create64,
} = await xxhash();
```

Create a WebAssembly instance.

### h32

```typescript
h32(input: string, [seed: u32]): number
```

Generate a 32-bit hash of the UTF-8 encoded bytes of `input`. The optional
`seed` is a `u32` and any number greater than the maximum (`0xffffffff`) is
wrapped, which means that `0xffffffff + 1 = 0`.

Returns a `u32` `number` containing the hash value.

```typescript
h32ToString(input: string, [seed: u32]): string
```

Same as `h32`, but returning a zero-padded hex string.

```typescript
h32Raw(input: Uint8Array, [seed: u32]): number
```

Same as `h32` but with a `Uint8Array` as input instead of a `string`.

### h64

```typescript
h64(input: string, [seed: bigint]): bigint
```

Generate a 64-bit hash of the UTF-8 encoded bytes of `input`. The optional
`seed` is a `u64` provided as a [BigInt][bigint-mdn].

Returns a `u64` `bigint` containing the hash value.

```typescript
h64ToString(input: string, [seed: bigint]): string
```

Same as `h64`, but returning a zero-padded hex string.

```typescript
h64Raw(input: Uint8Array, [seed: bigint]): bigint
```

Same as `h64` but with a `Uint8Array` as input instead of a `string`.

### Streaming

```typescript
type XXHash<T> {
  update(input: string | Uint8Array): XXHash<T>;
  digest(): T
}
```

The streaming API mirrors Node's built-in `crypto.createHash`, providing
`update` and `digest` methods to add data to the hash and compute the final hash
value, respectively.

```typescript
create32([seed: number]): XXHash<number>
```

Create a 32-bit hash for streaming applications.

```typescript
create64([seed: bigint]): XXHash<bigint>
```

Create a 64-bit hash for streaming applications.

## Comparison to [xxhashjs][xxhashjs]

[`xxhashjs`][xxhashjs] is implemented in pure JavaScript and because JavaScript
is lacking support for 64-bit integers, it uses a workaround with
[`cuint`][cuint]. Not only is that a big performance hit, but it also increases
the bundle size by quite a bit when it's used in the browser.

This library (`xxhash-wasm`) has the big advantage that WebAssembly supports
`u64` and also some instructions (e.g. `rotl`), which would otherwise have
to be emulated. However, The downside is that you have to initialise
a WebAssembly instance, which takes a little over 2ms in Node and about 1ms in
the browser. But once the instance is created, it can be used without any
further overhead. For the benchmarks below, the instantiation is done before the
benchmark and therefore it's excluded from the results, since it wouldn't make
sense to always create a new WebAssembly instance.

### Benchmarks

Benchmarks are using [Benchmark.js][benchmarkjs] with random strings of
different lengths. *Higher is better*

| String length             | xxhashjs 32-bit    | xxhashjs 64-bit    | xxhash-wasm 32-bit      | xxhash-wasm 64-bit      |
| ------------------------: | ------------------ | ------------------ | ----------------------- | ----------------------- |
| 1 byte                    | 513,517 ops/sec    | 11,896 ops/sec     | ***5,752,446 ops/sec*** | 4,438,501 ops/sec       |
| 10 bytes                  | 552,133 ops/sec    | 12,953 ops/sec     | ***6,240,640 ops/sec*** | 4,855,340 ops/sec       |
| 100 bytes                 | 425,277 ops/sec    | 10,838 ops/sec     | ***5,470,011 ops/sec*** | 4,314,904 ops/sec       |
| 1,000 bytes               | 102,165 ops/sec    | 6,697 ops/sec      | 3,283,526 ops/sec       | ***3,332,556 ops/sec*** |
| 10,000 bytes              | 13,010 ops/sec     | 1,452 ops/sec      | 589,068 ops/sec         | ***940,350 ops/sec***   |
| 100,000 bytes             | 477 ops/sec        | 146 ops/sec        | 61,824 ops/sec          | ***98,959 ops/sec***    |
| 1,000,000 bytes           | 36.40 ops/sec      | 12.93 ops/sec      | 5,122 ops/sec           | ***8,632 ops/sec***     |
| 10,000,000 bytes          | 3.12 ops/sec       | 1.19 ops/sec       | 326 ops/sec             | ***444 ops/sec***       |
| 100,000,000 bytes         | 0.31 ops/sec       | 0.13 ops/sec       | 27.84 ops/sec           | ***34.56 ops/sec***     |

`xxhash-wasm` outperforms `xxhashjs` significantly, the 32-bit is up to 90 times
faster (generally increases as the size of the input grows), and the 64-bit is
up to 350 times faster (generally increases as the size of the input grows).

The 64-bit version is the faster algorithm but there is a small degree of
overhead involved in using BigInts, and so it retains a performance advantage
over all lengths over xxhashjs and the 32-bit algorithm above ~1000 bytes.

`xxhash-wasm` also significantly outperforms Node's built-in hash algorithms,
making it suitable for use in a wide variety of situations, where
non-cryptographic hashes are acceptable. Benchmarks from an x64 MacBook Pro
running Node 17.3:

| String length             | Node `crypto` md5  | Node `crypto` sha1 |  xxhash-wasm 64-bit     |
| ------------------------: | ------------------ | ------------------ | ----------------------- |
| 1 byte                    | 342,924 ops/sec    | 352,825 ops/sec    | ***4,438,501 ops/sec*** |
| 10 bytes                  | 356,596 ops/sec    | 352,209 ops/sec    | ***4,855,340 ops/sec*** |
| 100 bytes                 | 354,898 ops/sec    | 355,024 ops/sec    | ***4,314,904 ops/sec*** |
| 1,000 bytes               | 249,242 ops/sec    | 271,383 ops/sec    | ***3,332,556 ops/sec*** |
| 10,000 bytes              | 62,896 ops/sec     | 80,986 ops/sec     | ***940,350 ops/sec***   |
| 100,000 bytes             | 7,316 ops/sec      | 10,198 ops/sec     | ***98,959 ops/sec***    |
| 1,000,000 bytes           | 698 ops/sec        | 966 ops/sec        | ***8,632 ops/sec***     |
| 10,000,000 bytes          | 58.98 ops/sec      | 79.78 ops/sec      | ***444 ops/sec***       |
| 100,000,000 bytes         | 6.30 ops/sec       | 8.20 ops/sec       | ***34.56 ops/sec***     |

If suitable for your use case, the `Raw` API offers significant throughput
improvements over the string-hashing API, particularly for smaller inputs,
assuming that you have access to the `Uint8Array` already (see also the
[Performance section](#performance)):

| String length             | xxhash-wasm 64-bit Raw  |  xxhash-wasm 64-bit |
| ------------------------: | ----------------------- | ------------------- |
| 1 byte                    | ***9,342,811 ops/sec*** | 4,438,501 ops/sec   |
| 10 bytes                  | ***9,668,989 ops/sec*** | 4,855,340 ops/sec   |
| 100 bytes                 | ***8,775,845 ops/sec*** | 4,314,904 ops/sec   |
| 1,000 bytes               | ***5,541,403 ops/sec*** | 3,332,556 ops/sec   |
| 10,000 bytes              | ***1,079,866 ops/sec*** | 940,350 ops/sec     |
| 100,000 bytes             | ***113,350 ops/sec***   | 98,959 ops/sec      |
| 1,000,000 bytes           | ***9,779 ops/sec***     | 8,632 ops/sec       |
| 10,000,000 bytes          | ***563 ops/sec***       | 444 ops/sec         |
| 100,000,000 bytes         | ***43.77 ops/sec***     | 34.56 ops/sec       |

### Bundle size

Both libraries can be used in the browser and they provide a UMD bundle. The
bundles are self-contained, that means they can be included and used without
having to add any other dependencies. The table shows the bundle size of the
minified versions. *Lower is better*.

|                | xxhashjs   | xxhash-wasm   |
| -------------- | ---------- | ------------- |
| Bundle size    | 41.5kB     | ***11.4kB***  |
| Gzipped Size   | 10.3kB     | ***2.3kB***   |

[actions-nodejs-badge]: https://github.com/jungomi/xxhash-wasm/actions/workflows/nodejs.yml/badge.svg
[actions-nodejs-link]: https://github.com/jungomi/xxhash-wasm/actions/workflows/nodejs.yml
[benchmarkjs]: https://benchmarkjs.com/
[bigint-mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
[cuint]: https://github.com/pierrec/js-cuint
[npm-badge]: https://img.shields.io/npm/v/xxhash-wasm.svg?style=flat-square
[npm-link]: https://www.npmjs.com/package/xxhash-wasm
[release-notes-v1.0.0]: https://github.com/jungomi/xxhash-wasm/releases/tag/v1.0.0
[textencoder-encodeinto-mdn]: https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto
[travis]: https://travis-ci.org/jungomi/xxhash-wasm
[travis-badge]: https://img.shields.io/travis/jungomi/xxhash-wasm/master.svg?style=flat-square
[unpkg]: https://unpkg.com/
[xxhash]: https://github.com/Cyan4973/xxHash
[xxhashjs]: https://github.com/pierrec/js-xxhash
