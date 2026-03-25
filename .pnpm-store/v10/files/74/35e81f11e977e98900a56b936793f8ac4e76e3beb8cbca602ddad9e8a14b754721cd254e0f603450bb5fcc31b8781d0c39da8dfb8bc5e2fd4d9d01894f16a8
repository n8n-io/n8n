# node-cache-manager [![npm version](https://badge.fury.io/js/cache-manager.svg)](https://www.npmjs.com/package/cache-manager) [![codecov](https://codecov.io/gh/node-cache-manager/node-cache-manager/branch/master/graph/badge.svg?token=ZV3G5IFigq)](https://codecov.io/gh/node-cache-manager/node-cache-manager)

# Flexible NodeJS cache module

A cache module for nodejs that allows easy wrapping of functions in cache, tiered caches, and a consistent interface.

## Features

- Made with Typescript and compatible with [ESModules](https://nodejs.org/docs/latest-v14.x/api/esm.html)
- Easy way to wrap any function in cache.
- Tiered caches -- data gets stored in each cache and fetched from the highest.
  priority cache(s) first.
- Use any cache you want, as long as it has the same API.
- 100% test coverage via [vitest](https://github.com/vitest-dev/vitest).

## Installation

    pnpm install cache-manager

## Usage Examples

### Single Store

```typescript
import { caching } from 'cache-manager';

const memoryCache = await caching('memory', {
  max: 100,
  ttl: 10 * 1000 /*milliseconds*/,
});

const ttl = 5 * 1000; /*milliseconds*/
await memoryCache.set('foo', 'bar', ttl);

console.log(await memoryCache.get('foo'));
// >> "bar"

await memoryCache.del('foo');

console.log(await memoryCache.get('foo'));
// >> undefined

const getUser = (id: string) => new Promise.resolve({ id: id, name: 'Bob' });

const userId = 123;
const key = 'user_' + userId;

console.log(await memoryCache.wrap(key, () => getUser(userId), ttl));
// >> { id: 123, name: 'Bob' }
```

See unit tests in [`test/caching.test.ts`](./test/caching.test.ts) for more information.

#### Example setting/getting several keys with mset() and mget()

```typescript
await memoryCache.store.mset(
  [
    ['foo', 'bar'],
    ['foo2', 'bar2'],
  ],
  ttl,
);

console.log(await memoryCache.store.mget('foo', 'foo2'));
// >> ['bar', 'bar2']

// Delete keys with mdel() passing arguments...
await memoryCache.store.mdel('foo', 'foo2');
```

#### [Example Express App Usage](./examples/express/src/index.mts)

#### Custom Stores

You can use your own custom store by creating one with the same API as the built-in memory stores.

- [Example Custom Store lru-cache](./src/stores/memory.ts)
- [Example Custom Store redis](https://github.com/node-cache-manager/node-cache-manager-redis-yet)
- [Example Custom Store ioredis](https://github.com/node-cache-manager/node-cache-manager-ioredis-yet)

### Multi-Store

```typescript
import { multiCaching } from 'cache-manager';

const multiCache = multiCaching([memoryCache, someOtherCache]);
const userId2 = 456;
const key2 = 'user_' + userId;
const ttl = 5;

// Sets in all caches.
await multiCache.set('foo2', 'bar2', ttl);

// Fetches from highest priority cache that has the key.
console.log(await multiCache.get('foo2'));
// >> "bar2"

// Delete from all caches
await multiCache.del('foo2');

// Sets multiple keys in all caches.
// You can pass as many key, value tuples as you want
await multiCache.mset(
  [
    ['foo', 'bar'],
    ['foo2', 'bar2'],
  ],
  ttl
);

// mget() fetches from highest priority cache.
// If the first cache does not return all the keys,
// the next cache is fetched with the keys that were not found.
// This is done recursively until either:
// - all have been found
// - all caches has been fetched
console.log(await multiCache.mget('key', 'key2');
// >> ['bar', 'bar2']

// Delete keys with mdel() passing arguments...
await multiCache.mdel('foo', 'foo2');

```

See unit tests in [`test/multi-caching.test.ts`](./test/multi-caching.test.ts) for more information.

## Store Engines

### Official and updated to last version

- [node-cache-manager-redis-yet](https://github.com/node-cache-manager/node-cache-manager-redis-yet) (uses [node_redis](https://github.com/NodeRedis/node_redis))

- [node-cache-manager-ioredis-yet](https://github.com/node-cache-manager/node-cache-manager-ioredis-yet) (uses [ioredis](https://github.com/luin/ioredis))

### Third party

- [node-cache-manager-redis](https://github.com/dial-once/node-cache-manager-redis) (uses [sol-redis-pool](https://github.com/joshuah/sol-redis-pool))

- [node-cache-manager-redis-store](https://github.com/dabroek/node-cache-manager-redis-store) (uses [node_redis](https://github.com/NodeRedis/node_redis))

- [node-cache-manager-ioredis](https://github.com/Tirke/node-cache-manager-ioredis) (uses [ioredis](https://github.com/luin/ioredis))

- [node-cache-manager-mongodb](https://github.com/v4l3r10/node-cache-manager-mongodb)

- [node-cache-manager-mongoose](https://github.com/disjunction/node-cache-manager-mongoose)

- [node-cache-manager-fs-binary](https://github.com/sheershoff/node-cache-manager-fs-binary)

- [node-cache-manager-fs-hash](https://github.com/rolandstarke/node-cache-manager-fs-hash)

- [node-cache-manager-hazelcast](https://github.com/marudor/node-cache-manager-hazelcast)

- [node-cache-manager-memcached-store](https://github.com/theogravity/node-cache-manager-memcached-store)

- [node-cache-manager-memory-store](https://github.com/theogravity/node-cache-manager-memory-store)

- [node-cache-manager-couchbase](https://github.com/davidepellegatta/node-cache-manager-couchbase)

- [node-cache-manager-sqlite](https://github.com/maxpert/node-cache-manager-sqlite)

## Contribute

If you would like to contribute to the project, please fork it and send us a pull request. Please add tests
for any new features or bug fixes.

## License

node-cache-manager is licensed under the [MIT license](./LICENSE).
