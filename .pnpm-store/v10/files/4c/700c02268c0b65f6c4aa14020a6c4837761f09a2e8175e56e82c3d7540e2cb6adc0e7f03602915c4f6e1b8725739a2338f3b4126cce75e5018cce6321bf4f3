# undici

[![Node CI](https://github.com/nodejs/undici/actions/workflows/ci.yml/badge.svg)](https://github.com/nodejs/undici/actions/workflows/nodejs.yml) [![neostandard javascript style](https://img.shields.io/badge/neo-standard-7fffff?style=flat\&labelColor=ff80ff)](https://github.com/neostandard/neostandard) [![npm version](https://badge.fury.io/js/undici.svg)](https://badge.fury.io/js/undici) [![codecov](https://codecov.io/gh/nodejs/undici/branch/main/graph/badge.svg?token=yZL6LtXkOA)](https://codecov.io/gh/nodejs/undici)

An HTTP/1.1 client, written from scratch for Node.js.

> Undici means eleven in Italian. 1.1 -> 11 -> Eleven -> Undici.
It is also a Stranger Things reference.

## How to get involved

Have a question about using Undici? Open a [Q&A Discussion](https://github.com/nodejs/undici/discussions/new) or join our official OpenJS [Slack](https://openjs-foundation.slack.com/archives/C01QF9Q31QD) channel.

Looking to contribute? Start by reading the [contributing guide](./CONTRIBUTING.md)

## Install

```
npm i undici
```

## Benchmarks

The benchmark is a simple getting data [example](https://github.com/nodejs/undici/blob/main/benchmarks/benchmark.js) using a
50 TCP connections with a pipelining depth of 10 running on Node 22.11.0.

```
┌────────────────────────┬─────────┬────────────────────┬────────────┬─────────────────────────┐
│  Tests                 │ Samples │ Result             │ Tolerance  │ Difference with slowest │
├────────────────────────┼─────────┼────────────────────┼────────────┼─────────────────────────┤
│  'axios'               │ 15      │ '5708.26 req/sec'  │ '± 2.91 %' │ '-'                     │
│  'http - no keepalive' │ 10      │ '5809.80 req/sec'  │ '± 2.30 %' │ '+ 1.78 %'              │
│  'request'             │ 30      │ '5828.80 req/sec'  │ '± 2.91 %' │ '+ 2.11 %'              │
│  'undici - fetch'      │ 40      │ '5903.78 req/sec'  │ '± 2.87 %' │ '+ 3.43 %'              │
│  'node-fetch'          │ 10      │ '5945.40 req/sec'  │ '± 2.13 %' │ '+ 4.15 %'              │
│  'got'                 │ 35      │ '6511.45 req/sec'  │ '± 2.84 %' │ '+ 14.07 %'             │
│  'http - keepalive'    │ 65      │ '9193.24 req/sec'  │ '± 2.92 %' │ '+ 61.05 %'             │
│  'superagent'          │ 35      │ '9339.43 req/sec'  │ '± 2.95 %' │ '+ 63.61 %'             │
│  'undici - pipeline'   │ 50      │ '13364.62 req/sec' │ '± 2.93 %' │ '+ 134.13 %'            │
│  'undici - stream'     │ 95      │ '18245.36 req/sec' │ '± 2.99 %' │ '+ 219.63 %'            │
│  'undici - request'    │ 50      │ '18340.17 req/sec' │ '± 2.84 %' │ '+ 221.29 %'            │
│  'undici - dispatch'   │ 40      │ '22234.42 req/sec' │ '± 2.94 %' │ '+ 289.51 %'            │
└────────────────────────┴─────────┴────────────────────┴────────────┴─────────────────────────┘
```

## Undici vs. Fetch

### Overview

Node.js includes a built-in `fetch()` implementation powered by undici starting from Node.js v18. However, there are important differences between using the built-in fetch and installing undici as a separate module.

### Built-in Fetch (Node.js v18+)

Node.js's built-in fetch is powered by a bundled version of undici:

```js
// Available globally in Node.js v18+
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// Check the bundled undici version
console.log(process.versions.undici); // e.g., "5.28.4"
```

**Pros:**
- No additional dependencies required
- Works across different JavaScript runtimes
- Automatic compression handling (gzip, deflate, br)
- Built-in caching support (in development)

**Cons:**
- Limited to the undici version bundled with your Node.js version
- Less control over connection pooling and advanced features
- Error handling follows Web API standards (errors wrapped in `TypeError`)
- Performance overhead due to Web Streams implementation

### Undici Module

Installing undici as a separate module gives you access to the latest features and APIs:

```bash
npm install undici
```

```js
import { request, fetch, Agent, setGlobalDispatcher } from 'undici';

// Use undici.request for maximum performance
const { statusCode, headers, body } = await request('https://api.example.com/data');
const data = await body.json();

// Or use undici.fetch with custom configuration
const agent = new Agent({ keepAliveTimeout: 10000 });
setGlobalDispatcher(agent);
const response = await fetch('https://api.example.com/data');
```

**Pros:**
- Latest undici features and bug fixes
- Access to advanced APIs (`request`, `stream`, `pipeline`)
- Fine-grained control over connection pooling
- Better error handling with clearer error messages
- Superior performance, especially with `undici.request`
- HTTP/1.1 pipelining support
- Custom interceptors and middleware
- Advanced features like `ProxyAgent`, `MockAgent`

**Cons:**
- Additional dependency to manage
- Larger bundle size

### When to Use Each

#### Use Built-in Fetch When:
- You want zero dependencies
- Building isomorphic code that runs in browsers and Node.js
- Publishing to npm and want to maximize compatibility with JS runtimes
- Simple HTTP requests without advanced configuration
- You're publishing to npm and you want to maximize compatiblity
- You don't depend on features from a specific version of undici

#### Use Undici Module When:
- You need the latest undici features and performance improvements
- You require advanced connection pooling configuration
- You need APIs not available in the built-in fetch (`ProxyAgent`, `MockAgent`, etc.)
- Performance is critical (use `undici.request` for maximum speed)
- You want better error handling and debugging capabilities
- You need HTTP/1.1 pipelining or advanced interceptors
- You prefer decoupled protocol and API interfaces

### Performance Comparison

Based on benchmarks, here's the typical performance hierarchy:

1. **`undici.request()`** - Fastest, most efficient
2. **`undici.fetch()`** - Good performance, standard compliance
3. **Node.js `http`/`https`** - Baseline performance

### Migration Guide

If you're currently using built-in fetch and want to migrate to undici:

```js
// Before: Built-in fetch
const response = await fetch('https://api.example.com/data');

// After: Undici fetch (drop-in replacement)
import { fetch } from 'undici';
const response = await fetch('https://api.example.com/data');

// Or: Undici request (better performance)
import { request } from 'undici';
const { statusCode, body } = await request('https://api.example.com/data');
const data = await body.json();
```

### Version Compatibility

You can check which version of undici is bundled with your Node.js version:

```js
console.log(process.versions.undici);
```

Installing undici as a module allows you to use a newer version than what's bundled with Node.js, giving you access to the latest features and performance improvements.

## Quick Start

### Basic Request

```js
import { request } from 'undici'

const {
  statusCode,
  headers,
  trailers,
  body
} = await request('http://localhost:3000/foo')

console.log('response received', statusCode)
console.log('headers', headers)

for await (const data of body) { console.log('data', data) }

console.log('trailers', trailers)
```

### Using Cache Interceptor

Undici provides a powerful HTTP caching interceptor that follows HTTP caching best practices. Here's how to use it:

```js
import { fetch, Agent, interceptors, cacheStores } from 'undici';

// Create a client with cache interceptor
const client = new Agent().compose(interceptors.cache({
  // Optional: Configure cache store (defaults to MemoryCacheStore)
  store: new cacheStores.MemoryCacheStore({
    maxSize: 100 * 1024 * 1024, // 100MB
    maxCount: 1000,
    maxEntrySize: 5 * 1024 * 1024 // 5MB
  }),
  
  // Optional: Specify which HTTP methods to cache (default: ['GET', 'HEAD'])
  methods: ['GET', 'HEAD']
}));

// Set the global dispatcher to use our caching client
setGlobalDispatcher(client);

// Now all fetch requests will use the cache
async function getData() {
  const response = await fetch('https://api.example.com/data');
  // The server should set appropriate Cache-Control headers in the response
  // which the cache will respect based on the cache policy
  return response.json();
}

// First request - fetches from origin
const data1 = await getData();

// Second request - served from cache if within max-age
const data2 = await getData();
```

#### Key Features:
- **Automatic Caching**: Respects `Cache-Control` and `Expires` headers
- **Validation**: Supports `ETag` and `Last-Modified` validation
- **Storage Options**: In-memory or persistent SQLite storage
- **Flexible**: Configure cache size, TTL, and more

## Global Installation

Undici provides an `install()` function to add all WHATWG fetch classes to `globalThis`, making them available globally:

```js
import { install } from 'undici'

// Install all WHATWG fetch classes globally
install()

// Now you can use fetch classes globally without importing
const response = await fetch('https://api.example.com/data')
const data = await response.json()

// All classes are available globally:
const headers = new Headers([['content-type', 'application/json']])
const request = new Request('https://example.com')
const formData = new FormData()
const ws = new WebSocket('wss://example.com')
const eventSource = new EventSource('https://example.com/events')
```

The `install()` function adds the following classes to `globalThis`:

- `fetch` - The fetch function
- `Headers` - HTTP headers management
- `Response` - HTTP response representation
- `Request` - HTTP request representation
- `FormData` - Form data handling
- `WebSocket` - WebSocket client
- `CloseEvent`, `ErrorEvent`, `MessageEvent` - WebSocket events
- `EventSource` - Server-sent events client

This is useful for:
- Polyfilling environments that don't have fetch
- Ensuring consistent fetch behavior across different Node.js versions
- Making undici's implementations available globally for libraries that expect them

## Body Mixins

The `body` mixins are the most common way to format the request/response body. Mixins include:

- [`.arrayBuffer()`](https://fetch.spec.whatwg.org/#dom-body-arraybuffer)
- [`.blob()`](https://fetch.spec.whatwg.org/#dom-body-blob)
- [`.bytes()`](https://fetch.spec.whatwg.org/#dom-body-bytes)
- [`.json()`](https://fetch.spec.whatwg.org/#dom-body-json)
- [`.text()`](https://fetch.spec.whatwg.org/#dom-body-text)

> [!NOTE]
> The body returned from `undici.request` does not implement `.formData()`.

Example usage:

```js
import { request } from 'undici'

const {
  statusCode,
  headers,
  trailers,
  body
} = await request('http://localhost:3000/foo')

console.log('response received', statusCode)
console.log('headers', headers)
console.log('data', await body.json())
console.log('trailers', trailers)
```

_Note: Once a mixin has been called then the body cannot be reused, thus calling additional mixins on `.body`, e.g. `.body.json(); .body.text()` will result in an error `TypeError: unusable` being thrown and returned through the `Promise` rejection._

Should you need to access the `body` in plain-text after using a mixin, the best practice is to use the `.text()` mixin first and then manually parse the text to the desired format.

For more information about their behavior, please reference the body mixin from the [Fetch Standard](https://fetch.spec.whatwg.org/#body-mixin).

## Common API Methods

This section documents our most commonly used API methods. Additional APIs are documented in their own files within the [docs](./docs/) folder and are accessible via the navigation list on the left side of the docs site.

### `undici.request([url, options]): Promise`

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`RequestOptions`](./docs/docs/api/Dispatcher.md#parameter-requestoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **method** `String` - Default: `PUT` if `options.body`, otherwise `GET`

Returns a promise with the result of the `Dispatcher.request` method.

Calls `options.dispatcher.request(options)`.

See [Dispatcher.request](./docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback) for more details, and [request examples](./docs/examples/README.md) for examples.

### `undici.stream([url, options, ]factory): Promise`

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`StreamOptions`](./docs/docs/api/Dispatcher.md#parameter-streamoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **method** `String` - Default: `PUT` if `options.body`, otherwise `GET`
* **factory** `Dispatcher.stream.factory`

Returns a promise with the result of the `Dispatcher.stream` method.

Calls `options.dispatcher.stream(options, factory)`.

See [Dispatcher.stream](./docs/docs/api/Dispatcher.md#dispatcherstreamoptions-factory-callback) for more details.

### `undici.pipeline([url, options, ]handler): Duplex`

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`PipelineOptions`](./docs/docs/api/Dispatcher.md#parameter-pipelineoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **method** `String` - Default: `PUT` if `options.body`, otherwise `GET`
* **handler** `Dispatcher.pipeline.handler`

Returns: `stream.Duplex`

Calls `options.dispatch.pipeline(options, handler)`.

See [Dispatcher.pipeline](./docs/docs/api/Dispatcher.md#dispatcherpipelineoptions-handler) for more details.

### `undici.connect([url, options]): Promise`

Starts two-way communications with the requested resource using [HTTP CONNECT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT).

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`ConnectOptions`](./docs/docs/api/Dispatcher.md#parameter-connectoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
* **callback** `(err: Error | null, data: ConnectData | null) => void` (optional)

Returns a promise with the result of the `Dispatcher.connect` method.

Calls `options.dispatch.connect(options)`.

See [Dispatcher.connect](./docs/docs/api/Dispatcher.md#dispatcherconnectoptions-callback) for more details.

### `undici.fetch(input[, init]): Promise`

Implements [fetch](https://fetch.spec.whatwg.org/#fetch-method).

* https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
* https://fetch.spec.whatwg.org/#fetch-method

Basic usage example:

```js
import { fetch } from 'undici'


const res = await fetch('https://example.com')
const json = await res.json()
console.log(json)
```

You can pass an optional dispatcher to `fetch` as:

```js
import { fetch, Agent } from 'undici'

const res = await fetch('https://example.com', {
  // Mocks are also supported
  dispatcher: new Agent({
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
const json = await res.json()
console.log(json)
```

#### `request.body`

A body can be of the following types:

- ArrayBuffer
- ArrayBufferView
- AsyncIterables
- Blob
- Iterables
- String
- URLSearchParams
- FormData

In this implementation of fetch, ```request.body``` now accepts ```Async Iterables```. It is not present in the [Fetch Standard](https://fetch.spec.whatwg.org).

```js
import { fetch } from 'undici'

const data = {
  async *[Symbol.asyncIterator]() {
    yield 'hello'
    yield 'world'
  },
}

await fetch('https://example.com', { body: data, method: 'POST', duplex: 'half' })
```

[FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) besides text data and buffers can also utilize streams via [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects:

```js
import { openAsBlob } from 'node:fs'

const file = await openAsBlob('./big.csv')
const body = new FormData()
body.set('file', file, 'big.csv')

await fetch('http://example.com', { method: 'POST', body })
```

#### `request.duplex`

- `'half'`

In this implementation of fetch, `request.duplex` must be set if `request.body` is `ReadableStream` or `Async Iterables`, however, even though the value must be set to `'half'`, it is actually a _full_ duplex. For more detail refer to the [Fetch Standard](https://fetch.spec.whatwg.org/#dom-requestinit-duplex).

#### `response.body`

Nodejs has two kinds of streams: [web streams](https://nodejs.org/api/webstreams.html), which follow the API of the WHATWG web standard found in browsers, and an older Node-specific [streams API](https://nodejs.org/api/stream.html). `response.body` returns a readable web stream. If you would prefer to work with a Node stream you can convert a web stream using `.fromWeb()`.

```js
import { fetch } from 'undici'
import { Readable } from 'node:stream'

const response = await fetch('https://example.com')
const readableWebStream = response.body
const readableNodeStream = Readable.fromWeb(readableWebStream)
```

## Specification Compliance

This section documents parts of the [HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9110.html) and [Fetch Standard](https://fetch.spec.whatwg.org) that Undici does
not support or does not fully implement.

#### CORS

Unlike browsers, Undici does not implement CORS (Cross-Origin Resource Sharing) checks by default. This means:

- No preflight requests are automatically sent for cross-origin requests
- No validation of `Access-Control-Allow-Origin` headers is performed
- Requests to any origin are allowed regardless of the source

This behavior is intentional for server-side environments where CORS restrictions are typically unnecessary. If your application requires CORS-like protections, you will need to implement these checks manually.

#### Garbage Collection

* https://fetch.spec.whatwg.org/#garbage-collection

The [Fetch Standard](https://fetch.spec.whatwg.org) allows users to skip consuming the response body by relying on
[garbage collection](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management#garbage_collection) to release connection resources.

Garbage collection in Node is less aggressive and deterministic
(due to the lack of clear idle periods that browsers have through the rendering refresh rate)
which means that leaving the release of connection resources to the garbage collector can lead
to excessive connection usage, reduced performance (due to less connection re-use), and even
stalls or deadlocks when running out of connections.
Therefore, __it is important to always either consume or cancel the response body anyway__.

```js
// Do
const { body, headers } = await fetch(url);
for await (const chunk of body) {
  // force consumption of body
}

// Do not
const { headers } = await fetch(url);
```

However, if you want to get only headers, it might be better to use `HEAD` request method. Usage of this method will obviate the need for consumption or cancelling of the response body. See [MDN - HTTP - HTTP request methods - HEAD](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD) for more details.

```js
const headers = await fetch(url, { method: 'HEAD' })
  .then(res => res.headers)
```

Note that consuming the response body is _mandatory_ for `request`:

```js
// Do
const { body, headers } = await request(url);
await body.dump(); // force consumption of body

// Do not
const { headers } = await request(url);
```

#### Forbidden and Safelisted Header Names

* https://fetch.spec.whatwg.org/#cors-safelisted-response-header-name
* https://fetch.spec.whatwg.org/#forbidden-header-name
* https://fetch.spec.whatwg.org/#forbidden-response-header-name
* https://github.com/wintercg/fetch/issues/6

The [Fetch Standard](https://fetch.spec.whatwg.org) requires implementations to exclude certain headers from requests and responses. In browser environments, some headers are forbidden so the user agent remains in full control over them. In Undici, these constraints are removed to give more control to the user.

#### Content-Encoding

* https://www.rfc-editor.org/rfc/rfc9110#field.content-encoding

Undici limits the number of `Content-Encoding` layers in a response to **5** to prevent resource exhaustion attacks. If a server responds with more than 5 content-encodings (e.g., `Content-Encoding: gzip, gzip, gzip, gzip, gzip, gzip`), the fetch will be rejected with an error. This limit matches the approach taken by [curl](https://curl.se/docs/CVE-2022-32206.html) and [urllib3](https://github.com/advisories/GHSA-gm62-xv2j-4rw9).

#### `undici.upgrade([url, options]): Promise`

Upgrade to a different protocol. See [MDN - HTTP - Protocol upgrade mechanism](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism) for more details.

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`UpgradeOptions`](./docs/docs/api/Dispatcher.md#parameter-upgradeoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
* **callback** `(error: Error | null, data: UpgradeData) => void` (optional)

Returns a promise with the result of the `Dispatcher.upgrade` method.

Calls `options.dispatcher.upgrade(options)`.

See [Dispatcher.upgrade](./docs/docs/api/Dispatcher.md#dispatcherupgradeoptions-callback) for more details.

### `undici.setGlobalDispatcher(dispatcher)`

* dispatcher `Dispatcher`

Sets the global dispatcher used by Common API Methods. Global dispatcher is shared among compatible undici modules,
including undici that is bundled internally with node.js.

### `undici.getGlobalDispatcher()`

Gets the global dispatcher used by Common API Methods.

Returns: `Dispatcher`

### `undici.setGlobalOrigin(origin)`

* origin `string | URL | undefined`

Sets the global origin used in `fetch`.

If `undefined` is passed, the global origin will be reset. This will cause `Response.redirect`, `new Request()`, and `fetch` to throw an error when a relative path is passed.

```js
setGlobalOrigin('http://localhost:3000')

const response = await fetch('/api/ping')

console.log(response.url) // http://localhost:3000/api/ping
```

### `undici.getGlobalOrigin()`

Gets the global origin used in `fetch`.

Returns: `URL`

### `UrlObject`

* **port** `string | number` (optional)
* **path** `string` (optional)
* **pathname** `string` (optional)
* **hostname** `string` (optional)
* **origin** `string` (optional)
* **protocol** `string` (optional)
* **search** `string` (optional)

#### Expect

Undici does not support the `Expect` request header field. The request
body is  always immediately sent and the `100 Continue` response will be
ignored.

Refs: https://tools.ietf.org/html/rfc7231#section-5.1.1

#### Pipelining

Undici will only use pipelining if configured with a `pipelining` factor
greater than `1`. Also it is important to pass `blocking: false` to the
request options to properly pipeline requests.

Undici always assumes that connections are persistent and will immediately
pipeline requests, without checking whether the connection is persistent.
Hence, automatic fallback to HTTP/1.0 or HTTP/1.1 without pipelining is
not supported.

Undici will immediately pipeline when retrying requests after a failed
connection. However, Undici will not retry the first remaining requests in
the prior pipeline and instead error the corresponding callback/promise/stream.

Undici will abort all running requests in the pipeline when any of them are
aborted.

* Refs: https://tools.ietf.org/html/rfc2616#section-8.1.2.2
* Refs: https://tools.ietf.org/html/rfc7230#section-6.3.2

#### Manual Redirect

Since it is not possible to manually follow an HTTP redirect on the server-side,
Undici returns the actual response instead of an `opaqueredirect` filtered one
when invoked with a `manual` redirect. This aligns `fetch()` with the other
implementations in Deno and Cloudflare Workers.

Refs: https://fetch.spec.whatwg.org/#atomic-http-redirect-handling

### Workarounds

#### Network address family autoselection.

If you experience problem when connecting to a remote server that is resolved by your DNS servers to a IPv6 (AAAA record)
first, there are chances that your local router or ISP might have problem connecting to IPv6 networks. In that case
undici will throw an error with code `UND_ERR_CONNECT_TIMEOUT`.

If the target server resolves to both a IPv6 and IPv4 (A records) address and you are using a compatible Node version
(18.3.0 and above), you can fix the problem by providing the `autoSelectFamily` option (support by both `undici.request`
and `undici.Agent`) which will enable the family autoselection algorithm when establishing the connection.

## Collaborators

* [__Daniele Belardi__](https://github.com/dnlup), <https://www.npmjs.com/~dnlup>
* [__Ethan Arrowood__](https://github.com/ethan-arrowood), <https://www.npmjs.com/~ethan_arrowood>
* [__Matteo Collina__](https://github.com/mcollina), <https://www.npmjs.com/~matteo.collina>
* [__Matthew Aitken__](https://github.com/KhafraDev), <https://www.npmjs.com/~khaf>
* [__Robert Nagy__](https://github.com/ronag), <https://www.npmjs.com/~ronag>
* [__Szymon Marczak__](https://github.com/szmarczak), <https://www.npmjs.com/~szmarczak>

## Past Collaborators
* [__Tomas Della Vedova__](https://github.com/delvedor), <https://www.npmjs.com/~delvedor>

### Releasers

* [__Ethan Arrowood__](https://github.com/ethan-arrowood), <https://www.npmjs.com/~ethan_arrowood>
* [__Matteo Collina__](https://github.com/mcollina), <https://www.npmjs.com/~matteo.collina>
* [__Robert Nagy__](https://github.com/ronag), <https://www.npmjs.com/~ronag>
* [__Matthew Aitken__](https://github.com/KhafraDev), <https://www.npmjs.com/~khaf>

## Long Term Support

Undici aligns with the Node.js LTS schedule. The following table shows the supported versions:

| Undici Version | Bundled in Node.js | Node.js Versions Supported | End of Life |
|----------------|-------------------|----------------------------|-------------|
| 5.x           | 18.x              | ≥14.0 (tested: 14, 16, 18) | 2024-04-30  |
| 6.x           | 20.x, 22.x       | ≥18.17 (tested: 18, 20, 21, 22) | 2026-04-30  |
| 7.x           | 24.x              | ≥20.18.1 (tested: 20, 22, 24) | 2027-04-30  |

## License

MIT
