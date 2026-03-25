# Class: BalancedPool

Extends: `undici.Dispatcher`

A pool of [Pool](/docs/docs/api/Pool.md) instances connected to multiple upstreams.

Requests are not guaranteed to be dispatched in order of invocation.

## `new BalancedPool(upstreams [, options])`

Arguments:

* **upstreams** `URL | string | string[]` - It should only include the **protocol, hostname, and port**.
* **options** `BalancedPoolOptions` (optional)

### Parameter: `BalancedPoolOptions`

Extends: [`PoolOptions`](/docs/docs/api/Pool.md#parameter-pooloptions)

* **factory** `(origin: URL, opts: Object) => Dispatcher` - Default: `(origin, opts) => new Pool(origin, opts)`

The `PoolOptions` are passed to each of the `Pool` instances being created.
## Instance Properties

### `BalancedPool.upstreams`

Returns an array of upstreams that were previously added.

### `BalancedPool.closed`

Implements [Client.closed](/docs/docs/api/Client.md#clientclosed)

### `BalancedPool.destroyed`

Implements [Client.destroyed](/docs/docs/api/Client.md#clientdestroyed)

### `Pool.stats`

Returns [`PoolStats`](/docs/docs/api/PoolStats.md) instance for this pool.

## Instance Methods

### `BalancedPool.addUpstream(upstream)`

Add an upstream.

Arguments:

* **upstream** `string` - It should only include the **protocol, hostname, and port**.

### `BalancedPool.removeUpstream(upstream)`

Removes an upstream that was previously added.

### `BalancedPool.close([callback])`

Implements [`Dispatcher.close([callback])`](/docs/docs/api/Dispatcher.md#dispatcherclosecallback-promise).

### `BalancedPool.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](/docs/docs/api/Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `BalancedPool.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherconnectoptions-callback).

### `BalancedPool.dispatch(options, handlers)`

Implements [`Dispatcher.dispatch(options, handlers)`](/docs/docs/api/Dispatcher.md#dispatcherdispatchoptions-handler).

### `BalancedPool.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](/docs/docs/api/Dispatcher.md#dispatcherpipelineoptions-handler).

### `BalancedPool.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](/docs/docs/api/Dispatcher.md#dispatcherrequestoptions-callback).

### `BalancedPool.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `BalancedPool.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](/docs/docs/api/Dispatcher.md#dispatcherupgradeoptions-callback).

## Instance Events

### Event: `'connect'`

See [Dispatcher Event: `'connect'`](/docs/docs/api/Dispatcher.md#event-connect).

### Event: `'disconnect'`

See [Dispatcher Event: `'disconnect'`](/docs/docs/api/Dispatcher.md#event-disconnect).

### Event: `'drain'`

See [Dispatcher Event: `'drain'`](/docs/docs/api/Dispatcher.md#event-drain).
