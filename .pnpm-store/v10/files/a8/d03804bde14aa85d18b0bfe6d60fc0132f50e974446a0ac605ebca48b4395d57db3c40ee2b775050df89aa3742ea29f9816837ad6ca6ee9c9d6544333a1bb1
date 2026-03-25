# Diagnostics Channel Support

Stability: Experimental.

Undici supports the [`diagnostics_channel`](https://nodejs.org/api/diagnostics_channel.html) (currently available only on Node.js v16+).
It is the preferred way to instrument Undici and retrieve internal information.

The channels available are the following.

## `undici:request:create`

This message is published when a new outgoing request is created.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:create').subscribe(({ request }) => {
  console.log('origin', request.origin)
  console.log('completed', request.completed)
  console.log('method', request.method)
  console.log('path', request.path)
  console.log('headers', request.headers) // array of strings, e.g: ['foo', 'bar']
  request.addHeader('hello', 'world')
  console.log('headers', request.headers) // e.g. ['foo', 'bar', 'hello', 'world']
})
```

Note: a request is only loosely completed to a given socket.

## `undici:request:bodyChunkSent`

This message is published when a chunk of the request body is being sent.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:bodyChunkSent').subscribe(({ request, chunk }) => {
  // request is the same object undici:request:create
})
```

## `undici:request:bodySent`

This message is published after the request body has been fully sent.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:bodySent').subscribe(({ request }) => {
  // request is the same object undici:request:create
})
```

## `undici:request:headers`

This message is published after the response headers have been received.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:headers').subscribe(({ request, response }) => {
  // request is the same object undici:request:create
  console.log('statusCode', response.statusCode)
  console.log(response.statusText)
  // response.headers are buffers.
  console.log(response.headers.map((x) => x.toString()))
})
```

## `undici:request:bodyChunkReceived`

This message is published after a chunk of the response body has been received.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:bodyChunkReceived').subscribe(({ request, chunk }) => {
  // request is the same object undici:request:create
})
```

## `undici:request:trailers`

This message is published after the response body and trailers have been received, i.e. the response has been completed.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:trailers').subscribe(({ request, trailers }) => {
  // request is the same object undici:request:create
  console.log('completed', request.completed)
  // trailers are buffers.
  console.log(trailers.map((x) => x.toString()))
})
```

## `undici:request:error`

This message is published if the request is going to error, but it has not errored yet.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:error').subscribe(({ request, error }) => {
  // request is the same object undici:request:create
})
```

## `undici:client:sendHeaders`

This message is published right before the first byte of the request is written to the socket.

*Note*: It will publish the exact headers that will be sent to the server in raw format.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:client:sendHeaders').subscribe(({ request, headers, socket }) => {
  // request is the same object undici:request:create
  console.log(`Full headers list ${headers.split('\r\n')}`);
})
```

## `undici:client:beforeConnect`

This message is published before creating a new connection for **any** request.
You can not assume that this event is related to any specific request.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:client:beforeConnect').subscribe(({ connectParams, connector }) => {
  // const { host, hostname, protocol, port, servername, version } = connectParams
  // connector is a function that creates the socket
})
```

## `undici:client:connected`

This message is published after a connection is established.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:client:connected').subscribe(({ socket, connectParams, connector }) => {
  // const { host, hostname, protocol, port, servername, version } = connectParams
 // connector is a function that creates the socket
})
```

## `undici:client:connectError`

This message is published if it did not succeed to create new connection

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:client:connectError').subscribe(({ error, socket, connectParams, connector }) => {
  // const { host, hostname, protocol, port, servername, version } = connectParams
  // connector is a function that creates the socket
  console.log(`Connect failed with ${error.message}`)
})
```

## `undici:websocket:open`

This message is published after the client has successfully connected to a server.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:websocket:open').subscribe(({ 
  address,           // { address: string, family: string, port: number }
  protocol,          // string - negotiated subprotocol
  extensions,        // string - negotiated extensions
  websocket,         // WebSocket - the WebSocket instance
  handshakeResponse  // object - HTTP response that upgraded the connection
}) => {
  console.log(address) // address, family, and port
  console.log(protocol) // negotiated subprotocols
  console.log(extensions) // negotiated extensions
  console.log(websocket) // the WebSocket instance
  
  // Handshake response details
  console.log(handshakeResponse.status) // 101 for successful WebSocket upgrade
  console.log(handshakeResponse.statusText) // 'Switching Protocols'
  console.log(handshakeResponse.headers) // Object containing response headers
})
```

### Handshake Response Object

The `handshakeResponse` object contains the HTTP response that upgraded the connection to WebSocket:

- `status` (number): The HTTP status code (101 for successful WebSocket upgrade)
- `statusText` (string): The HTTP status message ('Switching Protocols' for successful upgrade)
- `headers` (object): The HTTP response headers from the server, including:
  - `upgrade: 'websocket'`
  - `connection: 'upgrade'`
  - `sec-websocket-accept` and other WebSocket-related headers

This information is particularly useful for debugging and monitoring WebSocket connections, as it provides access to the initial HTTP handshake response that established the WebSocket connection.

## `undici:websocket:close`

This message is published after the connection has closed.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:websocket:close').subscribe(({ websocket, code, reason }) => {
  console.log(websocket) // the WebSocket instance
  console.log(code) // the closing status code
  console.log(reason) // the closing reason
})
```

## `undici:websocket:socket_error`

This message is published if the socket experiences an error.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:websocket:socket_error').subscribe((error) => {
  console.log(error)
})
```

## `undici:websocket:ping`

This message is published after the client receives a ping frame, if the connection is not closing.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:websocket:ping').subscribe(({ payload, websocket }) => {
  // a Buffer or undefined, containing the optional application data of the frame
  console.log(payload)
  console.log(websocket) // the WebSocket instance
})
```

## `undici:websocket:pong`

This message is published after the client receives a pong frame.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:websocket:pong').subscribe(({ payload, websocket }) => {
  // a Buffer or undefined, containing the optional application data of the frame
  console.log(payload)
  console.log(websocket) // the WebSocket instance
})
```

## `undici:proxy:connected`

This message is published after the `ProxyAgent` establishes a connection to the proxy server.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:proxy:connected').subscribe(({ socket, connectParams }) => {
  console.log(socket)
  console.log(connectParams)
  // const { origin, port, path, signal, headers, servername } = connectParams
})
```

## `undici:request:pending-requests`

This message is published when the deduplicate interceptor's pending request map changes. This is useful for monitoring and debugging request deduplication behavior.

The deduplicate interceptor automatically deduplicates concurrent requests for the same resource. When multiple identical requests are made while one is already in-flight, only one request is sent to the origin server, and all waiting handlers receive the same response.

```js
import diagnosticsChannel from 'diagnostics_channel'

diagnosticsChannel.channel('undici:request:pending-requests').subscribe(({ type, size, key }) => {
  console.log(type)  // 'added' or 'removed'
  console.log(size)  // current number of pending requests
  console.log(key)   // the deduplication key for this request
})
```

### Event Properties

- `type` (`string`): Either `'added'` when a new pending request is registered, or `'removed'` when a pending request completes (successfully or with an error).
- `size` (`number`): The current number of pending requests after the change.
- `key` (`string`): The deduplication key for the request, composed of the origin, method, path, and request headers.

### Example: Monitoring Request Deduplication

```js
import diagnosticsChannel from 'diagnostics_channel'

const channel = diagnosticsChannel.channel('undici:request:pending-requests')

channel.subscribe(({ type, size, key }) => {
  if (type === 'added') {
    console.log(`New pending request: ${key} (${size} total pending)`)
  } else {
    console.log(`Request completed: ${key} (${size} remaining)`)
  }
})
```

This can be useful for:
- Verifying that request deduplication is working as expected
- Monitoring the number of concurrent in-flight requests
- Debugging deduplication behavior in production environments
