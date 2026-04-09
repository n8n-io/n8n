# Class: Socks5ProxyAgent

Extends: `undici.Dispatcher`

A SOCKS5 proxy wrapper class that implements the Dispatcher API. It enables HTTP requests to be routed through a SOCKS5 proxy server, providing connection tunneling and authentication support.

## `new Socks5ProxyAgent(proxyUrl[, options])`

Arguments:

* **proxyUrl** `string | URL` (required) - The SOCKS5 proxy server URL. Must use `socks5://` or `socks://` protocol.
* **options** `Socks5ProxyAgent.Options` (optional) - Additional configuration options.

Returns: `Socks5ProxyAgent`

### Parameter: `Socks5ProxyAgent.Options`

Extends: [`PoolOptions`](/docs/docs/api/Pool.md#parameter-pooloptions)

* **headers** `IncomingHttpHeaders` (optional) - Additional headers to send with proxy connections.
* **username** `string` (optional) - SOCKS5 proxy username for authentication. Can also be provided in the proxy URL.
* **password** `string` (optional) - SOCKS5 proxy password for authentication. Can also be provided in the proxy URL.
* **connect** `Function` (optional) - Custom connector function for the proxy connection.
* **proxyTls** `BuildOptions` (optional) - TLS options for the proxy connection (when using SOCKS5 over TLS).

Examples:

```js
import { Socks5ProxyAgent } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')
// or with authentication
const socks5ProxyWithAuth = new Socks5ProxyAgent('socks5://user:pass@localhost:1080')
// or with options
const socks5ProxyWithOptions = new Socks5ProxyAgent('socks5://localhost:1080', {
  username: 'user',
  password: 'pass',
  connections: 10
})
```

#### Example - Basic SOCKS5 Proxy instantiation

This will instantiate the Socks5ProxyAgent. It will not do anything until registered as the dispatcher to use with requests.

```js
import { Socks5ProxyAgent } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')
```

#### Example - Basic SOCKS5 Proxy Request with global dispatcher

```js
import { setGlobalDispatcher, request, Socks5ProxyAgent } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')
setGlobalDispatcher(socks5Proxy)

const { statusCode, body } = await request('http://localhost:3000/foo')

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - Basic SOCKS5 Proxy Request with local dispatcher

```js
import { Socks5ProxyAgent, request } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')

const {
  statusCode,
  body
} = await request('http://localhost:3000/foo', { dispatcher: socks5Proxy })

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - SOCKS5 Proxy Request with authentication

```js
import { setGlobalDispatcher, request, Socks5ProxyAgent } from 'undici'

// Authentication via URL
const socks5Proxy = new Socks5ProxyAgent('socks5://username:password@localhost:1080')

// Or authentication via options
// const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080', {
//   username: 'username',
//   password: 'password'
// })

setGlobalDispatcher(socks5Proxy)

const { statusCode, body } = await request('http://localhost:3000/foo')

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - SOCKS5 Proxy with HTTPS requests

SOCKS5 proxy supports both HTTP and HTTPS requests through tunneling:

```js
import { Socks5ProxyAgent, request } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')

const response = await request('https://api.example.com/data', {
  dispatcher: socks5Proxy,
  method: 'GET'
})

console.log('Response status:', response.statusCode)
console.log('Response data:', await response.body.json())
```

#### Example - SOCKS5 Proxy with Fetch

```js
import { Socks5ProxyAgent, fetch } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')

const response = await fetch('http://localhost:3000/api/users', {
  dispatcher: socks5Proxy,
  method: 'GET'
})

console.log('Response status:', response.status)
console.log('Response data:', await response.text())
```

#### Example - Connection Pooling

SOCKS5ProxyWrapper automatically manages connection pooling for better performance:

```js
import { Socks5ProxyAgent, request } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080', {
  connections: 10, // Allow up to 10 concurrent connections
  pipelining: 1    // Enable HTTP/1.1 pipelining
})

// Multiple requests will reuse connections through the SOCKS5 tunnel
const responses = await Promise.all([
  request('http://api.example.com/endpoint1', { dispatcher: socks5Proxy }),
  request('http://api.example.com/endpoint2', { dispatcher: socks5Proxy }),
  request('http://api.example.com/endpoint3', { dispatcher: socks5Proxy })
])

console.log('All requests completed through the same SOCKS5 proxy')
```

### `Socks5ProxyAgent.close()`

Closes the SOCKS5 proxy wrapper and waits for all underlying pools and connections to close before resolving.

Returns: `Promise<void>`

#### Example - clean up after tests are complete

```js
import { Socks5ProxyAgent, setGlobalDispatcher } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')
setGlobalDispatcher(socks5Proxy)

// ... make requests

await socks5Proxy.close()
```

### `Socks5ProxyAgent.destroy([err])`

Destroys the SOCKS5 proxy wrapper and all underlying connections immediately.

Arguments:
* **err** `Error` (optional) - The error that caused the destruction.

Returns: `Promise<void>`

#### Example - force close all connections

```js
import { Socks5ProxyAgent } from 'undici'

const socks5Proxy = new Socks5ProxyAgent('socks5://localhost:1080')

// Force close all connections
await socks5Proxy.destroy()
```

### `Socks5ProxyAgent.dispatch(options, handlers)`

Implements [`Dispatcher.dispatch(options, handlers)`](/docs/docs/api/Dispatcher.md#dispatcherdispatchoptions-handlers).

### `Socks5ProxyAgent.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](/docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback).

## Debugging

SOCKS5 proxy connections can be debugged using Node.js diagnostics:

```sh
NODE_DEBUG=undici:socks5 node script.js
```

This will output detailed information about the SOCKS5 handshake, authentication, and connection establishment.

## SOCKS5 Protocol Support

The Socks5ProxyAgent supports the following SOCKS5 features:

### Authentication Methods

- **No Authentication** (`0x00`) - For public or internal proxies
- **Username/Password** (`0x02`) - RFC 1929 authentication

### Address Types

- **IPv4** (`0x01`) - Standard IPv4 addresses
- **Domain Name** (`0x03`) - Domain names (recommended for flexibility)
- **IPv6** (`0x04`) - IPv6 addresses (full support for standard and compressed notation)

### Commands

- **CONNECT** (`0x01`) - Establish TCP connection (primary use case for HTTP)

### Error Handling

The wrapper handles various SOCKS5 error conditions:

- Connection refused by proxy
- Authentication failures
- Network unreachable
- Host unreachable
- Unsupported address types or commands

## Performance Considerations

- **Connection Pooling**: Automatically pools connections through the SOCKS5 tunnel for better performance
- **HTTP/1.1 Pipelining**: Supports pipelining when enabled
- **DNS Resolution**: Domain names are resolved by the SOCKS5 proxy, reducing local DNS queries
- **TLS Termination**: HTTPS connections are encrypted end-to-end, with the SOCKS5 proxy only handling the TCP tunnel

## Security Notes

1. **Authentication**: Credentials are sent to the SOCKS5 proxy in plaintext unless using SOCKS5 over TLS
2. **DNS Leaks**: All DNS resolution happens on the proxy server, preventing DNS leaks
3. **End-to-end Encryption**: HTTPS traffic remains encrypted between client and final destination
4. **Connection Security**: Consider using authenticated proxies and secure networks

## Compatibility

- **Protocol**: SOCKS5 (RFC 1928) with Username/Password Authentication (RFC 1929)
- **Transport**: TCP only (UDP support not implemented)
- **Node.js**: Compatible with all supported Node.js versions
- **HTTP Versions**: Works with HTTP/1.1 and HTTP/2 over the tunnel