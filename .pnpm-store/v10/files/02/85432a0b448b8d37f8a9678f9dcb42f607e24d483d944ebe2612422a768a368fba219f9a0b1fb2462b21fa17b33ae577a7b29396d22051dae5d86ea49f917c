# Class: H2CClient

Extends: `undici.Dispatcher`

A basic H2C client.

**Example**

```js
const { createServer } = require('node:http2')
const { once } = require('node:events')
const { H2CClient } = require('undici')

const server = createServer((req, res) => {
  res.writeHead(200)
  res.end('Hello, world!')
})

server.listen()
once(server, 'listening').then(() => {
  const client = new H2CClient(`http://localhost:${server.address().port}/`)

  const response = await client.request({ path: '/', method: 'GET' })
  console.log(response.statusCode) // 200
  response.body.text.then((text) => {
    console.log(text) // Hello, world!
  })
})
```

## `new H2CClient(url[, options])`

Arguments:

- **url** `URL | string` - Should only include the **protocol, hostname, and port**. It only supports `http` protocol.
- **options** `H2CClientOptions` (optional)

Returns: `H2CClient`

### Parameter: `H2CClientOptions`

- **bodyTimeout** `number | null` (optional) - Default: `300e3` - The timeout after which a request will time out, in milliseconds. Monitors time between receiving body data. Use `0` to disable it entirely. Defaults to 300 seconds. Please note the `timeout` will be reset if you keep writing data to the socket everytime.
- **headersTimeout** `number | null` (optional) - Default: `300e3` - The amount of time, in milliseconds, the parser will wait to receive the complete HTTP headers while not sending the request. Defaults to 300 seconds.
- **keepAliveMaxTimeout** `number | null` (optional) - Default: `600e3` - The maximum allowed `keepAliveTimeout`, in milliseconds, when overridden by _keep-alive_ hints from the server. Defaults to 10 minutes.
- **keepAliveTimeout** `number | null` (optional) - Default: `4e3` - The timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by _keep-alive_ hints from the server. See [MDN: HTTP - Headers - Keep-Alive directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Keep-Alive#directives) for more details. Defaults to 4 seconds.
- **keepAliveTimeoutThreshold** `number | null` (optional) - Default: `2e3` - A number of milliseconds subtracted from server _keep-alive_ hints when overriding `keepAliveTimeout` to account for timing inaccuracies caused by e.g. transport latency. Defaults to 2 seconds.
- **maxHeaderSize** `number | null` (optional) - Default: `--max-http-header-size` or `16384` - The maximum length of request headers in bytes. Defaults to Node.js' --max-http-header-size or 16KiB.
- **maxResponseSize** `number | null` (optional) - Default: `-1` - The maximum length of response body in bytes. Set to `-1` to disable.
- **maxConcurrentStreams**: `number` - Default: `100`. Dictates the maximum number of concurrent streams for a single H2 session. It can be overridden by a SETTINGS remote frame.
- **pipelining** `number | null` (optional) - Default to `maxConcurrentStreams` - The amount of concurrent requests sent over a single HTTP/2 session in accordance with [RFC-7540](https://httpwg.org/specs/rfc7540.html#StreamsLayer) Stream specification. Streams can be closed up by remote server at any time.
- **connect** `ConnectOptions | null` (optional) - Default: `null`.
- **strictContentLength** `Boolean` (optional) - Default: `true` - Whether to treat request content length mismatches as errors. If true, an error is thrown when the request content-length header doesn't match the length of the request body. **Security Warning:** Disabling this option can expose your application to HTTP Request Smuggling attacks, where mismatched content-length headers cause servers and proxies to interpret request boundaries differently. This can lead to cache poisoning, credential hijacking, and bypassing security controls. Only disable this in controlled environments where you fully trust the request source.
- **autoSelectFamily**: `boolean` (optional) - Default: depends on local Node version, on Node 18.13.0 and above is `false`. Enables a family autodetection algorithm that loosely implements section 5 of [RFC 8305](https://tools.ietf.org/html/rfc8305#section-5). See [here](https://nodejs.org/api/net.html#socketconnectoptions-connectlistener) for more details. This option is ignored if not supported by the current Node version.
- **autoSelectFamilyAttemptTimeout**: `number` - Default: depends on local Node version, on Node 18.13.0 and above is `250`. The amount of time in milliseconds to wait for a connection attempt to finish before trying the next address when using the `autoSelectFamily` option. See [here](https://nodejs.org/api/net.html#socketconnectoptions-connectlistener) for more details.

#### Parameter: `H2CConnectOptions`

- **socketPath** `string | null` (optional) - Default: `null` - An IPC endpoint, either Unix domain socket or Windows named pipe.
- **timeout** `number | null` (optional) - In milliseconds, Default `10e3`.
- **servername** `string | null` (optional)
- **keepAlive** `boolean | null` (optional) - Default: `true` - TCP keep-alive enabled
- **keepAliveInitialDelay** `number | null` (optional) - Default: `60000` - TCP keep-alive interval for the socket in milliseconds

### Example - Basic Client instantiation

This will instantiate the undici H2CClient, but it will not connect to the origin until something is queued. Consider using `client.connect` to prematurely connect to the origin, or just call `client.request`.

```js
"use strict";
import { H2CClient } from "undici";

const client = new H2CClient("http://localhost:3000");
```

## Instance Methods

### `H2CClient.close([callback])`

Implements [`Dispatcher.close([callback])`](/docs/docs/api/Dispatcher.md#dispatcherclosecallback-promise).

### `H2CClient.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](/docs/docs/api/Dispatcher.md#dispatcherdestroyerror-callback-promise).

Waits until socket is closed before invoking the callback (or returning a promise if no callback is provided).

### `H2CClient.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherconnectoptions-callback).

### `H2CClient.dispatch(options, handlers)`

Implements [`Dispatcher.dispatch(options, handlers)`](/docs/docs/api/Dispatcher.md#dispatcherdispatchoptions-handler).

### `H2CClient.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](/docs/docs/api/Dispatcher.md#dispatcherpipelineoptions-handler).

### `H2CClient.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](/docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback).

### `H2CClient.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `H2CClient.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherupgradeoptions-callback).

## Instance Properties

### `H2CClient.closed`

- `boolean`

`true` after `H2CClient.close()` has been called.

### `H2CClient.destroyed`

- `boolean`

`true` after `client.destroyed()` has been called or `client.close()` has been called and the client shutdown has completed.

### `H2CClient.pipelining`

- `number`

Property to get and set the pipelining factor.

## Instance Events

### Event: `'connect'`

See [Dispatcher Event: `'connect'`](/docs/docs/api/Dispatcher.md#event-connect).

Parameters:

- **origin** `URL`
- **targets** `Array<Dispatcher>`

Emitted when a socket has been created and connected. The client will connect once `client.size > 0`.

#### Example - Client connect event

```js
import { createServer } from "node:http2";
import { H2CClient } from "undici";
import { once } from "events";

const server = createServer((request, response) => {
  response.end("Hello, World!");
}).listen();

await once(server, "listening");

const client = new H2CClient(`http://localhost:${server.address().port}`);

client.on("connect", (origin) => {
  console.log(`Connected to ${origin}`); // should print before the request body statement
});

try {
  const { body } = await client.request({
    path: "/",
    method: "GET",
  });
  body.setEncoding("utf-8");
  body.on("data", console.log);
  client.close();
  server.close();
} catch (error) {
  console.error(error);
  client.close();
  server.close();
}
```

### Event: `'disconnect'`

See [Dispatcher Event: `'disconnect'`](/docs/docs/api/Dispatcher.md#event-disconnect).

Parameters:

- **origin** `URL`
- **targets** `Array<Dispatcher>`
- **error** `Error`

Emitted when socket has disconnected. The error argument of the event is the error which caused the socket to disconnect. The client will reconnect if or once `client.size > 0`.

#### Example - Client disconnect event

```js
import { createServer } from "node:http2";
import { H2CClient } from "undici";
import { once } from "events";

const server = createServer((request, response) => {
  response.destroy();
}).listen();

await once(server, "listening");

const client = new H2CClient(`http://localhost:${server.address().port}`);

client.on("disconnect", (origin) => {
  console.log(`Disconnected from ${origin}`);
});

try {
  await client.request({
    path: "/",
    method: "GET",
  });
} catch (error) {
  console.error(error.message);
  client.close();
  server.close();
}
```

### Event: `'drain'`

Emitted when pipeline is no longer busy.

See [Dispatcher Event: `'drain'`](/docs/docs/api/Dispatcher.md#event-drain).

#### Example - Client drain event

```js
import { createServer } from "node:http2";
import { H2CClient } from "undici";
import { once } from "events";

const server = createServer((request, response) => {
  response.end("Hello, World!");
}).listen();

await once(server, "listening");

const client = new H2CClient(`http://localhost:${server.address().port}`);

client.on("drain", () => {
  console.log("drain event");
  client.close();
  server.close();
});

const requests = [
  client.request({ path: "/", method: "GET" }),
  client.request({ path: "/", method: "GET" }),
  client.request({ path: "/", method: "GET" }),
];

await Promise.all(requests);

console.log("requests completed");
```

### Event: `'error'`

Invoked for users errors such as throwing in the `onError` handler.
