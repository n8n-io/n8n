# minizlib

A fast zlib stream built on [minipass](http://npm.im/minipass) and
Node.js's zlib binding.

This module was created to serve the needs of
[node-tar](http://npm.im/tar) and
[minipass-fetch](http://npm.im/minipass-fetch).

Brotli is supported in versions of node with a Brotli binding.

## How does this differ from the streams in `require('zlib')`?

First, there are no convenience methods to compress or decompress a
buffer.  If you want those, use the built-in `zlib` module.  This is
only streams.  That being said, Minipass streams to make it fairly easy to
use as one-liners: `new zlib.Deflate().end(data).read()` will return the
deflate compressed result.

This module compresses and decompresses the data as fast as you feed
it in.  It is synchronous, and runs on the main process thread.  Zlib
and Brotli operations can be high CPU, but they're very fast, and doing it
this way means much less bookkeeping and artificial deferral.

Node's built in zlib streams are built on top of `stream.Transform`.
They do the maximally safe thing with respect to consistent
asynchrony, buffering, and backpressure.

See [Minipass](http://npm.im/minipass) for more on the differences between
Node.js core streams and Minipass streams, and the convenience methods
provided by that class.

## Classes

- Deflate
- Inflate
- Gzip
- Gunzip
- DeflateRaw
- InflateRaw
- Unzip
- BrotliCompress (Node v10 and higher)
- BrotliDecompress (Node v10 and higher)

## USAGE

```js
const zlib = require('minizlib')
const input = sourceOfCompressedData()
const decode = new zlib.BrotliDecompress()
const output = whereToWriteTheDecodedData()
input.pipe(decode).pipe(output)
```

## REPRODUCIBLE BUILDS

To create reproducible gzip compressed files across different operating
systems, set `portable: true` in the options.  This causes minizlib to set
the `OS` indicator in byte 9 of the extended gzip header to `0xFF` for
'unknown'.
