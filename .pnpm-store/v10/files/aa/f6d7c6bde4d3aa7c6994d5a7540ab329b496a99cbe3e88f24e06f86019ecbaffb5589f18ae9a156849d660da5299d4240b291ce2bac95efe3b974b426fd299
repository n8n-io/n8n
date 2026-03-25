# Class: RoundRobinPool

Extends: `undici.Dispatcher`

A pool of [Client](/docs/docs/api/Client.md) instances connected to the same upstream target with round-robin client selection.

Unlike [`Pool`](/docs/docs/api/Pool.md), which always selects the first available client, `RoundRobinPool` cycles through clients in a round-robin fashion. This ensures even distribution of requests across all connections, which is particularly useful when the upstream target is behind a load balancer that round-robins TCP connections across multiple backend servers (e.g., Kubernetes Services).

Requests are not guaranteed to be dispatched in order of invocation.

## `new RoundRobinPool(url[, options])`

Arguments:

* **url** `URL | string` - It should only include the **protocol, hostname, and port**.
* **options** `RoundRobinPoolOptions` (optional)

### Parameter: `RoundRobinPoolOptions`

Extends: [`ClientOptions`](/docs/docs/api/Client.md#parameter-clientoptions)

* **factory** `(origin: URL, opts: Object) => Dispatcher` - Default: `(origin, opts) => new Client(origin, opts)`
* **connections** `number | null` (optional) - Default: `null` - The number of `Client` instances to create. When set to `null`, the `RoundRobinPool` instance will create an unlimited amount of `Client` instances.
* **clientTtl** `number | null` (optional) - Default: `null` - The amount of time before a `Client` instance is removed from the `RoundRobinPool` and closed. When set to `null`, `Client` instances will not be removed or closed based on age.

## Use Case

`RoundRobinPool` is designed for scenarios where:

1. You connect to a single origin (e.g., `http://my-service.namespace.svc`)
2. That origin is backed by a load balancer distributing TCP connections across multiple servers
3. You want requests evenly distributed across all backend servers

**Example**: In Kubernetes, when using a Service DNS name with multiple Pod replicas, kube-proxy load balances TCP connections. `RoundRobinPool` ensures each connection (and thus each Pod) receives an equal share of requests.

### Important: Backend Distribution Considerations

`RoundRobinPool` distributes **HTTP requests** evenly across **TCP connections**. Whether this translates to even backend server distribution depends on the load balancer's behavior:

**✓ Works when the load balancer**:
- Assigns different backends to different TCP connections from the same client
- Uses algorithms like: round-robin, random, least-connections (without client affinity)
- Example: Default Kubernetes Services without `sessionAffinity`

**✗ Does NOT work when**:
- Load balancer has client/source IP affinity (all connections from one IP → same backend)
- Load balancer uses source-IP-hash or sticky sessions

**How it works:**
1. `RoundRobinPool` creates N TCP connections to the load balancer endpoint
2. Load balancer assigns each TCP connection to a backend (per its algorithm)
3. `RoundRobinPool` cycles HTTP requests across those N connections
4. Result: Requests distributed proportionally to how the LB distributed the connections

If the load balancer assigns all connections to the same backend (e.g., due to session affinity), `RoundRobinPool` cannot overcome this. In such cases, consider using [`BalancedPool`](/docs/docs/api/BalancedPool.md) with direct backend addresses (e.g., individual pod IPs) instead of a load-balanced endpoint.

## Instance Properties

### `RoundRobinPool.closed`

Implements [Client.closed](/docs/docs/api/Client.md#clientclosed)

### `RoundRobinPool.destroyed`

Implements [Client.destroyed](/docs/docs/api/Client.md#clientdestroyed)

### `RoundRobinPool.stats`

Returns [`PoolStats`](PoolStats.md) instance for this pool.

## Instance Methods

### `RoundRobinPool.close([callback])`

Implements [`Dispatcher.close([callback])`](/docs/docs/api/Dispatcher.md#dispatcherclosecallback-promise).

### `RoundRobinPool.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](/docs/docs/api/Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `RoundRobinPool.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherconnectoptions-callback).

### `RoundRobinPool.dispatch(options, handler)`

Implements [`Dispatcher.dispatch(options, handler)`](/docs/docs/api/Dispatcher.md#dispatcherdispatchoptions-handler).

### `RoundRobinPool.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](/docs/docs/api/Dispatcher.md#dispatcherpipelineoptions-handler).

### `RoundRobinPool.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](/docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback).

### `RoundRobinPool.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `RoundRobinPool.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherupgradeoptions-callback).

## Instance Events

### Event: `'connect'`

See [Dispatcher Event: `'connect'`](/docs/docs/api/Dispatcher.md#event-connect).

### Event: `'disconnect'`

See [Dispatcher Event: `'disconnect'`](/docs/docs/api/Dispatcher.md#event-disconnect).

### Event: `'drain'`

See [Dispatcher Event: `'drain'`](/docs/docs/api/Dispatcher.md#event-drain).

## Example

```javascript
import { RoundRobinPool } from 'undici'

const pool = new RoundRobinPool('http://my-service.default.svc.cluster.local', {
  connections: 10
})

// Requests will be distributed evenly across all 10 connections
for (let i = 0; i < 100; i++) {
  const { body } = await pool.request({
    path: '/api/data',
    method: 'GET'
  })
  console.log(await body.json())
}

await pool.close()
```

## See Also

- [Pool](/docs/docs/api/Pool.md) - Connection pool without round-robin
- [BalancedPool](/docs/docs/api/BalancedPool.md) - Load balancing across multiple origins
- [Issue #3648](https://github.com/nodejs/undici/issues/3648) - Original issue describing uneven distribution

