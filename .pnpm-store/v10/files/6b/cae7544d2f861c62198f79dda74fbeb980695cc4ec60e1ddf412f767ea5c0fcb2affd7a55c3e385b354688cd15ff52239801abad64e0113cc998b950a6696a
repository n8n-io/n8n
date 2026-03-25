[<img align="center" src="https://cacheable.org/logo.svg" alt="Cacheable" />](https://github.com/jaredwray/cacheable)

> High Performance Layer 1 / Layer 2 Caching with Keyv Storage

[![codecov](https://codecov.io/gh/jaredwray/cacheable/graph/badge.svg?token=lWZ9OBQ7GM)](https://codecov.io/gh/jaredwray/cacheable)
[![tests](https://github.com/jaredwray/cacheable/actions/workflows/tests.yml/badge.svg)](https://github.com/jaredwray/cacheable/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/dm/cacheable.svg)](https://www.npmjs.com/package/cacheable)
[![npm](https://img.shields.io/npm/v/cacheable)](https://www.npmjs.com/package/cacheable)
[![license](https://img.shields.io/github/license/jaredwray/cacheable)](https://github.com/jaredwray/cacheable/blob/main/LICENSE)

`cacheable` is a high performance layer 1 / layer 2 caching engine that is focused on distributed caching with enterprise features such as `CacheSync` (coming soon). It is built on top of the robust storage engine [Keyv](https://keyv.org) and provides a simple API to cache and retrieve data.

* Simple to use with robust API
* Not bloated with additional modules
* Scalable and trusted storage engine by Keyv
* Memory Caching with LRU and Expiration `CacheableMemory`
* Resilient to failures with try/catch and offline
* Wrap / Memoization for Sync and Async Functions with Stampede Protection
* Hooks and Events to extend functionality
* Shorthand for ttl in milliseconds `(1m = 60000) (1h = 3600000) (1d = 86400000)`
* Non-blocking operations for layer 2 caching
* Distributed Caching Sync via Pub/Sub (coming soon)
* Comprehensive testing and code coverage
* ESM and CommonJS support with Typescript
* Maintained and supported regularly

# Table of Contents
* [Getting Started](#getting-started)
* [Basic Usage](#basic-usage)
* [Hooks and Events](#hooks-and-events)
* [Storage Tiering and Caching](#storage-tiering-and-caching)
* [TTL Propagation and Storage Tiering](#ttl-propagation-and-storage-tiering)
* [Shorthand for Time to Live (ttl)](#shorthand-for-time-to-live-ttl)
* [Non-Blocking Operations](#non-blocking-operations)
* [Non-Blocking with @keyv/redis](#non-blocking-with-keyvredis)
* [CacheSync - Distributed Updates](#cachesync---distributed-updates)
* [Cacheable Options](#cacheable-options)
* [Cacheable Statistics (Instance Only)](#cacheable-statistics-instance-only)
* [Cacheable - API](#cacheable---api)
* [CacheableMemory - In-Memory Cache](#cacheablememory---in-memory-cache)
* [CacheableMemory Store Hashing](#cacheablememory-store-hashing)
* [CacheableMemory LRU Feature](#cacheablememory-lru-feature)
* [CacheableMemory Performance](#cacheablememory-performance)
* [CacheableMemory Options](#cacheablememory-options)
* [CacheableMemory - API](#cacheablememory---api)
* [Keyv Storage Adapter - KeyvCacheableMemory](#keyv-storage-adapter---keyvcacheablememory)
* [Wrap / Memoization for Sync and Async Functions](#wrap--memoization-for-sync-and-async-functions)
* [Get Or Set Memoization Function](#get-or-set-memoization-function)
* [How to Contribute](#how-to-contribute)
* [License and Copyright](#license-and-copyright)

# Getting Started

`cacheable` is primarily used as an extension to your caching engine with a robust storage backend [Keyv](https://keyv.org), Memoization (Wrap), Hooks, Events, and Statistics.

```bash
npm install cacheable
```

# Basic Usage

```javascript
import { Cacheable } from 'cacheable';

const cacheable = new Cacheable();
await cacheable.set('key', 'value', 1000);
const value = await cacheable.get('key');
```

This is a basic example where you are only using the in-memory storage engine. To enable layer 1 and layer 2 caching you can use the `secondary` property in the options:

```javascript
import { Cacheable } from 'cacheable';
import KeyvRedis from '@keyv/redis';

const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({secondary});
``` 

In this example, the primary store we will use `lru-cache` and the secondary store is Redis. You can also set multiple stores in the options:

```javascript
import { Cacheable } from 'cacheable';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { LRUCache } from 'lru-cache'

const primary = new Keyv({store: new LRUCache()});
const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({primary, secondary});
```

This is a more advanced example and not needed for most use cases.

# Hooks and Events

The following hooks are available for you to extend the functionality of `cacheable` via `CacheableHooks` enum:

* `BEFORE_SET`: This is called before the `set()` method is called.
* `AFTER_SET`: This is called after the `set()` method is called.
* `BEFORE_SET_MANY`: This is called before the `setMany()` method is called.
* `AFTER_SET_MANY`: This is called after the `setMany()` method is called.
* `BEFORE_GET`: This is called before the `get()` method is called.
* `AFTER_GET`: This is called after the `get()` method is called.
* `BEFORE_GET_MANY`: This is called before the `getMany()` method is called.
* `AFTER_GET_MANY`: This is called after the `getMany()` method is called.
* `BEFORE_SECONDARY_SETS_PRIMARY`: This is called when the secondary store sets the value in the primary store.

An example of how to use these hooks:

```javascript
import { Cacheable, CacheableHooks } from 'cacheable';

const cacheable = new Cacheable();
cacheable.onHook(CacheableHooks.BEFORE_SET, (data) => {
  console.log(`before set: ${data.key} ${data.value}`);
});
```

Here is an example of how to use `BEFORE_SECONDARY_SETS_PRIMARY` hook:

```javascript
import { Cacheable, CacheableHooks } from 'cacheable';
import KeyvRedis from '@keyv/redis';
const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({secondary});
cache.onHook(CacheableHooks.BEFORE_SECONDARY_SETS_PRIMARY, (data) => {
  console.log(`before secondary sets primary: ${data.key} ${data.value} ${data.ttl}`);
});
```
This is called when the secondary store sets the value in the primary store. This is useful if you want to do something before the value is set in the primary store such as manipulating the ttl or the value.

# Storage Tiering and Caching

`cacheable` is built as a layer 1 and layer 2 caching engine by default. The purpose is to have your layer 1 be fast and your layer 2 be more persistent. The primary store is the layer 1 cache and the secondary store is the layer 2 cache. By adding the secondary store you are enabling layer 2 caching. By default the operations are blocking but fault tolerant:

* `Setting Data`: Sets the value in the primary store and then the secondary store.
* `Getting Data`: Gets the value from the primary if the value does not exist it will get it from the secondary store and set it in the primary store.
* `Deleting Data`: Deletes the value from the primary store and secondary store at the same time waiting for both to respond.
* `Clearing Data`: Clears the primary store and secondary store at the same time waiting for both to respond.

When `Getting Data` if the value does not exist in the primary store it will try to get it from the secondary store. If the secondary store returns the value it will set it in the primary store. Because we use [TTL Propagation](#ttl-propagation-and-storage-tiering) the value will be set in the primary store with the TTL of the secondary store unless the time to live (TTL) is greater than the primary store which will then use the TTL of the primary store. An example of this is:

```javascript
import { Cacheable } from 'cacheable';
import KeyvRedis from '@keyv/redis';
const secondary = new KeyvRedis('redis://user:pass@localhost:6379', { ttl: 1000 });
const cache = new Cacheable({secondary, ttl: 100});

await cache.set('key', 'value'); // sets the value in the primary store with a ttl of 100 ms and secondary store with a ttl of 1000 ms

await sleep(500); // wait for .5 seconds

const value = await cache.get('key'); // gets the value from the secondary store and now sets the value in the primary store with a ttl of 500 ms which is what is left from the secondary store
```

In this example the primary store has a ttl of `100 ms` and the secondary store has a ttl of `1000 ms`. Because the ttl is greater in the secondary store it will default to setting ttl value in the primary store.

```javascript
import { Cacheable } from 'cacheable';
import {Keyv} from 'keyv';
import KeyvRedis from '@keyv/redis';
const primary = new Keyv({ ttl: 200 });
const secondary = new KeyvRedis('redis://user:pass@localhost:6379', { ttl: 1000 });
const cache = new Cacheable({primary, secondary});

await cache.set('key', 'value'); // sets the value in the primary store with a ttl of 100 ms and secondary store with a ttl of 1000 ms

await sleep(200); // wait for .2 seconds

const value = await cache.get('key'); // gets the value from the secondary store and now sets the value in the primary store with a ttl of 200 ms which is what the primary store is set with
```

# TTL Propagation and Storage Tiering

Cacheable TTL propagation is a feature that allows you to set a time to live (TTL) for the cache. By default the TTL is set in the following order:

```
ttl = set at the function ?? storage adapter ttl ?? cacheable ttl
```

This means that if you set a TTL at the function level it will override the storage adapter TTL and the cacheable TTL. If you do not set a TTL at the function level it will use the storage adapter TTL and then the cacheable TTL. If you do not set a TTL at all it will use the default TTL of `undefined` which is disabled.

# Shorthand for Time to Live (ttl)

By default `Cacheable` and `CacheableMemory` the `ttl` is in milliseconds but you can use shorthand for the time to live. Here are the following shorthand values:

* `ms`: Milliseconds such as (1ms = 1)
* `s`: Seconds such as (1s = 1000)
* `m`: Minutes such as (1m = 60000)
* `h` or `hr`: Hours such as (1h = 3600000)
* `d`: Days such as (1d = 86400000)

Here is an example of how to use the shorthand for the `ttl`:

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable({ ttl: '15m' }); //sets the default ttl to 15 minutes (900000 ms)
cache.set('key', 'value', '1h'); //sets the ttl to 1 hour (3600000 ms) and overrides the default
```

if you want to disable the `ttl` you can set it to `0` or `undefined`:

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable({ ttl: 0 }); //sets the default ttl to 0 which is disabled
cache.set('key', 'value', 0); //sets the ttl to 0 which is disabled
```

If you set the ttl to anything below `0` or `undefined` it will disable the ttl for the cache and the value that returns will be `undefined`. With no ttl set the value will be stored `indefinitely`.

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable({ ttl: 0 }); //sets the default ttl to 0 which is disabled
console.log(cache.ttl); // undefined
cache.ttl = '1h'; // sets the default ttl to 1 hour (3600000 ms)
console.log(cache.ttl); // '1h'
cache.ttl = -1; // sets the default ttl to 0 which is disabled
console.log(cache.ttl); // undefined
```

## Retrieving raw cache entries

The `get` and `getMany` methods support a `raw` option, which returns the full stored metadata (`StoredDataRaw<T>`) instead of just the value:

```typescript
import { Cacheable } from 'cacheable';

const cache = new Cacheable();

// store a value
await cache.set('user:1', { name: 'Alice' });

// default: only the value
const user = await cache.get<{ name: string }>('user:1');
console.log(user); // { name: 'Alice' }

// with raw: full record including expiration
const raw = await cache.get<{ name: string }>('user:1', { raw: true });
console.log(raw.value);   // { name: 'Alice' }
console.log(raw.expires); // e.g. 1677628495000 or null
```

```typescript
// getMany with raw option
await cache.set('a', 1);
await cache.set('b', 2);

const raws = await cache.getMany<number>(['a', 'b'], { raw: true });
raws.forEach((entry, idx) => {
  console.log(`key=${['a','b'][idx]}, value=${entry?.value}, expires=${entry?.expires}`);
});
```


# Non-Blocking Operations

If you want your layer 2 (secondary) store to be non-blocking you can set the `nonBlocking` property to `true` in the options. This will make the secondary store non-blocking and will not wait for the secondary store to respond on `setting data`, `deleting data`, or `clearing data`. This is useful if you want to have a faster response time and not wait for the secondary store to respond.

# Non-Blocking with @keyv/redis

`@keyv/redis` is one of the most popular storage adapters used with `cacheable`. It provides a Redis-backed cache store that can be used as a secondary store. It is a bit complicated to setup as by default it causes hangs and blocking with its default configuration. To get past this you will need to configure the following:

Construct your own Redis client via the `createClient()` method from `@keyv/redis` with the following options:
* Set `disableOfflineQueue` to `true`
* Set `socket.reconnectStrategy` to `false`
In the KeyvRedis options:
* Set `throwOnConnectError` to `false`
In the Cacheable options:
* Set `nonBlocking` to `true`

We have also build a function to help with this called `createKeyvNonBlocking` inside the `@keyv/redis` package after version `4.6.0`. Here is an example of how to use it:

```javascript
import { Cacheable } from 'cacheable';
import { createKeyvNonBlocking } from '@keyv/redis';

const secondary = createKeyvNonBlocking('redis://user:pass@localhost:6379');

const cache = new Cacheable({ secondary, nonBlocking: true });
```

# GetOrSet

The `getOrSet` method provides a convenient way to implement the cache-aside pattern. It attempts to retrieve a value
from cache, and if not found, calls the provided function to compute the value and store it in cache before returning
it.

```typescript
import { Cacheable } from 'cacheable';

// Create a new Cacheable instance
const cache = new Cacheable();

// Use getOrSet to fetch user data
async function getUserData(userId: string) {
  return await cache.getOrSet(
    `user:${userId}`,
    async () => {
      // This function only runs if the data isn't in the cache
      console.log('Fetching user from database...');
      // Simulate database fetch
      return { id: userId, name: 'John Doe', email: 'john@example.com' };
    },
    { ttl: '30m' } // Cache for 30 minutes
  );
}

// First call - will fetch from "database"
const user1 = await getUserData('123');
console.log(user1); // { id: '123', name: 'John Doe', email: 'john@example.com' }

// Second call - will retrieve from cache
const user2 = await getUserData('123');
console.log(user2); // Same data, but retrieved from cache
```

```javascript
import { Cacheable } from 'cacheable';
import {KeyvRedis} from '@keyv/redis';

const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({secondary, nonBlocking: true});
```

# CacheSync - Distributed Updates

`cacheable` has a feature called `CacheSync` that is coming soon. This feature will allow you to have distributed caching with Pub/Sub. This will allow you to have multiple instances of `cacheable` running and when a value is set, deleted, or cleared it will update all instances of `cacheable` with the same value. Current plan is to support the following:

* [AWS SQS](https://aws.amazon.com/sqs)
* [RabbitMQ](https://www.rabbitmq.com)
* [Nats](https://nats.io)
* [Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus)
* [Redis Pub/Sub](https://redis.io/topics/pubsub)

This feature should be live by end of year. 

# Cacheable Options

The following options are available for you to configure `cacheable`:

* `primary`: The primary store for the cache (layer 1) defaults to in-memory by Keyv.
* `secondary`: The secondary store for the cache (layer 2) usually a persistent cache by Keyv.
* `nonBlocking`: If the secondary store is non-blocking. Default is `false`.
* `stats`: To enable statistics for this instance. Default is `false`.
* `ttl`: The default time to live for the cache in milliseconds. Default is `undefined` which is disabled.
* `namespace`: The namespace for the cache. Default is `undefined`.

# Cacheable Statistics (Instance Only)

If you want to enable statistics for your instance you can set the `.stats.enabled` property to `true` in the options. This will enable statistics for your instance and you can get the statistics by calling the `stats` property. Here are the following property statistics:

* `hits`: The number of hits in the cache.
* `misses`: The number of misses in the cache.
* `sets`: The number of sets in the cache.
* `deletes`: The number of deletes in the cache.
* `clears`: The number of clears in the cache.
* `errors`: The number of errors in the cache.
* `count`: The number of keys in the cache.
* `vsize`: The estimated byte size of the values in the cache.
* `ksize`: The estimated byte size of the keys in the cache.

You can clear / reset the stats by calling the `.stats.reset()` method.

_This does not enable statistics for your layer 2 cache as that is a distributed cache_.

# Cacheable - API

* `set(key, value, ttl?)`: Sets a value in the cache.
* `setMany([{key, value, ttl?}])`: Sets multiple values in the cache.
* `get(key)`: Gets a value from the cache.
* `get(key, { raw: true })`: Gets a raw value from the cache.
* `getMany([keys])`: Gets multiple values from the cache.
* `getMany([keys], { raw: true })`: Gets multiple raw values from the cache.
* `has(key)`: Checks if a value exists in the cache.
* `hasMany([keys])`: Checks if multiple values exist in the cache.
* `take(key)`: Takes a value from the cache and deletes it.
* `takeMany([keys])`: Takes multiple values from the cache and deletes them.
* `delete(key)`: Deletes a value from the cache.
* `deleteMany([keys])`: Deletes multiple values from the cache.
* `clear()`: Clears the cache stores. Be careful with this as it will clear both layer 1 and layer 2.
* `wrap(function, WrapOptions)`: Wraps an `async` function in a cache.
* `getOrSet(GetOrSetKey, valueFunction, GetOrSetFunctionOptions)`: Gets a value from cache or sets it if not found using the provided function.
* `disconnect()`: Disconnects from the cache stores.
* `onHook(hook, callback)`: Sets a hook.
* `removeHook(hook)`: Removes a hook.
* `on(event, callback)`: Listens for an event.
* `removeListener(event, callback)`: Removes a listener.
* `hash(object: any, algorithm = 'sha256'): string`: Hashes an object with the algorithm. Default is `sha256`.
* `primary`: The primary store for the cache (layer 1) defaults to in-memory by Keyv.
* `secondary`: The secondary store for the cache (layer 2) usually a persistent cache by Keyv.
* `namespace`: The namespace for the cache. Default is `undefined`. This will set the namespace for the primary and secondary stores.
* `nonBlocking`: If the secondary store is non-blocking. Default is `false`.
* `stats`: The statistics for this instance which includes `hits`, `misses`, `sets`, `deletes`, `clears`, `errors`, `count`, `vsize`, `ksize`.

# CacheableMemory - In-Memory Cache

`cacheable` comes with a built-in in-memory cache called `CacheableMemory`. This is a simple in-memory cache that is used as the primary store for `cacheable`. You can use this as a standalone cache or as a primary store for `cacheable`. Here is an example of how to use `CacheableMemory`:

```javascript
import { CacheableMemory } from 'cacheable';
const options = {
  ttl: '1h', // 1 hour
  useClones: true, // use clones for the values (default is true)
  lruSize: 1000, // the size of the LRU cache (default is 0 which is unlimited)
}
const cache = new CacheableMemory(options);
cache.set('key', 'value');
const value = cache.get('key'); // value
```

You can use `CacheableMemory` as a standalone cache or as a primary store for `cacheable`. You can also set the `useClones` property to `false` if you want to use the same reference for the values. This is useful if you are using large objects and want to save memory. The `lruSize` property is the size of the LRU cache and is set to `0` by default which is unlimited. When setting the `lruSize` property it will limit the number of keys in the cache.

This simple in-memory cache uses multiple Map objects and a with `expiration` and `lru` policies if set to manage the in memory cache at scale.

By default we use lazy expiration deletion which means on `get` and `getMany` type functions we look if it is expired and then delete it. If you want to have a more aggressive expiration policy you can set the `checkInterval` property to a value greater than `0` which will check for expired keys at the interval you set.

Here are some of the main features of `CacheableMemory`:
* High performance in-memory cache with a robust API and feature set. 🚀
* Can scale past the `16,777,216 (2^24) keys` limit of a single `Map` via `hashStoreSize`. Default is `16` Map objects.
* LRU (Least Recently Used) cache feature to limit the number of keys in the cache via `lruSize`. Limit to `16,777,216 (2^24) keys` total.
* Expiration policy to delete expired keys with lazy deletion or aggressive deletion via `checkInterval`.
* `Wrap` feature to memoize `sync` and `async` functions with stampede protection.
* Ability to do many operations at once such as `setMany`, `getMany`, `deleteMany`, and `takeMany`.
* Supports `raw` data retrieval with `getRaw` and `getManyRaw` methods to get the full metadata of the cache entry.

## CacheableMemory Store Hashing

`CacheableMemory` uses `Map` objects to store the keys and values. To make this scale past the `16,777,216 (2^24) keys` limit of a single `Map` we use a hash to balance the data across multiple `Map` objects. This is done by hashing the key and using the hash to determine which `Map` object to use. The default hashing algorithm is `djb2Hash` but you can change it by setting the `storeHashAlgorithm` property in the options. By default we set the amount of `Map` objects to `16`. 

NOTE: if you are using the LRU cache feature the `lruSize` no matter how many `Map` objects you have it will be limited to the `16,777,216 (2^24) keys` limit of a single `Map` object. This is because we use a double linked list to manage the LRU cache and it is not possible to have more than `16,777,216 (2^24) keys` in a single `Map` object.

Here is an example of how to set the number of `Map` objects and the hashing algorithm:

```javascript
import { CacheableMemory } from 'cacheable';
const cache = new CacheableMemory({
  storeSize: 32, // set the number of Map objects to 32
});
cache.set('key', 'value');
const value = cache.get('key'); // value
```

Here is an example of how to use the `storeHashAlgorithm` property:

```javascript
import { CacheableMemory } from 'cacheable';
const cache = new CacheableMemory({ storeHashAlgorithm: 'sha256' });
cache.set('key', 'value');
const value = cache.get('key'); // value
```

If you want to provide your own hashing function you can set the `storeHashAlgorithm` property to a function that takes an object and returns a `number` that is in the range of the amount of `Map` stores you have.

```javascript
import { CacheableMemory } from 'cacheable';
/**
 * Custom hash function that takes a key and the size of the store
 * and returns a number between 0 and storeHashSize - 1.
 * @param {string} key - The key to hash.
 * @param {number} storeHashSize - The size of the store (number of Map objects).
 * @returns {number} - A number between 0 and storeHashSize - 1.
 */
const customHash = (key, storeHashSize) => {
  // custom hashing logic
  return key.length % storeHashSize; // returns a number between 0 and 31 for 32 Map objects
};
const cache = new CacheableMemory({ storeHashAlgorithm: customHash, storeSize: 32 });
cache.set('key', 'value');
const value = cache.get('key'); // value
```

## CacheableMemory LRU Feature

You can enable the LRU (Least Recently Used) feature in `CacheableMemory` by setting the `lruSize` property in the options. This will limit the number of keys in the cache to the size you set. When the cache reaches the limit it will remove the least recently used keys from the cache. This is useful if you want to limit the memory usage of the cache.

When you set the `lruSize` we use a double linked list to manage the LRU cache and also set the `hashStoreSize` to `1` which means we will only use a single `Map` object for the LRU cache. This is because the LRU cache is managed by the double linked list and it is not possible to have more than `16,777,216 (2^24) keys` in a single `Map` object.

```javascript
import { CacheableMemory } from 'cacheable';
const cache = new CacheableMemory({ lruSize: 1 }); // sets the LRU cache size to 1000 keys and hashStoreSize to 1
cache.set('key1', 'value1');
cache.set('key2', 'value2');
const value1 = cache.get('key1');
console.log(value1); // undefined if the cache is full and key1 is the least recently used
const value2 = cache.get('key2');
console.log(value2); // value2 if key2 is still in the cache
console.log(cache.size()); // 1
```

NOTE: if you set the `lruSize` property to `0` after it was enabled it will disable the LRU cache feature and will not limit the number of keys in the cache. This will remove the `16,777,216 (2^24) keys` limit of a single `Map` object and will allow you to store more keys in the cache.

## CacheableMemory Performance

Our goal with `cacheable` and `CacheableMemory` is to provide a high performance caching engine that is simple to use and has a robust API. We test it against other cacheing engines such that are less feature rich to make sure there is little difference. Here are some of the benchmarks we have run:

*Memory Benchmark Results:*
|                   name                   |  summary  |  ops/sec  |  time/op  |  margin  |  samples  |
|------------------------------------------|:---------:|----------:|----------:|:--------:|----------:|
|  Map (v22) - set / get                   |    🥇     |     117K  |      9µs  |  ±1.29%  |     110K  |
|  Cacheable Memory (v1.10.0) - set / get  |   -1.3%   |     116K  |      9µs  |  ±0.77%  |     110K  |
|  Node Cache - set / get                  |   -4.1%   |     112K  |      9µs  |  ±1.34%  |     107K  |
|  bentocache (v1.4.0) - set / get         |   -45%    |      65K  |     17µs  |  ±1.10%  |     100K  |

*Memory LRU Benchmark Results:*
|                   name                   |  summary  |  ops/sec  |  time/op  |  margin  |  samples  |
|------------------------------------------|:---------:|----------:|----------:|:--------:|----------:|
|  quick-lru (v7.0.1) - set / get          |    🥇     |     118K  |      9µs  |  ±0.85%  |     112K  |
|  Map (v22) - set / get                   |  -0.56%   |     117K  |      9µs  |  ±1.35%  |     110K  |
|  lru.min (v1.1.2) - set / get            |   -1.7%   |     116K  |      9µs  |  ±0.90%  |     110K  |
|  Cacheable Memory (v1.10.0) - set / get  |   -3.3%   |     114K  |      9µs  |  ±1.16%  |     108K  |

As you can see from the benchmarks `CacheableMemory` is on par with other caching engines such as `Map`, `Node Cache`, and `bentocache`. We have also tested it against other LRU caching engines such as `quick-lru` and `lru.min` and it performs well against them too.

## CacheableMemory Options

* `ttl`: The time to live for the cache in milliseconds. Default is `undefined` which is means indefinitely.
* `useClones`: If the cache should use clones for the values. Default is `true`.
* `lruSize`: The size of the LRU cache. Default is `0` which is unlimited.
* `checkInterval`: The interval to check for expired keys in milliseconds. Default is `0` which is disabled.
* `storeHashSize`: The number of `Map` objects to use for the cache. Default is `16`.
* `storeHashAlgorithm`: The hashing algorithm to use for the cache. Default is `djb2Hash`.

## CacheableMemory - API

* `set(key, value, ttl?)`: Sets a value in the cache.
* `setMany([{key, value, ttl?}])`: Sets multiple values in the cache from `CacheableItem`.
* `get(key)`: Gets a value from the cache.
* `getMany([keys])`: Gets multiple values from the cache.
* `getRaw(key)`: Gets a value from the cache as `CacheableStoreItem`.
* `getManyRaw([keys])`: Gets multiple values from the cache as `CacheableStoreItem`.
* `has(key)`: Checks if a value exists in the cache.
* `hasMany([keys])`: Checks if multiple values exist in the cache.
* `delete(key)`: Deletes a value from the cache.
* `deleteMany([keys])`: Deletes multiple values from the cache.
* `take(key)`: Takes a value from the cache and deletes it.
* `takeMany([keys])`: Takes multiple values from the cache and deletes them.
* `wrap(function, WrapSyncOptions)`: Wraps a `sync` function in a cache.
* `clear()`: Clears the cache.
* `ttl`: The default time to live for the cache in milliseconds. Default is `undefined` which is disabled.
* `useClones`: If the cache should use clones for the values. Default is `true`.
* `lruSize`: The size of the LRU cache. Default is `0` which is unlimited.
* `size`: The number of keys in the cache.
* `checkInterval`: The interval to check for expired keys in milliseconds. Default is `0` which is disabled.
* `storeHashSize`: The number of `Map` objects to use for the cache. Default is `16`.
* `storeHashAlgorithm`: The hashing algorithm to use for the cache. Default is `djb2Hash`.
* `keys`: Get the keys in the cache. Not able to be set.
* `items`: Get the items in the cache as `CacheableStoreItem` example `{ key, value, expires? }`.
* `store`: The hash store for the cache which is an array of `Map` objects.
* `checkExpired()`: Checks for expired keys in the cache. This is used by the `checkInterval` property.
* `startIntervalCheck()`: Starts the interval check for expired keys if `checkInterval` is above 0 ms.
* `stopIntervalCheck()`: Stops the interval check for expired keys.

# Keyv Storage Adapter - KeyvCacheableMemory

`cacheable` comes with a built-in storage adapter for Keyv called `KeyvCacheableMemory`. This takes `CacheableMemory` and creates a storage adapter for Keyv. This is useful if you want to use `CacheableMemory` as a storage adapter for Keyv. Here is an example of how to use `KeyvCacheableMemory`:

```javascript
import { Keyv } from 'keyv';
import { KeyvCacheableMemory } from 'cacheable';

const keyv = new Keyv({ store: new KeyvCacheableMemory() });
await keyv.set('foo', 'bar');
const value = await keyv.get('foo');
console.log(value); // bar 
```

# Wrap / Memoization for Sync and Async Functions

`Cacheable` and `CacheableMemory` has a feature called `wrap` that allows you to wrap a function in a cache. This is useful for memoization and caching the results of a function. You can wrap a `sync` or `async` function in a cache. Here is an example of how to use the `wrap` function:

```javascript
import { Cacheable } from 'cacheable';
const asyncFunction = async (value: number) => {
  return Math.random() * value;
};

const cache = new Cacheable();
const options = {
  ttl: '1h', // 1 hour
  keyPrefix: 'p1', // key prefix. This is used if you have multiple functions and need to set a unique prefix.
}
const wrappedFunction = cache.wrap(asyncFunction, options);
console.log(await wrappedFunction(2)); // 4
console.log(await wrappedFunction(2)); // 4 from cache
```
With `Cacheable` we have also included stampede protection so that a `Promise` based call will only be called once if multiple requests of the same are executed at the same time. Here is an example of how to test for stampede protection:
  
```javascript
import { Cacheable } from 'cacheable';
const asyncFunction = async (value: number) => {
  return value;
};

const cache = new Cacheable();
const options = {
  ttl: '1h', // 1 hour
  keyPrefix: 'p1', // key prefix. This is used if you have multiple functions and need to set a unique prefix.
}

const wrappedFunction = cache.wrap(asyncFunction, options);
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(wrappedFunction(i));
}

const results = await Promise.all(promises); // all results should be the same

console.log(results); // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
```

In this example we are wrapping an `async` function in a cache with a `ttl` of `1 hour`. This will cache the result of the function for `1 hour` and then expire the value. You can also wrap a `sync` function in a cache:

```javascript
import { CacheableMemory } from 'cacheable';
const syncFunction = (value: number) => {
  return value * 2;
};

const cache = new CacheableMemory();
const wrappedFunction = cache.wrap(syncFunction, { ttl: '1h', key: 'syncFunction' });
console.log(wrappedFunction(2)); // 4
console.log(wrappedFunction(2)); // 4 from cache
```

In this example we are wrapping a `sync` function in a cache with a `ttl` of `1 hour`. This will cache the result of the function for `1 hour` and then expire the value. You can also set the `key` property in the `wrap()` options to set a custom key for the cache.

When an error occurs in the function it will not cache the value and will return the error. This is useful if you want to cache the results of a function but not cache the error. If you want it to cache the error you can set the `cacheError` property to `true` in the `wrap()` options. This is disabled by default.

```javascript
import { CacheableMemory } from 'cacheable';
const syncFunction = (value: number) => {
  throw new Error('error');
};

const cache = new CacheableMemory();
const wrappedFunction = cache.wrap(syncFunction, { ttl: '1h', key: 'syncFunction', cacheError: true });
console.log(wrappedFunction()); // error
console.log(wrappedFunction()); // error from cache
```

If you would like to generate your own key for the wrapped function you can set the `createKey` property in the `wrap()` options. This is useful if you want to generate a key based on the arguments of the function or any other criteria.

```javascript
  const cache = new Cacheable();
  const options: WrapOptions = {
    cache,
    keyPrefix: 'test',
    createKey: (function_, arguments_, options: WrapOptions) => `customKey:${options?.keyPrefix}:${arguments_[0]}`,
  };

  const wrapped = wrap((argument: string) => `Result for ${argument}`, options);

  const result1 = await wrapped('arg1');
  const result2 = await wrapped('arg1'); // Should hit the cache

  console.log(result1); // Result for arg1
  console.log(result2); // Result for arg1 (from cache)
```

We will pass in the `function` that is being wrapped, the `arguments` passed to the function, and the `options` used to wrap the function. You can then use these to generate a custom key for the cache.

# Get Or Set Memoization Function

The `getOrSet` method provides a convenient way to implement the cache-aside pattern. It attempts to retrieve a value from cache, and if not found, calls the provided function to compute the value and store it in cache before returning it. Here are the options:

```typescript
export type GetOrSetFunctionOptions = {
	ttl?: number | string;
	cacheErrors?: boolean;
	throwErrors?: boolean;
};
```

Here is an example of how to use the `getOrSet` method:

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable();
// Use getOrSet to fetch user data
const function_ = async () => Math.random() * 100;
const value = await cache.getOrSet('randomValue', function_, { ttl: '1h' });
console.log(value); // e.g. 42.123456789
```

You can also use a function to compute the key for the function:

```javascript
import { Cacheable, GetOrSetOptions } from 'cacheable';
const cache = new Cacheable();

// Function to generate a key based on options
const generateKey = (options?: GetOrSetOptions) => {
  return `custom_key_:${options?.cacheId || 'default'}`;
};

const function_ = async () => Math.random() * 100;
const value = await cache.getOrSet(generateKey(), function_, { ttl: '1h' });
```



# How to Contribute

You can contribute by forking the repo and submitting a pull request. Please make sure to add tests and update the documentation. To learn more about how to contribute go to our main README [https://github.com/jaredwray/cacheable](https://github.com/jaredwray/cacheable). This will talk about how to `Open a Pull Request`, `Ask a Question`, or `Post an Issue`.

# License and Copyright
[MIT © Jared Wray](./LICENSE)
