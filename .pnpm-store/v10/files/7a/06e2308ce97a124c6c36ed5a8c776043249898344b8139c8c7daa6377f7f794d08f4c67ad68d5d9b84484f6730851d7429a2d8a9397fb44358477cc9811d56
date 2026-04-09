# Class: Client

Extends: `undici.Dispatcher`

A basic HTTP/1.1 client, mapped on top a single TCP/TLS connection. Pipelining is disabled by default.

Requests are not guaranteed to be dispatched in order of invocation.

## `new Client(url[, options])`

Arguments:

* **url** `URL | string` - Should only include the **protocol, hostname, and port**.
* **options** `ClientOptions` (optional)

Returns: `Client`

### Parameter: `ClientOptions`

* **bodyTimeout** `number | null` (optional) - Default: `300e3` - The timeout after which a request will time out, in milliseconds. Monitors time between receiving body data. Use `0` to disable it entirely. Defaults to 300 seconds. Please note the `timeout` will be reset if you keep writing data to the socket everytime.
* **headersTimeout** `number | null` (optional) - Default: `300e3` - The amount of time, in milliseconds, the parser will wait to receive the complete HTTP headers while not sending the request. Defaults to 300 seconds.
* **keepAliveMaxTimeout** `number | null` (optional) - Default: `600e3` - The maximum allowed `keepAliveTimeout`, in milliseconds, when overridden by *keep-alive* hints from the server. Defaults to 10 minutes.
* **keepAliveTimeout** `number | null` (optional) - Default: `4e3` - The timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by *keep-alive* hints from the server. See [MDN: HTTP - Headers - Keep-Alive directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Keep-Alive#directives) for more details. Defaults to 4 seconds.
* **keepAliveTimeoutThreshold** `number | null` (optional) - Default: `2e3` - A number of milliseconds subtracted from server *keep-alive* hints when overriding `keepAliveTimeout` to account for timing inaccuracies caused by e.g. transport latency. Defaults to 2 seconds.
* **maxHeaderSize** `number | null` (optional) - Default: `--max-http-header-size` or `16384` - The maximum length of request headers in bytes. Defaults to Node.js' --max-http-header-size or 16KiB.
* **maxResponseSize** `number | null` (optional) - Default: `-1` - The maximum length of response body in bytes. Set to `-1` to disable.
* **pipelining** `number | null` (optional) - Default: `1` - The amount of concurrent requests to be sent over the single TCP/TLS connection according to [RFC7230](https://tools.ietf.org/html/rfc7230#section-6.3.2). Carefully consider your workload and environment before enabling concurrent requests as pipelining may reduce performance if used incorrectly. Pipelining is sensitive to network stack settings as well as head of line blocking caused by e.g. long running requests. Set to `0` to disable keep-alive connections.
* **connect** `ConnectOptions | Function | null` (optional) - Default: `null`.
* **strictContentLength** `Boolean` (optional) - Default: `true` - Whether to treat request content length mismatches as errors. If true, an error is thrown when the request content-length header doesn't match the length of the request body. **Security Warning:** Disabling this option can expose your application to HTTP Request Smuggling attacks, where mismatched content-length headers cause servers and proxies to interpret request boundaries differently. This can lead to cache poisoning, credential hijacking, and bypassing security controls. Only disable this in controlled environments where you fully trust the request source.
* **autoSelectFamily**: `boolean` (optional) - Default: depends on local Node version, on Node 18.13.0 and above is `false`. Enables a family autodetection algorithm that loosely implements section 5 of [RFC 8305](https://tools.ietf.org/html/rfc8305#section-5). See [here](https://nodejs.org/api/net.html#socketconnectoptions-connectlistener) for more details. This option is ignored if not supported by the current Node version.
* **autoSelectFamilyAttemptTimeout**: `number` - Default: depends on local Node version, on Node 18.13.0 and above is `250`. The amount of time in milliseconds to wait for a connection attempt to finish before trying the next address when using the `autoSelectFamily` option. See [here](https://nodejs.org/api/net.html#socketconnectoptions-connectlistener) for more details.
* **allowH2**: `boolean` - Default: `false`. Enables support for H2 if the server has assigned bigger priority to it through ALPN negotiation.
* **useH2c**: `boolean` - Default: `false`. Enforces h2c for non-https connections.
* **maxConcurrentStreams**: `number` - Default: `100`. Dictates the maximum number of concurrent streams for a single H2 session. It can be overridden by a SETTINGS remote frame.
* **initialWindowSize**: `number` (optional) - Default: `262144` (256KB). Sets the HTTP/2 stream-level flow-control window size (SETTINGS_INITIAL_WINDOW_SIZE). Must be a positive integer greater than 0. This default is higher than Node.js core's default (65535 bytes) to improve throughput, Node's choice is very conservative for current high-bandwith networks. See [RFC 7540 Section 6.9.2](https://datatracker.ietf.org/doc/html/rfc7540#section-6.9.2) for more details.
* **connectionWindowSize**: `number` (optional) - Default `524288` (512KB). Sets the HTTP/2 connection-level flow-control window size using `ClientHttp2Session.setLocalWindowSize()`. Must be a positive integer greater than 0. This provides better flow control for the entire connection across multiple streams. See [Node.js HTTP/2 documentation](https://nodejs.org/api/http2.html#clienthttp2sessionsetlocalwindowsize) for more details.
* **pingInterval**: `number` - Default: `60e3`. The time interval in milliseconds between PING frames sent to the server. Set to `0` to disable PING frames. This is only applicable for HTTP/2 connections. This will emit a `ping` event on the client with the duration of the ping in milliseconds.

> **Notes about HTTP/2**
> - It only works under TLS connections. h2c is not supported.
> - The server must support HTTP/2 and choose it as the protocol during the ALPN negotiation.
>   - The server must not have a bigger priority for HTTP/1.1 than HTTP/2.
> - Pseudo headers are automatically attached to the request. If you try to set them, they will be overwritten.
>   - The `:path` header is automatically set to the request path.
>   - The `:method` header is automatically set to the request method.
>   - The `:scheme` header is automatically set to the request scheme.
>   - The `:authority` header is automatically set to the request `host[:port]`.
> - `PUSH` frames are yet not supported.

#### Parameter: `ConnectOptions`

Every Tls option, see [here](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback).
Furthermore, the following options can be passed:

* **socketPath** `string | null` (optional) - Default: `null` - An IPC endpoint, either Unix domain socket or Windows named pipe.
* **maxCachedSessions** `number | null` (optional) - Default: `100` - Maximum number of TLS cached sessions. Use 0 to disable TLS session caching. Default: 100.
* **timeout** `number | null` (optional) -  In milliseconds, Default `10e3`.
* **servername** `string | null` (optional)
* **keepAlive** `boolean | null` (optional) - Default: `true` - TCP keep-alive enabled
* **keepAliveInitialDelay** `number | null` (optional) - Default: `60000` - TCP keep-alive interval for the socket in milliseconds

### Example - Basic Client instantiation

This will instantiate the undici Client, but it will not connect to the origin until something is queued. Consider using `client.connect` to prematurely connect to the origin, or just call `client.request`.

```js
'use strict'
import { Client } from 'undici'

const client = new Client('http://localhost:3000')
```

### Example - Custom connector

This will allow you to perform some additional check on the socket that will be used for the next request.

```js
'use strict'
import { Client, buildConnector } from 'undici'

const connector = buildConnector({ rejectUnauthorized: false })
const client = new Client('https://localhost:3000', {
  connect (opts, cb) {
    connector(opts, (err, socket) => {
      if (err) {
        cb(err)
      } else if (/* assertion */) {
        socket.destroy()
        cb(new Error('kaboom'))
      } else {
        cb(null, socket)
      }
    })
  }
})
```

## Instance Methods

### `Client.close([callback])`

Implements [`Dispatcher.close([callback])`](/docs/docs/api/Dispatcher.md#dispatcherclosecallback-promise).

### `Client.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](/docs/docs/api/Dispatcher.md#dispatcherdestroyerror-callback-promise).

Waits until socket is closed before invoking the callback (or returning a promise if no callback is provided).

### `Client.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherconnectoptions-callback).

### `Client.dispatch(options, handlers)`

Implements [`Dispatcher.dispatch(options, handlers)`](/docs/docs/api/Dispatcher.md#dispatcherdispatchoptions-handler).

### `Client.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](/docs/docs/api/Dispatcher.md#dispatcherpipelineoptions-handler).

### `Client.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](/docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback).

### `Client.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `Client.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherupgradeoptions-callback).

## Instance Properties

### `Client.closed`

* `boolean`

`true` after `client.close()` has been called.

### `Client.destroyed`

* `boolean`

`true` after `client.destroyed()` has been called or `client.close()` has been called and the client shutdown has completed.

### `Client.pipelining`

* `number`

Property to get and set the pipelining factor.

## Instance Events

### Event: `'connect'`

See [Dispatcher Event: `'connect'`](/docs/docs/api/Dispatcher.md#event-connect).

Parameters:

* **origin** `URL`
* **targets** `Array<Dispatcher>`

Emitted when a socket has been created and connected. The client will connect once `client.size > 0`.

#### Example - Client connect event

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

client.on('connect', (origin) => {
  console.log(`Connected to ${origin}`) // should print before the request body statement
})

try {
  const { body } = await client.request({
    path: '/',
    method: 'GET'
  })
  body.setEncoding('utf-8')
  body.on('data', console.log)
  client.close()
  server.close()
} catch (error) {
  console.error(error)
  client.close()
  server.close()
}
```

### Event: `'disconnect'`

See [Dispatcher Event: `'disconnect'`](/docs/docs/api/Dispatcher.md#event-disconnect).

Parameters:

* **origin** `URL`
* **targets** `Array<Dispatcher>`
* **error** `Error`

Emitted when socket has disconnected. The error argument of the event is the error which caused the socket to disconnect. The client will reconnect if or once `client.size > 0`.

#### Example - Client disconnect event

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.destroy()
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

client.on('disconnect', (origin) => {
  console.log(`Disconnected from ${origin}`)
})

try {
  await client.request({
    path: '/',
    method: 'GET'
  })
} catch (error) {
  console.error(error.message)
  client.close()
  server.close()
}
```

### Event: `'drain'`

Emitted when pipeline is no longer busy.

See [Dispatcher Event: `'drain'`](/docs/docs/api/Dispatcher.md#event-drain).

#### Example - Client drain event

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

client.on('drain', () => {
  console.log('drain event')
  client.close()
  server.close()
})

const requests = [
  client.request({ path: '/', method: 'GET' }),
  client.request({ path: '/', method: 'GET' }),
  client.request({ path: '/', method: 'GET' })
]

await Promise.all(requests)

console.log('requests completed')
```

### Event: `'error'`

Invoked for users errors such as throwing in the `onError` handler.
