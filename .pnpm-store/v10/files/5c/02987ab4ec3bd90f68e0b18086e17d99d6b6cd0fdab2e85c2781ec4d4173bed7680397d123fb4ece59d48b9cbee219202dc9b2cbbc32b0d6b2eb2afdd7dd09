# Dispatcher

Extends: `events.EventEmitter`

Dispatcher is the core API used to dispatch requests.

Requests are not guaranteed to be dispatched in order of invocation.

## Instance Methods

### `Dispatcher.close([callback]): Promise`

Closes the dispatcher and gracefully waits for enqueued requests to complete before resolving.

Arguments:

* **callback** `(error: Error | null, data: null) => void` (optional)

Returns: `void | Promise<null>` - Only returns a `Promise` if no `callback` argument was passed

```js
dispatcher.close() // -> Promise
dispatcher.close(() => {}) // -> void
```

#### Example - Request resolves before Client closes

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('undici')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

try {
  const { body } = await client.request({
      path: '/',
      method: 'GET'
  })
  body.setEncoding('utf8')
  body.on('data', console.log)
} catch (error) {}

await client.close()

console.log('Client closed')
server.close()
```

### `Dispatcher.connect(options[, callback])`

Starts two-way communications with the requested resource using [HTTP CONNECT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT).

Arguments:

* **options** `ConnectOptions`
* **callback** `(err: Error | null, data: ConnectData | null) => void` (optional)

Returns: `void | Promise<ConnectData>` - Only returns a `Promise` if no `callback` argument was passed

#### Parameter: `ConnectOptions`

* **path** `string`
* **headers** `UndiciHeaders` (optional) - Default: `null`
* **signal** `AbortSignal | events.EventEmitter | null` (optional) - Default: `null`
* **opaque** `unknown` (optional) - This argument parameter is passed through to `ConnectData`

#### Parameter: `ConnectData`

* **statusCode** `number`
* **headers** `Record<string, string | string[] | undefined>`
* **socket** `stream.Duplex`
* **opaque** `unknown`

#### Example - Connect request with echo

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  throw Error('should never get here')
}).listen()

server.on('connect', (req, socket, head) => {
  socket.write('HTTP/1.1 200 Connection established\r\n\r\n')

  let data = head.toString()
  socket.on('data', (buf) => {
    data += buf.toString()
  })

  socket.on('end', () => {
    socket.end(data)
  })
})

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

try {
  const { socket } = await client.connect({
    path: '/'
  })
  const wanted = 'Body'
  let data = ''
  socket.on('data', d => { data += d })
  socket.on('end', () => {
    console.log(`Data received: ${data.toString()} | Data wanted: ${wanted}`)
    client.close()
    server.close()
  })
  socket.write(wanted)
  socket.end()
} catch (error) { }
```

### `Dispatcher.destroy([error, callback]): Promise`

Destroy the dispatcher abruptly with the given error. All the pending and running requests will be asynchronously aborted and error. Since this operation is asynchronously dispatched there might still be some progress on dispatched requests.

Both arguments are optional; the method can be called in four different ways:

Arguments:

* **error** `Error | null` (optional)
* **callback** `(error: Error | null, data: null) => void` (optional)

Returns: `void | Promise<void>` - Only returns a `Promise` if no `callback` argument was passed

```js
dispatcher.destroy() // -> Promise
dispatcher.destroy(new Error()) // -> Promise
dispatcher.destroy(() => {}) // -> void
dispatcher.destroy(new Error(), () => {}) // -> void
```

#### Example - Request is aborted when Client is destroyed

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end()
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

try {
  const request = client.request({
    path: '/',
    method: 'GET'
  })
  client.destroy()
    .then(() => {
      console.log('Client destroyed')
      server.close()
    })
  await request
} catch (error) {
  console.error(error)
}
```

### `Dispatcher.dispatch(options, handler)`

This is the low level API which all the preceding APIs are implemented on top of.
This API is expected to evolve through semver-major versions and is less stable than the preceding higher level APIs.
It is primarily intended for library developers who implement higher level APIs on top of this.

Arguments:

* **options** `DispatchOptions`
* **handler** `DispatchHandler`

Returns: `Boolean` - `false` if dispatcher is busy and further dispatch calls won't make any progress until the `'drain'` event has been emitted.

#### Parameter: `DispatchOptions`

* **origin** `string | URL`
* **path** `string`
* **method** `string`
* **reset** `boolean` (optional) - Default: `false` - If `false`, the request will attempt to create a long-living connection by sending the `connection: keep-alive` header,otherwise will attempt to close it immediately after response by sending `connection: close` within the request and closing the socket afterwards.
* **body** `string | Buffer | Uint8Array | stream.Readable | Iterable | AsyncIterable | null` (optional) - Default: `null`
* **headers** `UndiciHeaders | string[]` (optional) - Default: `null`.
* **query** `Record<string, any> | null` (optional) - Default: `null` - Query string params to be embedded in the request URL. Note that both keys and values of query are encoded using `encodeURIComponent`. If for some reason you need to send them unencoded, embed query params into path directly instead.
* **idempotent** `boolean` (optional) - Default: `true` if `method` is `'HEAD'` or `'GET'` - Whether the requests can be safely retried or not. If `false` the request won't be sent until all preceding requests in the pipeline has completed.
* **blocking** `boolean` (optional) - Default: `false` - Whether the response is expected to take a long time and would end up blocking the pipeline. When this is set to `true` further pipelining will be avoided on the same connection until headers have been received.
* **upgrade** `string | null` (optional) - Default: `null` - Upgrade the request. Should be used to specify the kind of upgrade i.e. `'Websocket'`.
* **bodyTimeout** `number | null` (optional) - The timeout after which a request will time out, in milliseconds. Monitors time between receiving body data. Use `0` to disable it entirely. Defaults to 300 seconds.
* **headersTimeout** `number | null` (optional) - The amount of time, in milliseconds, the parser will wait to receive the complete HTTP headers while not sending the request. Defaults to 300 seconds.
* **throwOnError** `boolean` (optional) - Default: `false` - Whether Undici should throw an error upon receiving a 4xx or 5xx response from the server.
* **expectContinue** `boolean` (optional) - Default: `false` - For H2, it appends the expect: 100-continue header, and halts the request body until a 100-continue is received from the remote server

#### Parameter: `DispatchHandler`

* **onConnect** `(abort: () => void, context: object) => void` - Invoked before request is dispatched on socket. May be invoked multiple times when a request is retried when the request at the head of the pipeline fails.
* **onError** `(error: Error) => void` - Invoked when an error has occurred. May not throw.
* **onUpgrade** `(statusCode: number, headers: Buffer[], socket: Duplex) => void` (optional) - Invoked when request is upgraded. Required if `DispatchOptions.upgrade` is defined or `DispatchOptions.method === 'CONNECT'`.
* **onResponseStarted** `() => void` (optional) - Invoked when response is received, before headers have been read.
* **onHeaders** `(statusCode: number, headers: Buffer[], resume: () => void, statusText: string) => boolean` - Invoked when statusCode and headers have been received. May be invoked multiple times due to 1xx informational headers. Not required for `upgrade` requests.
* **onData** `(chunk: Buffer) => boolean` - Invoked when response payload data is received. Not required for `upgrade` requests.
* **onComplete** `(trailers: Buffer[]) => void` - Invoked when response payload and trailers have been received and the request has completed. Not required for `upgrade` requests.
* **onBodySent** `(chunk: string | Buffer | Uint8Array) => void` - Invoked when a body chunk is sent to the server. Not required. For a stream or iterable body this will be invoked for every chunk. For other body types, it will be invoked once after the body is sent.

#### Example 1 - Dispatch GET request

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

const data = []

client.dispatch({
  path: '/',
  method: 'GET',
  headers: {
    'x-foo': 'bar'
  }
}, {
  onConnect: () => {
    console.log('Connected!')
  },
  onError: (error) => {
    console.error(error)
  },
  onHeaders: (statusCode, headers) => {
    console.log(`onHeaders | statusCode: ${statusCode} | headers: ${headers}`)
  },
  onData: (chunk) => {
    console.log('onData: chunk received')
    data.push(chunk)
  },
  onComplete: (trailers) => {
    console.log(`onComplete | trailers: ${trailers}`)
    const res = Buffer.concat(data).toString('utf8')
    console.log(`Data: ${res}`)
    client.close()
    server.close()
  }
})
```

#### Example 2 - Dispatch Upgrade Request

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end()
}).listen()

await once(server, 'listening')

server.on('upgrade', (request, socket, head) => {
  console.log('Node.js Server - upgrade event')
  socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n')
  socket.write('Upgrade: WebSocket\r\n')
  socket.write('Connection: Upgrade\r\n')
  socket.write('\r\n')
  socket.end()
})

const client = new Client(`http://localhost:${server.address().port}`)

client.dispatch({
  path: '/',
  method: 'GET',
  upgrade: 'websocket'
}, {
  onConnect: () => {
    console.log('Undici Client - onConnect')
  },
  onError: (error) => {
    console.log('onError') // shouldn't print
  },
  onUpgrade: (statusCode, headers, socket) => {
    console.log('Undici Client - onUpgrade')
    console.log(`onUpgrade Headers: ${headers}`)
    socket.on('data', buffer => {
      console.log(buffer.toString('utf8'))
    })
    socket.on('end', () => {
      client.close()
      server.close()
    })
    socket.end()
  }
})
```

#### Example 3 - Dispatch POST request

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  request.on('data', (data) => {
    console.log(`Request Data: ${data.toString('utf8')}`)
    const body = JSON.parse(data)
    body.message = 'World'
    response.end(JSON.stringify(body))
  })
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

const data = []

client.dispatch({
  path: '/',
  method: 'POST',
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify({ message: 'Hello' })
}, {
  onConnect: () => {
    console.log('Connected!')
  },
  onError: (error) => {
    console.error(error)
  },
  onHeaders: (statusCode, headers) => {
    console.log(`onHeaders | statusCode: ${statusCode} | headers: ${headers}`)
  },
  onData: (chunk) => {
    console.log('onData: chunk received')
    data.push(chunk)
  },
  onComplete: (trailers) => {
    console.log(`onComplete | trailers: ${trailers}`)
    const res = Buffer.concat(data).toString('utf8')
    console.log(`Response Data: ${res}`)
    client.close()
    server.close()
  }
})
```

### `Dispatcher.pipeline(options, handler)`

For easy use with [stream.pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback). The `handler` argument should return a `Readable` from which the result will be read. Usually it should just return the `body` argument unless some kind of transformation needs to be performed based on e.g. `headers` or `statusCode`. The `handler` should validate the response and save any required state. If there is an error, it should be thrown. The function returns a `Duplex` which writes to the request and reads from the response.

Arguments:

* **options** `PipelineOptions`
* **handler** `(data: PipelineHandlerData) => stream.Readable`

Returns: `stream.Duplex`

#### Parameter: PipelineOptions

Extends: [`RequestOptions`](#parameter-requestoptions)

* **objectMode** `boolean` (optional) - Default: `false` - Set to `true` if the `handler` will return an object stream.

#### Parameter: PipelineHandlerData

* **statusCode** `number`
* **headers** `Record<string, string | string[] | undefined>`
* **opaque** `unknown`
* **body** `stream.Readable`
* **context** `object`
* **onInfo** `({statusCode: number, headers: Record<string, string | string[]>}) => void | null` (optional) - Default: `null` - Callback collecting all the info headers (HTTP 100-199) received.

#### Example 1 - Pipeline Echo

```js
import { Readable, Writable, PassThrough, pipeline } from 'stream'
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  request.pipe(response)
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

let res = ''

pipeline(
  new Readable({
    read () {
      this.push(Buffer.from('undici'))
      this.push(null)
    }
  }),
  client.pipeline({
    path: '/',
    method: 'GET'
  }, ({ statusCode, headers, body }) => {
    console.log(`response received ${statusCode}`)
    console.log('headers', headers)
    return pipeline(body, new PassThrough(), () => {})
  }),
  new Writable({
    write (chunk, _, callback) {
      res += chunk.toString()
      callback()
    },
    final (callback) {
      console.log(`Response pipelined to writable: ${res}`)
      callback()
    }
  }),
  error => {
    if (error) {
      console.error(error)
    }

    client.close()
    server.close()
  }
)
```

### `Dispatcher.request(options[, callback])`

Performs a HTTP request.

Non-idempotent requests will not be pipelined in order
to avoid indirect failures.

Idempotent requests will be automatically retried if
they fail due to indirect failure from the request
at the head of the pipeline. This does not apply to
idempotent requests with a stream request body.

All response bodies must always be fully consumed or destroyed.

Arguments:

* **options** `RequestOptions`
* **callback** `(error: Error | null, data: ResponseData) => void` (optional)

Returns: `void | Promise<ResponseData>` - Only returns a `Promise` if no `callback` argument was passed.

#### Parameter: `RequestOptions`

Extends: [`DispatchOptions`](#parameter-dispatchoptions)

* **opaque** `unknown` (optional) - Default: `null` - Used for passing through context to `ResponseData`.
* **signal** `AbortSignal | events.EventEmitter | null` (optional) - Default: `null`.
* **onInfo** `({statusCode: number, headers: Record<string, string | string[]>}) => void | null` (optional) - Default: `null` - Callback collecting all the info headers (HTTP 100-199) received.

The `RequestOptions.method` property should not be value `'CONNECT'`.

#### Parameter: `ResponseData`

* **statusCode** `number`
* **headers** `Record<string, string | string[]>` - Note that all header keys are lower-cased, e. g. `content-type`.
* **body** `stream.Readable` which also implements [the body mixin from the Fetch Standard](https://fetch.spec.whatwg.org/#body-mixin).
* **trailers** `Record<string, string>` - This object starts out
  as empty and will be mutated to contain trailers after `body` has emitted `'end'`.
* **opaque** `unknown`
* **context** `object`

`body` contains the following additional [body mixin](https://fetch.spec.whatwg.org/#body-mixin) methods and properties:

* [`.arrayBuffer()`](https://fetch.spec.whatwg.org/#dom-body-arraybuffer)
* [`.blob()`](https://fetch.spec.whatwg.org/#dom-body-blob)
* [`.bytes()`](https://fetch.spec.whatwg.org/#dom-body-bytes)
* [`.json()`](https://fetch.spec.whatwg.org/#dom-body-json)
* [`.text()`](https://fetch.spec.whatwg.org/#dom-body-text)
* `body`
* `bodyUsed`

`body` can not be consumed twice. For example, calling `text()` after `json()` throws `TypeError`.

`body` contains the following additional extensions:

- `dump({ limit: Integer })`, dump the response by reading up to `limit` bytes without killing the socket (optional) - Default: 262144.

Note that body will still be a `Readable` even if it is empty, but attempting to deserialize it with `json()` will result in an exception. Recommended way to ensure there is a body to deserialize is to check if status code is not 204, and `content-type` header starts with `application/json`.

#### Example 1 - Basic GET Request

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

try {
  const { body, headers, statusCode, trailers } = await client.request({
    path: '/',
    method: 'GET'
  })
  console.log(`response received ${statusCode}`)
  console.log('headers', headers)
  body.setEncoding('utf8')
  body.on('data', console.log)
  body.on('end', () => {
    console.log('trailers', trailers)
  })

  client.close()
  server.close()
} catch (error) {
  console.error(error)
}
```

#### Example 2 - Aborting a request

> Node.js v15+ is required to run this example

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)
const abortController = new AbortController()

try {
  client.request({
    path: '/',
    method: 'GET',
    signal: abortController.signal
  })
} catch (error) {
  console.error(error) // should print an RequestAbortedError
  client.close()
  server.close()
}

abortController.abort()
```

Alternatively, any `EventEmitter` that emits an `'abort'` event may be used as an abort controller:

```js
import { createServer } from 'http'
import { Client } from 'undici'
import EventEmitter, { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)
const ee = new EventEmitter()

try {
  client.request({
    path: '/',
    method: 'GET',
    signal: ee
  })
} catch (error) {
  console.error(error) // should print an RequestAbortedError
  client.close()
  server.close()
}

ee.emit('abort')
```

Destroying the request or response body will have the same effect.

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

try {
  const { body } = await client.request({
    path: '/',
    method: 'GET'
  })
  body.destroy()
} catch (error) {
  console.error(error) // should print an RequestAbortedError
  client.close()
  server.close()
}
```

### `Dispatcher.stream(options, factory[, callback])`

A faster version of `Dispatcher.request`. This method expects the second argument `factory` to return a [`stream.Writable`](https://nodejs.org/api/stream.html#stream_class_stream_writable) stream which the response will be written to. This improves performance by avoiding creating an intermediate [`stream.Readable`](https://nodejs.org/api/stream.html#stream_readable_streams) stream when the user expects to directly pipe the response body to a [`stream.Writable`](https://nodejs.org/api/stream.html#stream_class_stream_writable) stream.

As demonstrated in [Example 1 - Basic GET stream request](#example-1---basic-get-stream-request), it is recommended to use the `option.opaque` property to avoid creating a closure for the `factory` method. This pattern works well with Node.js Web Frameworks such as [Fastify](https://fastify.io). See [Example 2 - Stream to Fastify Response](#example-2---stream-to-fastify-response) for more details.

Arguments:

* **options** `RequestOptions`
* **factory** `(data: StreamFactoryData) => stream.Writable`
* **callback** `(error: Error | null, data: StreamData) => void` (optional)

Returns: `void | Promise<StreamData>` - Only returns a `Promise` if no `callback` argument was passed

#### Parameter: `StreamFactoryData`

* **statusCode** `number`
* **headers** `Record<string, string | string[] | undefined>`
* **opaque** `unknown`
* **onInfo** `({statusCode: number, headers: Record<string, string | string[]>}) => void | null` (optional) - Default: `null` - Callback collecting all the info headers (HTTP 100-199) received.

#### Parameter: `StreamData`

* **opaque** `unknown`
* **trailers** `Record<string, string>`
* **context** `object`

#### Example 1 - Basic GET stream request

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'
import { Writable } from 'stream'

const server = createServer((request, response) => {
  response.end('Hello, World!')
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

const bufs = []

try {
  await client.stream({
    path: '/',
    method: 'GET',
    opaque: { bufs }
  }, ({ statusCode, headers, opaque: { bufs } }) => {
    console.log(`response received ${statusCode}`)
    console.log('headers', headers)
    return new Writable({
      write (chunk, encoding, callback) {
        bufs.push(chunk)
        callback()
      }
    })
  })

  console.log(Buffer.concat(bufs).toString('utf-8'))

  client.close()
  server.close()
} catch (error) {
  console.error(error)
}
```

#### Example 2 - Stream to Fastify Response

In this example, a (fake) request is made to the fastify server using `fastify.inject()`. This request then executes the fastify route handler which makes a subsequent request to the raw Node.js http server using `undici.dispatcher.stream()`. The fastify response is passed to the `opaque` option so that undici can tap into the underlying writable stream using `response.raw`. This methodology demonstrates how one could use undici and fastify together to create fast-as-possible requests from one backend server to another.

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'
import fastify from 'fastify'

const nodeServer = createServer((request, response) => {
  response.end('Hello, World! From Node.js HTTP Server')
}).listen()

await once(nodeServer, 'listening')

console.log('Node Server listening')

const nodeServerUndiciClient = new Client(`http://localhost:${nodeServer.address().port}`)

const fastifyServer = fastify()

fastifyServer.route({
  url: '/',
  method: 'GET',
  handler: (request, response) => {
    nodeServerUndiciClient.stream({
      path: '/',
      method: 'GET',
      opaque: response
    }, ({ opaque }) => opaque.raw)
  }
})

await fastifyServer.listen()

console.log('Fastify Server listening')

const fastifyServerUndiciClient = new Client(`http://localhost:${fastifyServer.server.address().port}`)

try {
  const { statusCode, body } = await fastifyServerUndiciClient.request({
    path: '/',
    method: 'GET'
  })

  console.log(`response received ${statusCode}`)
  body.setEncoding('utf8')
  body.on('data', console.log)

  nodeServerUndiciClient.close()
  fastifyServerUndiciClient.close()
  fastifyServer.close()
  nodeServer.close()
} catch (error) { }
```

### `Dispatcher.upgrade(options[, callback])`

Upgrade to a different protocol. Visit [MDN - HTTP - Protocol upgrade mechanism](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism) for more details.

Arguments:

* **options** `UpgradeOptions`

* **callback** `(error: Error | null, data: UpgradeData) => void` (optional)

Returns: `void | Promise<UpgradeData>` - Only returns a `Promise` if no `callback` argument was passed

#### Parameter: `UpgradeOptions`

* **path** `string`
* **method** `string` (optional) - Default: `'GET'`
* **headers** `UndiciHeaders` (optional) - Default: `null`
* **protocol** `string` (optional) - Default: `'Websocket'` - A string of comma separated protocols, in descending preference order.
* **signal** `AbortSignal | EventEmitter | null` (optional) - Default: `null`

#### Parameter: `UpgradeData`

* **headers** `http.IncomingHeaders`
* **socket** `stream.Duplex`
* **opaque** `unknown`

#### Example 1 - Basic Upgrade Request

```js
import { createServer } from 'http'
import { Client } from 'undici'
import { once } from 'events'

const server = createServer((request, response) => {
  response.statusCode = 101
  response.setHeader('connection', 'upgrade')
  response.setHeader('upgrade', request.headers.upgrade)
  response.end()
}).listen()

await once(server, 'listening')

const client = new Client(`http://localhost:${server.address().port}`)

try {
  const { headers, socket } = await client.upgrade({
    path: '/',
  })
  socket.on('end', () => {
    console.log(`upgrade: ${headers.upgrade}`) // upgrade: Websocket
    client.close()
    server.close()
  })
  socket.end()
} catch (error) {
  console.error(error)
  client.close()
  server.close()
}
```

### `Dispatcher.compose(interceptors[, interceptor])`

Compose a new dispatcher from the current dispatcher and the given interceptors.

> _Notes_:
> - The order of the interceptors matters. The first interceptor will be the first to be called.
> - It is important to note that the `interceptor` function should return a function that follows the `Dispatcher.dispatch` signature.
> - Any fork of the chain of `interceptors` can lead to unexpected results.

Arguments:

* **interceptors** `Interceptor[interceptor[]]`: It is an array of `Interceptor` functions passed as only argument, or several interceptors passed as separate arguments.

Returns: `Dispatcher`.

#### Parameter: `Interceptor`

A function that takes a `dispatch` method and returns a `dispatch`-like function.

#### Example 1 - Basic Compose

```js
const { Client, RedirectHandler } = require('undici')

const redirectInterceptor = dispatch => {
    return (opts, handler) => {
      const { maxRedirections } = opts

      if (!maxRedirections) {
        return dispatch(opts, handler)
      }

      const redirectHandler = new RedirectHandler(
        dispatch,
        maxRedirections,
        opts,
        handler
      )
      opts = { ...opts, maxRedirections: 0 } // Stop sub dispatcher from also redirecting.
      return dispatch(opts, redirectHandler)
    }
}

const client = new Client('http://localhost:3000')
  .compose(redirectInterceptor)

await client.request({ path: '/', method: 'GET' })
```

#### Example 2 - Chained Compose

```js
const { Client, RedirectHandler, RetryHandler } = require('undici')

const redirectInterceptor = dispatch => {
    return (opts, handler) => {
      const { maxRedirections } = opts

      if (!maxRedirections) {
        return dispatch(opts, handler)
      }

      const redirectHandler = new RedirectHandler(
        dispatch,
        maxRedirections,
        opts,
        handler
      )
      opts = { ...opts, maxRedirections: 0 }
      return dispatch(opts, redirectHandler)
    }
}

const retryInterceptor = dispatch => {
  return function retryInterceptor (opts, handler) {
    return dispatch(
      opts,
      new RetryHandler(opts, {
        handler,
        dispatch
      })
    )
  }
}

const client = new Client('http://localhost:3000')
  .compose(redirectInterceptor)
  .compose(retryInterceptor)

await client.request({ path: '/', method: 'GET' })
```

#### Pre-built interceptors

##### `redirect`

The `redirect` interceptor allows you to customize the way your dispatcher handles redirects.

It accepts the same arguments as the [`RedirectHandler` constructor](./RedirectHandler.md).

**Example - Basic Redirect Interceptor**

```js
const { Client, interceptors } = require("undici");
const { redirect } = interceptors;

const client = new Client("http://example.com").compose(
  redirect({ maxRedirections: 3, throwOnMaxRedirects: true })
);
client.request({ path: "/" })
```

##### `retry`

The `retry` interceptor allows you to customize the way your dispatcher handles retries.

It accepts the same arguments as the [`RetryHandler` constructor](./RetryHandler.md).

**Example - Basic Redirect Interceptor**

```js
const { Client, interceptors } = require("undici");
const { retry } = interceptors;

const client = new Client("http://example.com").compose(
  retry({
    maxRetries: 3,
    minTimeout: 1000,
    maxTimeout: 10000,
    timeoutFactor: 2,
    retryAfter: true,
  })
);
```

##### `dump`

The `dump` interceptor enables you to dump the response body from a request upon a given limit.

**Options**
- `maxSize` - The maximum size (in bytes) of the response body to dump. If the size of the request's body exceeds this value then the connection will be closed. Default: `1048576`.

> The `Dispatcher#options` also gets extended with the options `dumpMaxSize`, `abortOnDumped`, and `waitForTrailers` which can be used to configure the interceptor at a request-per-request basis.

**Example - Basic Dump Interceptor**

```js
const { Client, interceptors } = require("undici");
const { dump } = interceptors;

const client = new Client("http://example.com").compose(
  dump({
    maxSize: 1024,
  })
);

// or 
client.dispatch(
  {
    path: "/",
    method: "GET",
    dumpMaxSize: 1024,
  },
  handler
);
```

##### `dns`

The `dns` interceptor enables you to cache DNS lookups for a given duration, per origin.

>It is well suited for scenarios where you want to cache DNS lookups to avoid the overhead of resolving the same domain multiple times

**Options**
- `maxTTL` - The maximum time-to-live (in milliseconds) of the DNS cache. It should be a positive integer. Default: `10000`.
  - Set `0` to disable TTL.
- `maxItems` - The maximum number of items to cache. It should be a positive integer. Default: `Infinity`.
- `dualStack` - Whether to resolve both IPv4 and IPv6 addresses. Default: `true`.
  - It will also attempt a happy-eyeballs-like approach to connect to the available addresses in case of a connection failure.
- `affinity` - Whether to use IPv4 or IPv6 addresses. Default: `4`.
  - It can be either `'4` or `6`.
  - It will only take effect if `dualStack` is `false`.
- `lookup: (hostname: string, options: LookupOptions, callback: (err: NodeJS.ErrnoException | null, addresses: DNSInterceptorRecord[]) => void) => void` - Custom lookup function. Default: `dns.lookup`.
  - For more info see [dns.lookup](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback).
- `pick: (origin: URL, records: DNSInterceptorRecords, affinity: 4 | 6) => DNSInterceptorRecord` - Custom pick function. Default: `RoundRobin`.
  - The function should return a single record from the records array.
  - By default a simplified version of Round Robin is used.
  - The `records` property can be mutated to store the state of the balancing algorithm.

> The `Dispatcher#options` also gets extended with the options `dns.affinity`, `dns.dualStack`, `dns.lookup` and `dns.pick` which can be used to configure the interceptor at a request-per-request basis.


**DNSInterceptorRecord**
It represents a DNS record.
- `family` - (`number`) The IP family of the address. It can be either `4` or `6`.
- `address` - (`string`) The IP address.

**DNSInterceptorOriginRecords**
It represents a map of DNS IP addresses records for a single origin.
- `4.ips` - (`DNSInterceptorRecord[] | null`) The IPv4 addresses.
- `6.ips` - (`DNSInterceptorRecord[] | null`) The IPv6 addresses.

**Example - Basic DNS Interceptor**

```js
const { Client, interceptors } = require("undici");
const { dns } = interceptors;

const client = new Agent().compose([
  dns({ ...opts })
])

const response = await client.request({
  origin: `http://localhost:3030`,
  ...requestOpts
})
```

##### `Response Error Interceptor`

**Introduction**

The Response Error Interceptor is designed to handle HTTP response errors efficiently. It intercepts responses and throws detailed errors for responses with status codes indicating failure (4xx, 5xx). This interceptor enhances error handling by providing structured error information, including response headers, data, and status codes.

**ResponseError Class**

The `ResponseError` class extends the `UndiciError` class and encapsulates detailed error information. It captures the response status code, headers, and data, providing a structured way to handle errors.

**Definition**

```js
class ResponseError extends UndiciError {
  constructor (message, code, { headers, data }) {
    super(message);
    this.name = 'ResponseError';
    this.message = message || 'Response error';
    this.code = 'UND_ERR_RESPONSE';
    this.statusCode = code;
    this.data = data;
    this.headers = headers;
  }
}
```

**Interceptor Handler**

The interceptor's handler class extends `DecoratorHandler` and overrides methods to capture response details and handle errors based on the response status code.

**Methods**

- **onConnect**: Initializes response properties.
- **onHeaders**: Captures headers and status code. Decodes body if content type is `application/json` or `text/plain`.
- **onData**: Appends chunks to the body if status code indicates an error.
- **onComplete**: Finalizes error handling, constructs a `ResponseError`, and invokes the `onError` method.
- **onError**: Propagates errors to the handler.

**Definition**

```js
class Handler extends DecoratorHandler {
  // Private properties
  #handler;
  #statusCode;
  #contentType;
  #decoder;
  #headers;
  #body;

  constructor (opts, { handler }) {
    super(handler);
    this.#handler = handler;
  }

  onConnect (abort) {
    this.#statusCode = 0;
    this.#contentType = null;
    this.#decoder = null;
    this.#headers = null;
    this.#body = '';
    return this.#handler.onConnect(abort);
  }

  onHeaders (statusCode, rawHeaders, resume, statusMessage, headers = parseHeaders(rawHeaders)) {
    this.#statusCode = statusCode;
    this.#headers = headers;
    this.#contentType = headers['content-type'];

    if (this.#statusCode < 400) {
      return this.#handler.onHeaders(statusCode, rawHeaders, resume, statusMessage, headers);
    }

    if (this.#contentType === 'application/json' || this.#contentType === 'text/plain') {
      this.#decoder = new TextDecoder('utf-8');
    }
  }

  onData (chunk) {
    if (this.#statusCode < 400) {
      return this.#handler.onData(chunk);
    }
    this.#body += this.#decoder?.decode(chunk, { stream: true }) ?? '';
  }

  onComplete (rawTrailers) {
    if (this.#statusCode >= 400) {
      this.#body += this.#decoder?.decode(undefined, { stream: false }) ?? '';
      if (this.#contentType === 'application/json') {
        try {
          this.#body = JSON.parse(this.#body);
        } catch {
          // Do nothing...
        }
      }

      let err;
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      try {
        err = new ResponseError('Response Error', this.#statusCode, this.#headers, this.#body);
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }

      this.#handler.onError(err);
    } else {
      this.#handler.onComplete(rawTrailers);
    }
  }

  onError (err) {
    this.#handler.onError(err);
  }
}

module.exports = (dispatch) => (opts, handler) => opts.throwOnError
  ? dispatch(opts, new Handler(opts, { handler }))
  : dispatch(opts, handler);
```

**Tests**

Unit tests ensure the interceptor functions correctly, handling both error and non-error responses appropriately.

**Example Tests**

- **No Error if `throwOnError` is False**:

```js
test('should not error if request is not meant to throw error', async (t) => {
  const opts = { throwOnError: false };
  const handler = { onError: () => {}, onData: () => {}, onComplete: () => {} };
  const interceptor = createResponseErrorInterceptor((opts, handler) => handler.onComplete());
  assert.doesNotThrow(() => interceptor(opts, handler));
});
```

- **Error if Status Code is in Specified Error Codes**:

```js
test('should error if request status code is in the specified error codes', async (t) => {
  const opts = { throwOnError: true, statusCodes: [500] };
  const response = { statusCode: 500 };
  let capturedError;
  const handler = {
    onError: (err) => { capturedError = err; },
    onData: () => {},
    onComplete: () => {}
  };

  const interceptor = createResponseErrorInterceptor((opts, handler) => {
    if (opts.throwOnError && opts.statusCodes.includes(response.statusCode)) {
      handler.onError(new Error('Response Error'));
    } else {
      handler.onComplete();
    }
  });

  interceptor({ ...opts, response }, handler);

  await new Promise(resolve => setImmediate(resolve));

  assert(capturedError, 'Expected error to be captured but it was not.');
  assert.strictEqual(capturedError.message, 'Response Error');
  assert.strictEqual(response.statusCode, 500);
});
```

- **No Error if Status Code is Not in Specified Error Codes**:

```js
test('should not error if request status code is not in the specified error codes', async (t) => {
  const opts = { throwOnError: true, statusCodes: [500] };
  const response = { statusCode: 404 };
  const handler = {
    onError: () => {},
    onData: () => {},
    onComplete: () => {}
  };

  const interceptor = createResponseErrorInterceptor((opts, handler) => {
    if (opts.throwOnError && opts.statusCodes.includes(response.statusCode)) {
      handler.onError(new Error('Response Error'));
    } else {
      handler.onComplete();
    }
  });

  assert.doesNotThrow(() => interceptor({ ...opts, response }, handler));
});
```

**Conclusion**

The Response Error Interceptor provides a robust mechanism for handling HTTP response errors by capturing detailed error information and propagating it through a structured `ResponseError` class. This enhancement improves error handling and debugging capabilities in applications using the interceptor.

## Instance Events

### Event: `'connect'`

Parameters:

* **origin** `URL`
* **targets** `Array<Dispatcher>`

### Event: `'disconnect'`

Parameters:

* **origin** `URL`
* **targets** `Array<Dispatcher>`
* **error** `Error`

Emitted when the dispatcher has been disconnected from the origin.

> **Note**: For HTTP/2, this event is also emitted when the dispatcher has received the [GOAWAY Frame](https://webconcepts.info/concepts/http2-frame-type/0x7) with an Error with the message `HTTP/2: "GOAWAY" frame received` and the code `UND_ERR_INFO`.
> Due to nature of the protocol of using binary frames, it is possible that requests gets hanging as a frame can be received between the `HEADER` and `DATA` frames.
> It is recommended to handle this event and close the dispatcher to create a new HTTP/2 session.

### Event: `'connectionError'`

Parameters:

* **origin** `URL`
* **targets** `Array<Dispatcher>`
* **error** `Error`

Emitted when dispatcher fails to connect to
origin.

### Event: `'drain'`

Parameters:

* **origin** `URL`

Emitted when dispatcher is no longer busy.

## Parameter: `UndiciHeaders`

* `Record<string, string | string[] | undefined> | string[] | Iterable<[string, string | string[] | undefined]> | null`

Header arguments such as `options.headers` in [`Client.dispatch`](Client.md#clientdispatchoptions-handlers) can be specified in three forms:
* As an object specified by the `Record<string, string | string[] | undefined>` (`IncomingHttpHeaders`) type.
* As an array of strings. An array representation of a header list must have an even length, or an `InvalidArgumentError` will be thrown.
* As an iterable that can encompass `Headers`, `Map`, or a custom iterator returning key-value pairs.
Keys are lowercase and values are not modified.

Response headers will derive a `host` from the `url` of the [Client](Client.md#class-client) instance if no `host` header was previously specified.

### Example 1 - Object

```js
{
  'content-length': '123',
  'content-type': 'text/plain',
  connection: 'keep-alive',
  host: 'mysite.com',
  accept: '*/*'
}
```

### Example 2 - Array

```js
[
  'content-length', '123',
  'content-type', 'text/plain',
  'connection', 'keep-alive',
  'host', 'mysite.com',
  'accept', '*/*'
]
```

### Example 3 - Iterable

```js
new Headers({
  'content-length': '123',
  'content-type': 'text/plain',
  connection: 'keep-alive',
  host: 'mysite.com',
  accept: '*/*'
})
```
or
```js
new Map([
  ['content-length', '123'],
  ['content-type', 'text/plain'],
  ['connection', 'keep-alive'],
  ['host', 'mysite.com'],
  ['accept', '*/*']
])
```
or
```js
{
  *[Symbol.iterator] () {
    yield ['content-length', '123']
    yield ['content-type', 'text/plain']
    yield ['connection', 'keep-alive']
    yield ['host', 'mysite.com']
    yield ['accept', '*/*']
  }
}
```
