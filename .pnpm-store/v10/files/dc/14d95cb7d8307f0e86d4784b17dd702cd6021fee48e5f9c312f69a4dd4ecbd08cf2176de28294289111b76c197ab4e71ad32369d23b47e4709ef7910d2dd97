# Agent

Extends: `undici.Dispatcher`

Agent allow dispatching requests against multiple different origins.

Requests are not guaranteed to be dispatched in order of invocation.

## `new undici.Agent([options])`

Arguments:

* **options** `AgentOptions` (optional)

Returns: `Agent`

### Parameter: `AgentOptions`

Extends: [`PoolOptions`](Pool.md#parameter-pooloptions)

* **factory** `(origin: URL, opts: Object) => Dispatcher` - Default: `(origin, opts) => new Pool(origin, opts)`
* **maxRedirections** `Integer` - Default: `0`. The number of HTTP redirection to follow unless otherwise specified in `DispatchOptions`.
* **interceptors** `{ Agent: DispatchInterceptor[] }` - Default: `[RedirectInterceptor]` - A list of interceptors that are applied to the dispatch method. Additional logic can be applied (such as, but not limited to: 302 status code handling, authentication, cookies, compression and caching). Note that the behavior of interceptors is Experimental and might change at any given time.

## Instance Properties

### `Agent.closed`

Implements [Client.closed](Client.md#clientclosed)

### `Agent.destroyed`

Implements [Client.destroyed](Client.md#clientdestroyed)

## Instance Methods

### `Agent.close([callback])`

Implements [`Dispatcher.close([callback])`](Dispatcher.md#dispatcherclosecallback-promise).

### `Agent.destroy([error, callback])`

Implements [`Dispatcher.destroy([error, callback])`](Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `Agent.dispatch(options, handler: AgentDispatchOptions)`

Implements [`Dispatcher.dispatch(options, handler)`](Dispatcher.md#dispatcherdispatchoptions-handler).

#### Parameter: `AgentDispatchOptions`

Extends: [`DispatchOptions`](Dispatcher.md#parameter-dispatchoptions)

* **origin** `string | URL`
* **maxRedirections** `Integer`.

Implements [`Dispatcher.destroy([error, callback])`](Dispatcher.md#dispatcherdestroyerror-callback-promise).

### `Agent.connect(options[, callback])`

See [`Dispatcher.connect(options[, callback])`](Dispatcher.md#dispatcherconnectoptions-callback).

### `Agent.dispatch(options, handler)`

Implements [`Dispatcher.dispatch(options, handler)`](Dispatcher.md#dispatcherdispatchoptions-handler).

### `Agent.pipeline(options, handler)`

See [`Dispatcher.pipeline(options, handler)`](Dispatcher.md#dispatcherpipelineoptions-handler).

### `Agent.request(options[, callback])`

See [`Dispatcher.request(options [, callback])`](Dispatcher.md#dispatcherrequestoptions-callback).

### `Agent.stream(options, factory[, callback])`

See [`Dispatcher.stream(options, factory[, callback])`](Dispatcher.md#dispatcherstreamoptions-factory-callback).

### `Agent.upgrade(options[, callback])`

See [`Dispatcher.upgrade(options[, callback])`](Dispatcher.md#dispatcherupgradeoptions-callback).
