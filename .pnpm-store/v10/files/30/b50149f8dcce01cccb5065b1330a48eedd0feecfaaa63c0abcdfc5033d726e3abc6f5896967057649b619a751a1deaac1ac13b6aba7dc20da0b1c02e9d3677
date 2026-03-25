# Class: BalancedPool

Extends: `undici.Dispatcher`

A pool of [Pool](Pool.md) instances connected to multiple upstreams.

Requests are not guaranteed to be dispatched in order of invocation.

## `new BalancedPool(upstreams [, options])`

Arguments:

* **upstreams** `URL | string | string[]` - It should only include the **protocol, hostname, and port**.
* **options** `BalancedPoolOptions` (optional)

### Parameter: `BalancedPoolOptions`

Extends: [`PoolOptions`](Pool.md#parameter-pooloptions)

* **factory** `(origin: URL, opts: Object) => Dispatcher` - Default: `(origin, opts) => new Pool(origin, opts)`

The `PoolOptions` are passed to each of the `Pool` instances being created.
## Instance Properties

### `BalancedPool.upstreams`

Returns an array of upstreams that were previously added.

### `BalancedPool.closed`

Implements [Client.closed](Client.md#clientclosed)

### `BalancedPool.destroyed`

Implements [Client.destroyed](Client.md#clientdestroyed)

### `Pool.stats`

Returns [`PoolStats`](PoolStats.md) instance for this pool.

## Instance Methods

### `BalancedPool.addUpstream(upstream)`

Add an upstream.

Arguments:

* **upstream** `string` - It should only include the **protocol, hostname, and port**.

### `BalancedPool.removeUpstream(upstream)`

Removes an upstream that was previously added.

### `BalancedPool.close([callback])`

Implements [`Dispatcher.close([callback])`](Dispatcher.md#dispatcherclosecallback-promise).

### `BalancedPool.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `BalancedPool.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](Dispatcher.md#dispatcherconnectoptions-callback).

### `BalancedPool.dispatch(options, handlers)`

Implements [`Dispatcher.dispatch(options, handlers)`](Dispatcher.md#dispatcherdispatchoptions-handler).

### `BalancedPool.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](Dispatcher.md#dispatcherpipelineoptions-handler).

### `BalancedPool.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](Dispatcher.md#dispatcherrequestoptions-callback).

### `BalancedPool.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `BalancedPool.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](Dispatcher.md#dispatcherupgradeoptions-callback).

## Instance Events

### Event: `'connect'`

See [Dispatcher Event: `'connect'`](Dispatcher.md#event-connect).

### Event: `'disconnect'`

See [Dispatcher Event: `'disconnect'`](Dispatcher.md#event-disconnect).

### Event: `'drain'`

See [Dispatcher Event: `'drain'`](Dispatcher.md#event-drain).
