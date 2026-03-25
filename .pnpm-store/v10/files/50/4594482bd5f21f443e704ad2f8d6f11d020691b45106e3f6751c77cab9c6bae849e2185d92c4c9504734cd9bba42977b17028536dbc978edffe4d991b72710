# compression

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][github-actions-ci-image]][github-actions-ci-url]
[![OpenSSF Scorecard Badge][ossf-scorecard-badge]][ossf-scorecard-visualizer]
[![Funding][funding-image]][funding-url]


Node.js compression middleware.

The following compression codings are supported:

  - deflate
  - gzip
  - br (brotli)

**Note** Brotli is supported only since Node.js versions v11.7.0 and v10.16.0.

## Install

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install compression
```

## API

```js
var compression = require('compression')
```

### compression([options])

Returns the compression middleware using the given `options`. The middleware
will attempt to compress response bodies for all requests that traverse through
the middleware, based on the given `options`.

This middleware will never compress responses that include a `Cache-Control`
header with the [`no-transform` directive](https://tools.ietf.org/html/rfc7234#section-5.2.2.4),
as compressing will transform the body.

#### Options

`compression()` accepts these properties in the options object. In addition to
those listed below, [zlib](https://nodejs.org/api/zlib.html) options may be
passed in to the options object or
[brotli](https://nodejs.org/api/zlib.html#zlib_class_brotlioptions) options.

##### chunkSize

Type: `Number`<br>
Default: `zlib.constants.Z_DEFAULT_CHUNK`, or `16384`.

See [Node.js documentation](https://nodejs.org/api/zlib.html#zlib_memory_usage_tuning)
regarding the usage.

##### filter

Type: `Function`

A function to decide if the response should be considered for compression.
This function is called as `filter(req, res)` and is expected to return
`true` to consider the response for compression, or `false` to not compress
the response.

The default filter function uses the [compressible](https://www.npmjs.com/package/compressible)
module to determine if `res.getHeader('Content-Type')` is compressible.

##### level

Type: `Number`<br>
Default: `zlib.constants.Z_DEFAULT_COMPRESSION`, or `-1`

The level of zlib compression to apply to responses. A higher level will result
in better compression, but will take longer to complete. A lower level will
result in less compression, but will be much faster.

This is an integer in the range of `0` (no compression) to `9` (maximum
compression). The special value `-1` can be used to mean the "default
compression level", which is a default compromise between speed and
compression (currently equivalent to level 6).

  - `-1` Default compression level (also `zlib.constants.Z_DEFAULT_COMPRESSION`).
  - `0` No compression (also `zlib.constants.Z_NO_COMPRESSION`).
  - `1` Fastest compression (also `zlib.constants.Z_BEST_SPEED`).
  - `2`
  - `3`
  - `4`
  - `5`
  - `6` (currently what `zlib.constants.Z_DEFAULT_COMPRESSION` points to).
  - `7`
  - `8`
  - `9` Best compression (also `zlib.constants.Z_BEST_COMPRESSION`).

**Note** in the list above, `zlib` is from `zlib = require('zlib')`.

##### memLevel

Type: `Number`<br>
Default: `zlib.constants.Z_DEFAULT_MEMLEVEL`, or `8`

This specifies how much memory should be allocated for the internal compression
state and is an integer in the range of `1` (minimum level) and `9` (maximum
level).

See [Node.js documentation](https://nodejs.org/api/zlib.html#zlib_memory_usage_tuning)
regarding the usage.

##### brotli

Type: `Object`

This specifies the options for configuring Brotli. See [Node.js documentation](https://nodejs.org/api/zlib.html#class-brotlioptions) for a complete list of available options.


##### strategy

Type: `Number`<br>
Default: `zlib.constants.Z_DEFAULT_STRATEGY`

This is used to tune the compression algorithm. This value only affects the
compression ratio, not the correctness of the compressed output, even if it
is not set appropriately.

  - `zlib.constants.Z_DEFAULT_STRATEGY` Use for normal data.
  - `zlib.constants.Z_FILTERED` Use for data produced by a filter (or predictor).
    Filtered data consists mostly of small values with a somewhat random
    distribution. In this case, the compression algorithm is tuned to
    compress them better. The effect is to force more Huffman coding and less
    string matching; it is somewhat intermediate between `zlib.constants.Z_DEFAULT_STRATEGY`
    and `zlib.constants.Z_HUFFMAN_ONLY`.
  - `zlib.constants.Z_FIXED` Use to prevent the use of dynamic Huffman codes, allowing
    for a simpler decoder for special applications.
  - `zlib.constants.Z_HUFFMAN_ONLY` Use to force Huffman encoding only (no string match).
  - `zlib.constants.Z_RLE` Use to limit match distances to one (run-length encoding).
    This is designed to be almost as fast as `zlib.constants.Z_HUFFMAN_ONLY`, but give
    better compression for PNG image data.

**Note** in the list above, `zlib` is from `zlib = require('zlib')`.

##### threshold

Type: `Number` or `String`<br>
Default: `1kb`

The byte threshold for the response body size before compression is considered
for the response. This is a number of bytes or any string
accepted by the [bytes](https://www.npmjs.com/package/bytes) module.

**Note** this is only an advisory setting; if the response size cannot be determined
at the time the response headers are written, then it is assumed the response is
_over_ the threshold. To guarantee the response size can be determined, be sure
set a `Content-Length` response header.

##### windowBits

Type: `Number`<br>
Default: `zlib.constants.Z_DEFAULT_WINDOWBITS`, or `15`

See [Node.js documentation](https://nodejs.org/api/zlib.html#zlib_memory_usage_tuning)
regarding the usage.

##### enforceEncoding

Type: `String`<br>
Default: `identity`

This is the default encoding to use when the client does not specify an encoding in the request's [Accept-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding) header.

#### .filter

The default `filter` function. This is used to construct a custom filter
function that is an extension of the default function.

```js
var compression = require('compression')
var express = require('express')

var app = express()

app.use(compression({ filter: shouldCompress }))

function shouldCompress (req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false
  }

  // fallback to standard filter function
  return compression.filter(req, res)
}
```

### res.flush

This module adds a `res.flush()` method to force the partially-compressed
response to be flushed to the client.

## Examples

### express

When using this module with express, simply `app.use` the module as
high as you like. Requests that pass through the middleware will be compressed.

```js
var compression = require('compression')
var express = require('express')

var app = express()

// compress all responses
app.use(compression())

// add all routes
```

### Node.js HTTP server

```js
var compression = require('compression')({ threshold: 0 })
var http = require('http')

function createServer (fn) {
  return http.createServer(function (req, res) {
    compression(req, res, function (err) {
      if (err) {
        res.statusCode = err.status || 500
        res.end(err.message)
        return
      }

      fn(req, res)
    })
  })
}

var server = createServer(function (req, res) {
  res.setHeader('Content-Type', 'text/plain')
  res.end('hello world!')
})

server.listen(3000, () => {
  console.log('> Listening at http://localhost:3000')
})
```

### Server-Sent Events

Because of the nature of compression this module does not work out of the box
with server-sent events. To compress content, a window of the output needs to
be buffered up in order to get good compression. Typically when using server-sent
events, there are certain block of data that need to reach the client.

You can achieve this by calling `res.flush()` when you need the data written to
actually make it to the client.

```js
var compression = require('compression')
var express = require('express')

var app = express()

// compress responses
app.use(compression())

// server-sent event stream
app.get('/events', function (req, res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')

  // send a ping approx every 2 seconds
  var timer = setInterval(function () {
    res.write('data: ping\n\n')

    // !!! this is the important part
    res.flush()
  }, 2000)

  res.on('close', function () {
    clearInterval(timer)
  })
})
```

##  Contributing

The Express.js project welcomes all constructive contributions. Contributions take many forms,
from code for bug fixes and enhancements, to additions and fixes to documentation, additional
tests, triaging incoming pull requests and issues, and more!

See the [Contributing Guide](https://github.com/expressjs/express/blob/master/Contributing.md) for more technical details on contributing.

## License

[MIT](LICENSE)

[npm-image]: https://badgen.net/npm/v/compression
[npm-url]: https://npmjs.org/package/compression
[downloads-image]: https://badgen.net/npm/dm/compression
[downloads-url]: https://npmcharts.com/compare/compression?minimal=true
[github-actions-ci-image]: https://badgen.net/github/checks/expressjs/compression/master?label=CI
[github-actions-ci-url]: https://github.com/expressjs/compression/actions?query=workflow%3Aci
[ossf-scorecard-badge]: https://api.scorecard.dev/projects/github.com/expressjs/compression/badge
[ossf-scorecard-visualizer]: https://ossf.github.io/scorecard-visualizer/#/projects/github.com/expressjs/compression
[funding-url]: https://opencollective.com/express
[funding-image]: https://badgen.net/badge/icon/sponsor/pink?icon=github&label=Open%20Collective