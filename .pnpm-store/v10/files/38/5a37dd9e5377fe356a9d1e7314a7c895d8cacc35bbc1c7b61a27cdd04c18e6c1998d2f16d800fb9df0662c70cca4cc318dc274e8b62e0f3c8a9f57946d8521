# undici

[![Node CI](https://github.com/nodejs/undici/actions/workflows/nodejs.yml/badge.svg)](https://github.com/nodejs/undici/actions/workflows/nodejs.yml) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/) [![npm version](https://badge.fury.io/js/undici.svg)](https://badge.fury.io/js/undici) [![codecov](https://codecov.io/gh/nodejs/undici/branch/main/graph/badge.svg?token=yZL6LtXkOA)](https://codecov.io/gh/nodejs/undici)

An HTTP/1.1 client, written from scratch for Node.js.

> Undici means eleven in Italian. 1.1 -> 11 -> Eleven -> Undici.
It is also a Stranger Things reference.

Have a question about using Undici? Open a [Q&A Discussion](https://github.com/nodejs/undici/discussions/new) or join our official OpenJS [Slack](https://openjs-foundation.slack.com/archives/C01QF9Q31QD) channel.

## Install

```
npm i undici
```

## Benchmarks

The benchmark is a simple `hello world` [example](benchmarks/benchmark.js) using a
number of unix sockets (connections) with a pipelining depth of 10 running on Node 20.6.0.

### Connections 1


| Tests               | Samples |        Result | Tolerance | Difference with slowest |
|---------------------|---------|---------------|-----------|-------------------------|
| http - no keepalive |      15 |  5.32 req/sec |  ± 2.61 % |                       - |
| http - keepalive    |      10 |  5.35 req/sec |  ± 2.47 % |                + 0.44 % |
| undici - fetch      |      15 | 41.85 req/sec |  ± 2.49 % |              + 686.04 % |
| undici - pipeline   |      40 | 50.36 req/sec |  ± 2.77 % |              + 845.92 % |
| undici - stream     |      15 | 60.58 req/sec |  ± 2.75 % |             + 1037.72 % |
| undici - request    |      10 | 61.19 req/sec |  ± 2.60 % |             + 1049.24 % |
| undici - dispatch   |      20 | 64.84 req/sec |  ± 2.81 % |             + 1117.81 % |


### Connections 50

| Tests               | Samples |           Result | Tolerance | Difference with slowest |
|---------------------|---------|------------------|-----------|-------------------------|
| undici - fetch      |      30 |  2107.19 req/sec |  ± 2.69 % |                       - |
| http - no keepalive |      10 |  2698.90 req/sec |  ± 2.68 % |               + 28.08 % |
| http - keepalive    |      10 |  4639.49 req/sec |  ± 2.55 % |              + 120.17 % |
| undici - pipeline   |      40 |  6123.33 req/sec |  ± 2.97 % |              + 190.59 % |
| undici - stream     |      50 |  9426.51 req/sec |  ± 2.92 % |              + 347.35 % |
| undici - request    |      10 | 10162.88 req/sec |  ± 2.13 % |              + 382.29 % |
| undici - dispatch   |      50 | 11191.11 req/sec |  ± 2.98 % |              + 431.09 % |


## Quick Start

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

for await (const data of body) {
  console.log('data', data)
}

console.log('trailers', trailers)
```

## Body Mixins

The `body` mixins are the most common way to format the request/response body. Mixins include:

- [`.formData()`](https://fetch.spec.whatwg.org/#dom-body-formdata)
- [`.json()`](https://fetch.spec.whatwg.org/#dom-body-json)
- [`.text()`](https://fetch.spec.whatwg.org/#dom-body-text)

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
* **options** [`RequestOptions`](./docs/api/Dispatcher.md#parameter-requestoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **method** `String` - Default: `PUT` if `options.body`, otherwise `GET`
  * **maxRedirections** `Integer` - Default: `0`

Returns a promise with the result of the `Dispatcher.request` method.

Calls `options.dispatcher.request(options)`.

See [Dispatcher.request](./docs/api/Dispatcher.md#dispatcherrequestoptions-callback) for more details.

### `undici.stream([url, options, ]factory): Promise`

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`StreamOptions`](./docs/api/Dispatcher.md#parameter-streamoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **method** `String` - Default: `PUT` if `options.body`, otherwise `GET`
  * **maxRedirections** `Integer` - Default: `0`
* **factory** `Dispatcher.stream.factory`

Returns a promise with the result of the `Dispatcher.stream` method.

Calls `options.dispatcher.stream(options, factory)`.

See [Dispatcher.stream](docs/api/Dispatcher.md#dispatcherstreamoptions-factory-callback) for more details.

### `undici.pipeline([url, options, ]handler): Duplex`

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`PipelineOptions`](docs/api/Dispatcher.md#parameter-pipelineoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **method** `String` - Default: `PUT` if `options.body`, otherwise `GET`
  * **maxRedirections** `Integer` - Default: `0`
* **handler** `Dispatcher.pipeline.handler`

Returns: `stream.Duplex`

Calls `options.dispatch.pipeline(options, handler)`.

See [Dispatcher.pipeline](docs/api/Dispatcher.md#dispatcherpipelineoptions-handler) for more details.

### `undici.connect([url, options]): Promise`

Starts two-way communications with the requested resource using [HTTP CONNECT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT).

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`ConnectOptions`](docs/api/Dispatcher.md#parameter-connectoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **maxRedirections** `Integer` - Default: `0`
* **callback** `(err: Error | null, data: ConnectData | null) => void` (optional)

Returns a promise with the result of the `Dispatcher.connect` method.

Calls `options.dispatch.connect(options)`.

See [Dispatcher.connect](docs/api/Dispatcher.md#dispatcherconnectoptions-callback) for more details.

### `undici.fetch(input[, init]): Promise`

Implements [fetch](https://fetch.spec.whatwg.org/#fetch-method).

* https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
* https://fetch.spec.whatwg.org/#fetch-method

Only supported on Node 16.8+.

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

In this implementation of fetch, ```request.body``` now accepts ```Async Iterables```. It is not present in the [Fetch Standard.](https://fetch.spec.whatwg.org)

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

#### `request.duplex`

- half

In this implementation of fetch, `request.duplex` must be set if `request.body` is `ReadableStream` or `Async Iterables`. And fetch requests are currently always be full duplex. More detail refer to [Fetch Standard.](https://fetch.spec.whatwg.org/#dom-requestinit-duplex)

#### `response.body`

Nodejs has two kinds of streams: [web streams](https://nodejs.org/dist/latest-v16.x/docs/api/webstreams.html), which follow the API of the WHATWG web standard found in browsers, and an older Node-specific [streams API](https://nodejs.org/api/stream.html). `response.body` returns a readable web stream. If you would prefer to work with a Node stream you can convert a web stream using `.fromWeb()`.

```js
import { fetch } from 'undici'
import { Readable } from 'node:stream'

const response = await fetch('https://example.com')
const readableWebStream = response.body
const readableNodeStream = Readable.fromWeb(readableWebStream)
```

#### Specification Compliance

This section documents parts of the [Fetch Standard](https://fetch.spec.whatwg.org) that Undici does
not support or does not fully implement.

##### Garbage Collection

* https://fetch.spec.whatwg.org/#garbage-collection

The [Fetch Standard](https://fetch.spec.whatwg.org) allows users to skip consuming the response body by relying on
[garbage collection](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management#garbage_collection) to release connection resources. Undici does not do the same. Therefore, it is important to always either consume or cancel the response body.

Garbage collection in Node is less aggressive and deterministic
(due to the lack of clear idle periods that browsers have through the rendering refresh rate)
which means that leaving the release of connection resources to the garbage collector can lead
to excessive connection usage, reduced performance (due to less connection re-use), and even
stalls or deadlocks when running out of connections.

```js
// Do
const headers = await fetch(url)
  .then(async res => {
    for await (const chunk of res.body) {
      // force consumption of body
    }
    return res.headers
  })

// Do not
const headers = await fetch(url)
  .then(res => res.headers)
```

However, if you want to get only headers, it might be better to use `HEAD` request method. Usage of this method will obviate the need for consumption or cancelling of the response body. See [MDN - HTTP - HTTP request methods - HEAD](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD) for more details.

```js
const headers = await fetch(url, { method: 'HEAD' })
  .then(res => res.headers)
```

##### Forbidden and Safelisted Header Names

* https://fetch.spec.whatwg.org/#cors-safelisted-response-header-name
* https://fetch.spec.whatwg.org/#forbidden-header-name
* https://fetch.spec.whatwg.org/#forbidden-response-header-name
* https://github.com/wintercg/fetch/issues/6

The [Fetch Standard](https://fetch.spec.whatwg.org) requires implementations to exclude certain headers from requests and responses. In browser environments, some headers are forbidden so the user agent remains in full control over them. In Undici, these constraints are removed to give more control to the user.

### `undici.upgrade([url, options]): Promise`

Upgrade to a different protocol. See [MDN - HTTP - Protocol upgrade mechanism](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism) for more details.

Arguments:

* **url** `string | URL | UrlObject`
* **options** [`UpgradeOptions`](docs/api/Dispatcher.md#parameter-upgradeoptions)
  * **dispatcher** `Dispatcher` - Default: [getGlobalDispatcher](#undicigetglobaldispatcher)
  * **maxRedirections** `Integer` - Default: `0`
* **callback** `(error: Error | null, data: UpgradeData) => void` (optional)

Returns a promise with the result of the `Dispatcher.upgrade` method.

Calls `options.dispatcher.upgrade(options)`.

See [Dispatcher.upgrade](docs/api/Dispatcher.md#dispatcherupgradeoptions-callback) for more details.

### `undici.setGlobalDispatcher(dispatcher)`

* dispatcher `Dispatcher`

Sets the global dispatcher used by Common API Methods.

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

## Specification Compliance

This section documents parts of the HTTP/1.1 specification that Undici does
not support or does not fully implement.

### Expect

Undici does not support the `Expect` request header field. The request
body is  always immediately sent and the `100 Continue` response will be
ignored.

Refs: https://tools.ietf.org/html/rfc7231#section-5.1.1

### Pipelining

Undici will only use pipelining if configured with a `pipelining` factor
greater than `1`.

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

### Manual Redirect

Since it is not possible to manually follow an HTTP redirect on the server-side,
Undici returns the actual response instead of an `opaqueredirect` filtered one
when invoked with a `manual` redirect. This aligns `fetch()` with the other
implementations in Deno and Cloudflare Workers.

Refs: https://fetch.spec.whatwg.org/#atomic-http-redirect-handling

## Workarounds

### Network address family autoselection.

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
* [__Tomas Della Vedova__](https://github.com/delvedor), <https://www.npmjs.com/~delvedor>

### Releasers

* [__Ethan Arrowood__](https://github.com/ethan-arrowood), <https://www.npmjs.com/~ethan_arrowood>
* [__Matteo Collina__](https://github.com/mcollina), <https://www.npmjs.com/~matteo.collina>
* [__Robert Nagy__](https://github.com/ronag), <https://www.npmjs.com/~ronag>
* [__Matthew Aitken__](https://github.com/KhafraDev), <https://www.npmjs.com/~khaf>

## License

MIT
