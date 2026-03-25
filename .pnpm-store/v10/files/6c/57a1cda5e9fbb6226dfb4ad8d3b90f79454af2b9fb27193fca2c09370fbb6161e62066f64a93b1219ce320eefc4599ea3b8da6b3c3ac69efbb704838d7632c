# Class: ProxyAgent

Extends: `undici.Dispatcher`

A Proxy Agent class that implements the Agent API. It allows the connection through proxy in a simple way.

## `new ProxyAgent([options])`

Arguments:

* **options** `ProxyAgentOptions` (required) - It extends the `Agent` options.

Returns: `ProxyAgent`

### Parameter: `ProxyAgentOptions`

Extends: [`AgentOptions`](/docs/docs/api/Agent.md#parameter-agentoptions)
> It ommits `AgentOptions#connect`.

> **Note:** When `AgentOptions#connections` is set, and different from `0`, the non-standard [`proxy-connection` header](https://udger.com/resources/http-request-headers-detail?header=Proxy-Connection) will be set to `keep-alive` in the request.

* **uri** `string | URL` (required) - The URI of the proxy server.  This can be provided as a string, as an instance of the URL class, or as an object with a `uri` property of type string.
If the `uri` is provided as a string or `uri` is an object with an `uri` property of type string, then it will be parsed into a `URL` object according to the [WHATWG URL Specification](https://url.spec.whatwg.org).
For detailed information on the parsing process and potential validation errors, please refer to the ["Writing" section](https://url.spec.whatwg.org/#writing) of the WHATWG URL Specification.
* **token** `string` (optional) - It can be passed by a string of token for authentication.
* **auth** `string` (**deprecated**) - Use token.
* **clientFactory** `(origin: URL, opts: Object) => Dispatcher` (optional) - Default: `(origin, opts) => new Pool(origin, opts)`
* **requestTls** `BuildOptions` (optional) - Options object passed when creating the underlying socket via the connector builder for the request. It extends from [`Client#ConnectOptions`](/docs/docs/api/Client.md#parameter-connectoptions).
* **proxyTls** `BuildOptions` (optional) - Options object passed when creating the underlying socket via the connector builder for the proxy server. It extends from [`Client#ConnectOptions`](/docs/docs/api/Client.md#parameter-connectoptions).
* **proxyTunnel** `boolean` (optional) - For connections involving secure protocols, Undici will always establish a tunnel via the HTTP2  CONNECT extension. If proxyTunnel is set to true, this will occur for unsecured proxy/endpoint connections as well. Currently, there is no way to facilitate HTTP1 IP tunneling as described in https://www.rfc-editor.org/rfc/rfc9484.html#name-http-11-request. If proxyTunnel is set to false (the default), ProxyAgent connections where both the Proxy and Endpoint are unsecured will issue all requests to the Proxy, and prefix the endpoint request path with the endpoint origin address.

Examples:

```js
import { ProxyAgent } from 'undici'

const proxyAgent = new ProxyAgent('my.proxy.server')
// or
const proxyAgent = new ProxyAgent(new URL('my.proxy.server'))
// or
const proxyAgent = new ProxyAgent({ uri: 'my.proxy.server' })
// or
const proxyAgent = new ProxyAgent({
  uri: new URL('my.proxy.server'),
  proxyTls: {
    signal: AbortSignal.timeout(1000)
  }
})
```

#### Example - Basic ProxyAgent instantiation

This will instantiate the ProxyAgent. It will not do anything until registered as the agent to use with requests.

```js
import { ProxyAgent } from 'undici'

const proxyAgent = new ProxyAgent('my.proxy.server')
```

#### Example - Basic Proxy Request with global agent dispatcher

```js
import { setGlobalDispatcher, request, ProxyAgent } from 'undici'

const proxyAgent = new ProxyAgent('my.proxy.server')
setGlobalDispatcher(proxyAgent)

const { statusCode, body } = await request('http://localhost:3000/foo')

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - Basic Proxy Request with local agent dispatcher

```js
import { ProxyAgent, request } from 'undici'

const proxyAgent = new ProxyAgent('my.proxy.server')

const {
  statusCode,
  body
} = await request('http://localhost:3000/foo', { dispatcher: proxyAgent })

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - Basic Proxy Request with authentication

```js
import { setGlobalDispatcher, request, ProxyAgent } from 'undici';

const proxyAgent = new ProxyAgent({
  uri: 'my.proxy.server',
  // token: 'Bearer xxxx'
  token: `Basic ${Buffer.from('username:password').toString('base64')}`
});
setGlobalDispatcher(proxyAgent);

const { statusCode, body } = await request('http://localhost:3000/foo');

console.log('response received', statusCode); // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')); // data foo
}
```

### `ProxyAgent.close()`

Closes the proxy agent and waits for registered pools and clients to also close before resolving.

Returns: `Promise<void>`

#### Example - clean up after tests are complete

```js
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const proxyAgent = new ProxyAgent('my.proxy.server')
setGlobalDispatcher(proxyAgent)

await proxyAgent.close()
```

### `ProxyAgent.dispatch(options, handlers)`

Implements [`Agent.dispatch(options, handlers)`](/docs/docs/api/Agent.md#parameter-agentdispatchoptions).

### `ProxyAgent.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](/docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback).


#### Example - ProxyAgent with Fetch

This example demonstrates how to use `fetch` with a proxy via `ProxyAgent`. It is particularly useful for scenarios requiring proxy tunneling.

```javascript
import { ProxyAgent, fetch } from 'undici';

// Define the ProxyAgent
const proxyAgent = new ProxyAgent('http://localhost:8000');

// Make a GET request through the proxy
const response = await fetch('http://localhost:3000/foo', {
  dispatcher: proxyAgent,
  method: 'GET',
});

console.log('Response status:', response.status);
console.log('Response data:', await response.text());
```

---

#### Example - ProxyAgent with a Custom Proxy Server

This example shows how to create a custom proxy server and use it with `ProxyAgent`.

```javascript
import * as http from 'node:http';
import { createProxy } from 'proxy';
import { ProxyAgent, fetch } from 'undici';

// Create a proxy server
const proxyServer = createProxy(http.createServer());
proxyServer.listen(8000, () => {
  console.log('Proxy server running on port 8000');
});

// Define and use the ProxyAgent
const proxyAgent = new ProxyAgent('http://localhost:8000');

const response = await fetch('http://example.com', {
  dispatcher: proxyAgent,
  method: 'GET',
});

console.log('Response status:', response.status);
console.log('Response data:', await response.text());
```

---

#### Example - ProxyAgent with HTTPS Tunneling

This example demonstrates how to perform HTTPS tunneling using a proxy.

```javascript
import { ProxyAgent, fetch } from 'undici';

// Define a ProxyAgent for HTTPS proxy
const proxyAgent = new ProxyAgent('https://secure.proxy.server');

// Make a request to an HTTPS endpoint via the proxy
const response = await fetch('https://secure.endpoint.com/api/data', {
  dispatcher: proxyAgent,
  method: 'GET',
});

console.log('Response status:', response.status);
console.log('Response data:', await response.json());
```

#### Example - ProxyAgent as a Global Dispatcher

`ProxyAgent` can be configured as a global dispatcher, making it available for all requests without explicitly passing it. This simplifies code and is useful when a single proxy configuration applies to all requests.

```javascript
import { ProxyAgent, setGlobalDispatcher, fetch } from 'undici';

// Define and configure the ProxyAgent
const proxyAgent = new ProxyAgent('http://localhost:8000');
setGlobalDispatcher(proxyAgent);

// Make requests without specifying the dispatcher
const response = await fetch('http://example.com');
console.log('Response status:', response.status);
console.log('Response data:', await response.text());
