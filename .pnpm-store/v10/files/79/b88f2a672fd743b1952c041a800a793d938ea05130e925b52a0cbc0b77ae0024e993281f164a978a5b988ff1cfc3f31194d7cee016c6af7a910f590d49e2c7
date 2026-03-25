# Cache Store

A Cache Store is responsible for storing and retrieving cached responses.
It is also responsible for deciding which specific response to use based off of
a response's `Vary` header (if present). It is expected to be compliant with
[RFC-9111](https://www.rfc-editor.org/rfc/rfc9111.html).

## Pre-built Cache Stores

### `MemoryCacheStore`

The `MemoryCacheStore` stores the responses in-memory.

**Options**

- `maxSize` - The maximum total size in bytes of all stored responses. Default `104857600` (100MB).
- `maxCount` - The maximum amount of responses to store. Default `1024`.
- `maxEntrySize` - The maximum size in bytes that a response's body can be. If a response's body is greater than or equal to this, the response will not be cached. Default `5242880` (5MB).

### Getters

#### `MemoryCacheStore.size`

Returns the current total size in bytes of all stored responses.

### Methods

#### `MemoryCacheStore.isFull()`

Returns a boolean indicating whether the cache has reached its maximum size or count.

### Events

#### `'maxSizeExceeded'`

Emitted when the cache exceeds its maximum size or count limits. The event payload contains `size`, `maxSize`, `count`, and `maxCount` properties.


### `SqliteCacheStore`

The `SqliteCacheStore` stores the responses in a SQLite database.
Under the hood, it uses Node.js' [`node:sqlite`](https://nodejs.org/api/sqlite.html) api.
The `SqliteCacheStore` is only exposed if the `node:sqlite` api is present.

**Options**

- `location` - The location of the SQLite database to use. Default `:memory:`.
- `maxCount` - The maximum number of entries to store in the database. Default `Infinity`.
- `maxEntrySize` - The maximum size in bytes that a response's body can be. If a response's body is greater than or equal to this, the response will not be cached. Default `Infinity`.

## Defining a Custom Cache Store

The store must implement the following functions:

### Getter: `isFull`

Optional. This tells the cache interceptor if the store is full or not. If this is true,
the cache interceptor will not attempt to cache the response.

### Function: `get`

Parameters:

* **req** `Dispatcher.RequestOptions` - Incoming request

Returns: `GetResult | Promise<GetResult | undefined> | undefined` - If the request is cached, the cached response is returned. If the request's method is anything other than HEAD, the response is also returned.
If the request isn't cached, `undefined` is returned.

Response properties:

* **response** `CacheValue` - The cached response data.
* **body** `Readable | undefined` - The response's body.

### Function: `createWriteStream`

Parameters:

* **req** `Dispatcher.RequestOptions` - Incoming request
* **value** `CacheValue` - Response to store

Returns: `Writable | undefined` - If the store is full, return `undefined`. Otherwise, return a writable so that the cache interceptor can stream the body and trailers to the store.

## `CacheValue`

This is an interface containing the majority of a response's data (minus the body).

### Property `statusCode`

`number` - The response's HTTP status code.

### Property `statusMessage`

`string` - The response's HTTP status message.

### Property `rawHeaders`

`Buffer[]` - The response's headers.

### Property `vary`

`Record<string, string | string[]> | undefined` - The headers defined by the response's `Vary` header
and their respective values for later comparison

For example, for a response like
```
Vary: content-encoding, accepts
content-encoding: utf8
accepts: application/json
```

This would be
```js
{
  'content-encoding': 'utf8',
  accepts: 'application/json'
}
```

### Property `cachedAt`

`number` - Time in millis that this value was cached.

### Property `staleAt`

`number` - Time in millis that this value is considered stale.

### Property `deleteAt`

`number` - Time in millis that this value is to be deleted from the cache. This
is either the same sa staleAt or the `max-stale` caching directive.

The store must not return a response after the time defined in this property.

## `CacheStoreReadable`

This extends Node's [`Readable`](https://nodejs.org/api/stream.html#class-streamreadable)
and defines extra properties relevant to the cache interceptor.

### Getter: `value`

The response's [`CacheStoreValue`](/docs/docs/api/CacheStore.md#cachestorevalue)

## `CacheStoreWriteable`

This extends Node's [`Writable`](https://nodejs.org/api/stream.html#class-streamwritable)
and defines extra properties relevant to the cache interceptor.

### Setter: `rawTrailers`

If the response has trailers, the cache interceptor will pass them to the cache
interceptor through this method.
