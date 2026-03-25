# CacheStorage

Undici exposes a W3C spec-compliant implementation of [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) and [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache).

## Opening a Cache

Undici exports a top-level CacheStorage instance. You can open a new Cache, or duplicate a Cache with an existing name, by using `CacheStorage.prototype.open`. If you open a Cache with the same name as an already-existing Cache, its list of cached Responses will be shared between both instances.

```mjs
import { caches } from 'undici'

const cache_1 = await caches.open('v1')
const cache_2 = await caches.open('v1')

// Although .open() creates a new instance,
assert(cache_1 !== cache_2)
// The same Response is matched in both.
assert.deepStrictEqual(await cache_1.match('/req'), await cache_2.match('/req'))
```

## Deleting a Cache

If a Cache is deleted, the cached Responses/Requests can still be used.

```mjs
const response = await cache_1.match('/req')
await caches.delete('v1')

await response.text() // the Response's body
```
