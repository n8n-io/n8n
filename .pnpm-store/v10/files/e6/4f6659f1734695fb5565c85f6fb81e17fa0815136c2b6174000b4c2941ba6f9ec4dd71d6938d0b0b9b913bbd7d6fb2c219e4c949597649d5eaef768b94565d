# Class: WebSocket

Extends: [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)

The WebSocket object provides a way to manage a WebSocket connection to a server, allowing bidirectional communication. The API follows the [WebSocket spec](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455).

## `new WebSocket(url[, protocol])`

Arguments:

* **url** `URL | string`
* **protocol** `string | string[] | WebSocketInit` (optional) - Subprotocol(s) to request the server use, or a [`Dispatcher`](/docs/docs/api/Dispatcher.md).

### Example:

This example will not work in browsers or other platforms that don't allow passing an object.

```mjs
import { WebSocket, ProxyAgent } from 'undici'

const proxyAgent = new ProxyAgent('my.proxy.server')

const ws = new WebSocket('wss://echo.websocket.events', {
  dispatcher: proxyAgent,
  protocols: ['echo', 'chat']
})
```

If you do not need a custom Dispatcher, it's recommended to use the following pattern:

```mjs
import { WebSocket } from 'undici'

const ws = new WebSocket('wss://echo.websocket.events', ['echo', 'chat'])
```

### Example with HTTP/2:

> ⚠️ Warning: WebSocket over HTTP/2 is experimental, it is likely to change in the future.

> 🗒️ Note: WebSocket over HTTP/2 may be enabled by default in a future version,
> this will happen by enabling HTTP/2 connections as the default behavior of Undici's Agent as well the global dispatcher.
> Stay tuned to the changelog for more information.

This example will not work in browsers or other platforms that don't allow passing an object.

```mjs
import { Agent } from 'undici'

const agent = new Agent({ allowH2: true })

const ws = new WebSocket('wss://echo.websocket.events', {
  dispatcher: agent,
  protocols: ['echo', 'chat']
})
```

# Class: WebSocketStream

> ⚠️ Warning: the WebSocketStream API has not been finalized and is likely to change.

See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocketStream) for more information.

## `new WebSocketStream(url[, protocol])`

Arguments:

* **url** `URL | string`
* **options** `WebSocketStreamOptions` (optional)

### WebSocketStream Example

```js
const stream = new WebSocketStream('https://echo.websocket.org/')
const { readable, writable } = await stream.opened

async function read () {
  /** @type {ReadableStreamReader} */
  const reader = readable.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // do something with value
  }
}

async function write () {
  /** @type {WritableStreamDefaultWriter} */
  const writer = writable.getWriter()
  writer.write('Hello, world!')
  writer.releaseLock()
}

read()

setInterval(() => write(), 5000)

```

## ping(websocket, payload)
Arguments:

* **websocket** `WebSocket` - The WebSocket instance to send the ping frame on
* **payload** `Buffer|undefined` (optional) - Optional payload data to include with the ping frame. Must not exceed 125 bytes.

Sends a ping frame to the WebSocket server. The server must respond with a pong frame containing the same payload data. This can be used for keepalive purposes or to verify that the connection is still active.

### Example:

```js
import { WebSocket, ping } from 'undici'

const ws = new WebSocket('wss://echo.websocket.events')

ws.addEventListener('open', () => {
  // Send ping with no payload
  ping(ws)

  // Send ping with payload
  const payload = Buffer.from('hello')
  ping(ws, payload)
})
```

**Note**: A ping frame cannot have a payload larger than 125 bytes. The ping will only be sent if the WebSocket connection is in the OPEN state.

## Read More

- [MDN - WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [The WebSocket Specification](https://www.rfc-editor.org/rfc/rfc6455)
- [The WHATWG WebSocket Specification](https://websockets.spec.whatwg.org/)
