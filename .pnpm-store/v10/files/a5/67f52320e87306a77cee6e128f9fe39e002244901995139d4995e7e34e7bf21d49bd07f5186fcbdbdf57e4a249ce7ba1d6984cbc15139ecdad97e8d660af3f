# Class: EnvHttpProxyAgent

Stability: Experimental.

Extends: `undici.Dispatcher`

EnvHttpProxyAgent automatically reads the proxy configuration from the environment variables `http_proxy`, `https_proxy`, and `no_proxy` and sets up the proxy agents accordingly. When `http_proxy` and `https_proxy` are set, `http_proxy` is used for HTTP requests and `https_proxy` is used for HTTPS requests. If only `http_proxy` is set, `http_proxy` is used for both HTTP and HTTPS requests. If only `https_proxy` is set, it is only used for HTTPS requests.

`no_proxy` is a comma or space-separated list of hostnames that should not be proxied. The list may contain leading wildcard characters (`*`). If `no_proxy` is set, the EnvHttpProxyAgent will bypass the proxy for requests to hosts that match the list. If `no_proxy` is set to `"*"`, the EnvHttpProxyAgent will bypass the proxy for all requests.

Uppercase environment variables are also supported: `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`. However, if both the lowercase and uppercase environment variables are set, the uppercase environment variables will be ignored.

## `new EnvHttpProxyAgent([options])`

Arguments:

* **options** `EnvHttpProxyAgentOptions` (optional) - extends the `Agent` options.

Returns: `EnvHttpProxyAgent`

### Parameter: `EnvHttpProxyAgentOptions`

Extends: [`AgentOptions`](Agent.md#parameter-agentoptions)

* **httpProxy** `string` (optional) - When set, it will override the `HTTP_PROXY` environment variable.
* **httpsProxy** `string` (optional) - When set, it will override the `HTTPS_PROXY` environment variable.
* **noProxy** `string` (optional) - When set, it will override the `NO_PROXY` environment variable.

Examples:

```js
import { EnvHttpProxyAgent } from 'undici'

const envHttpProxyAgent = new EnvHttpProxyAgent()
// or
const envHttpProxyAgent = new EnvHttpProxyAgent({ httpProxy: 'my.proxy.server:8080', httpsProxy: 'my.proxy.server:8443', noProxy: 'localhost' })
```

#### Example - EnvHttpProxyAgent instantiation

This will instantiate the EnvHttpProxyAgent. It will not do anything until registered as the agent to use with requests.

```js
import { EnvHttpProxyAgent } from 'undici'

const envHttpProxyAgent = new EnvHttpProxyAgent()
```

#### Example - Basic Proxy Fetch with global agent dispatcher

```js
import { setGlobalDispatcher, fetch, EnvHttpProxyAgent } from 'undici'

const envHttpProxyAgent = new EnvHttpProxyAgent()
setGlobalDispatcher(envHttpProxyAgent)

const { status, json } = await fetch('http://localhost:3000/foo')

console.log('response received', status) // response received 200

const data = await json() // data { foo: "bar" }
```

#### Example - Basic Proxy Request with global agent dispatcher

```js
import { setGlobalDispatcher, request, EnvHttpProxyAgent } from 'undici'

const envHttpProxyAgent = new EnvHttpProxyAgent()
setGlobalDispatcher(envHttpProxyAgent)

const { statusCode, body } = await request('http://localhost:3000/foo')

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - Basic Proxy Request with local agent dispatcher

```js
import { EnvHttpProxyAgent, request } from 'undici'

const envHttpProxyAgent = new EnvHttpProxyAgent()

const {
  statusCode,
  body
} = await request('http://localhost:3000/foo', { dispatcher: envHttpProxyAgent })

console.log('response received', statusCode) // response received 200

for await (const data of body) {
  console.log('data', data.toString('utf8')) // data foo
}
```

#### Example - Basic Proxy Fetch with local agent dispatcher

```js
import { EnvHttpProxyAgent, fetch } from 'undici'

const envHttpProxyAgent = new EnvHttpProxyAgent()

const {
  status,
  json
} = await fetch('http://localhost:3000/foo', { dispatcher: envHttpProxyAgent })

console.log('response received', status) // response received 200

const data = await json() // data { foo: "bar" }
```

## Instance Methods

### `EnvHttpProxyAgent.close([callback])`

Implements [`Dispatcher.close([callback])`](Dispatcher.md#dispatcherclosecallback-promise).

### `EnvHttpProxyAgent.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `EnvHttpProxyAgent.dispatch(options, handler: AgentDispatchOptions)`

Implements [`Dispatcher.dispatch(options, handler)`](Dispatcher.md#dispatcherdispatchoptions-handler).

#### Parameter: `AgentDispatchOptions`

Extends: [`DispatchOptions`](Dispatcher.md#parameter-dispatchoptions)

* **origin** `string | URL`
* **maxRedirections** `Integer`.

Implements [`Dispatcher.destroy([error, callback])`](Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `EnvHttpProxyAgent.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](Dispatcher.md#dispatcherconnectoptions-callback).

### `EnvHttpProxyAgent.dispatch(options, handler)`

Implements [`Dispatcher.dispatch(options, handler)`](Dispatcher.md#dispatcherdispatchoptions-handler).

### `EnvHttpProxyAgent.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](Dispatcher.md#dispatcherpipelineoptions-handler).

### `EnvHttpProxyAgent.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](Dispatcher.md#dispatcherrequestoptions-callback).

### `EnvHttpProxyAgent.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `EnvHttpProxyAgent.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](Dispatcher.md#dispatcherupgradeoptions-callback).
