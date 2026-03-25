<h1 align="center"><img width="250" src="https://jaredwray.com/images/keyv.svg" alt="keyv"></h1>

> Simple key-value storage with support for multiple backends

[![build](https://github.com/jaredwray/keyv/actions/workflows/tests.yaml/badge.svg)](https://github.com/jaredwray/keyv/actions/workflows/tests.yaml)
[![codecov](https://codecov.io/gh/jaredwray/keyv/branch/main/graph/badge.svg?token=bRzR3RyOXZ)](https://codecov.io/gh/jaredwray/keyv)
[![npm](https://img.shields.io/npm/dm/keyv.svg)](https://www.npmjs.com/package/keyv)
[![npm](https://img.shields.io/npm/v/keyv.svg)](https://www.npmjs.com/package/keyv)

Keyv provides a consistent interface for key-value storage across multiple backends via storage adapters. It supports TTL based expiry, making it suitable as a cache or a persistent key-value store.

# Features

There are a few existing modules similar to Keyv, however Keyv is different because it:

- Isn't bloated
- Has a simple Promise based API
- Suitable as a TTL based cache or persistent key-value store
- [Easily embeddable](#add-cache-support-to-your-module) inside another module
- Works with any storage that implements the [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) API
- Handles all JSON types plus `Buffer`
- Supports namespaces
- Wide range of [**efficient, well tested**](#official-storage-adapters) storage adapters
- Connection errors are passed through (db failures won't kill your app)
- Supports the current active LTS version of Node.js or higher

# Table of Contents
- [Usage](#usage)
- [Type-safe Usage](#type-safe-usage)
- [Using Storage Adapters](#using-storage-adapters)
- [Namespaces](#namespaces)
- [Events](#events)
- [Hooks](#hooks)
- [Custom Serializers](#custom-serializers)
- [Official Storage Adapters](#official-storage-adapters)
- [Third-party Storage Adapters](#third-party-storage-adapters)
- [Compression](#compression)
- [API](#api)
  - [new Keyv([storage-adapter], [options]) or new Keyv([options])](#new-keyvstorage-adapter-options-or-new-keyvoptions)
  - [.namespace](#namespace)
  - [.ttl](#ttl)
  - [.store](#store)
  - [.serialize](#serialize)
  - [.deserialize](#deserialize)
  - [.compression](#compression)
  - [.useKeyPrefix](#usekeyprefix)
  - [Keyv Instance](#keyv-instance)
	- [.set(key, value, [ttl])](#setkey-value-ttl)
	- [.setMany(entries)](#setmanyentries)
	- [.get(key, [options])](#getkey-options)
	- [.getMany(keys, [options])](#getmanykeys-options)
  - [.getRaw(key)](#getrawkey)
  - [.getManyRaw(keys)](#getmanyrawkeys)
	- [.delete(key)](#deletekey)
	- [.deleteMany(keys)](#deletemanykeys)
	- [.clear()](#clear)
	- [.iterator()](#iterator)
- [How to Contribute](#how-to-contribute)
- [License](#license)

# Usage

Install Keyv.

```
npm install --save keyv
```

By default everything is stored in memory, you can optionally also install a storage adapter.

```
npm install --save @keyv/redis
npm install --save @keyv/valkey
npm install --save @keyv/mongo
npm install --save @keyv/sqlite
npm install --save @keyv/postgres
npm install --save @keyv/mysql
npm install --save @keyv/etcd
npm install --save @keyv/memcache
npm install --save @keyv/dynamo
```

First, create a new Keyv instance. 

```js
import Keyv from 'keyv';
```

# Type-safe Usage

You can create a `Keyv` instance with a generic type to enforce type safety for the values stored. Additionally, both the `get` and `set` methods support specifying custom types for specific use cases.

## Example with Instance-level Generic Type:

```ts
const keyv = new Keyv<number>(); // Instance handles only numbers
await keyv.set('key1', 123);
const value = await keyv.get('key1'); // value is inferred as number
```

## Example with Method-level Generic Type:

You can also specify a type directly in the `get` or `set` methods, allowing flexibility for different types of values within the same instance.

```ts
const keyv = new Keyv(); // Generic type not specified at instance level

await keyv.set<string>('key2', 'some string'); // Method-level type for this value
const strValue = await keyv.get<string>('key2'); // Explicitly typed as string

await keyv.set<number>('key3', 456); // Storing a number in the same instance
const numValue = await keyv.get<number>('key3'); // Explicitly typed as number
```

This makes `Keyv` highly adaptable to different data types while maintaining type safety.

# Using Storage Adapters

Once you have created your Keyv instance you can use it as a simple key-value store with `in-memory` by default. To use a storage adapter, create an instance of the adapter and pass it to the Keyv constructor. Here are some examples:

```js
// redis
import KeyvRedis from '@keyv/redis';

const keyv = new Keyv(new KeyvRedis('redis://user:pass@localhost:6379'));
```

You can also pass in a storage adapter with other options such as `ttl` and `namespace` (example using `sqlite`):

```js
//sqlite
import KeyvSqlite from '@keyv/sqlite';

const keyvSqlite = new KeyvSqlite('sqlite://path/to/database.sqlite');
const keyv = new Keyv({ store: keyvSqlite, ttl: 5000, namespace: 'cache' });
```

To handle an event you can do the following:

```js
// Handle DB connection errors
keyv.on('error', err => console.log('Connection Error', err));
```

Now lets do an end-to-end example using `Keyv` and the `Redis` storage adapter:

```js
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

const keyvRedis = new KeyvRedis('redis://user:pass@localhost:6379');
const keyv = new Keyv({ store: keyvRedis });

await keyv.set('foo', 'expires in 1 second', 1000); // true
await keyv.set('foo', 'never expires'); // true
await keyv.get('foo'); // 'never expires'
await keyv.delete('foo'); // true
await keyv.clear(); // undefined
```

It's is just that simple! Keyv is designed to be simple and easy to use.

# Namespaces

You can namespace your Keyv instance to avoid key collisions and allow you to clear only a certain namespace while using the same database.

```js
const users = new Keyv(new KeyvRedis('redis://user:pass@localhost:6379'), { namespace: 'users' });
const cache = new Keyv(new KeyvRedis('redis://user:pass@localhost:6379'), { namespace: 'cache' });

await users.set('foo', 'users'); // true
await cache.set('foo', 'cache'); // true
await users.get('foo'); // 'users'
await cache.get('foo'); // 'cache'
await users.clear(); // undefined
await users.get('foo'); // undefined
await cache.get('foo'); // 'cache'
```

# Events

Keyv is a custom `EventEmitter` and will emit an `'error'` event if there is an error.
If there is no listener for the `'error'` event, an uncaught exception will be thrown.
To disable the `'error'` event, pass `emitErrors: false` in the constructor options.

```js
const keyv = new Keyv({ emitErrors: false });
```

In addition it will emit `clear` and `disconnect` events when the corresponding methods are called.

```js
const keyv = new Keyv();
const handleConnectionError = err => console.log('Connection Error', err);
const handleClear = () => console.log('Cache Cleared');
const handleDisconnect = () => console.log('Disconnected');

keyv.on('error', handleConnectionError);
keyv.on('clear', handleClear);
keyv.on('disconnect', handleDisconnect);
```

# Hooks

Keyv supports hooks for `get`, `set`, and `delete` methods. Hooks are useful for logging, debugging, and other custom functionality. Here is a list of all the hooks:

```
PRE_GET
POST_GET
PRE_GET_MANY
POST_GET_MANY
PRE_SET
POST_SET
PRE_DELETE
POST_DELETE
```

You can access this by importing `KeyvHooks` from the main Keyv package.

```js
import Keyv, { KeyvHooks } from 'keyv';
```

```js
//PRE_SET hook
const keyv = new Keyv();
keyv.hooks.addHandler(KeyvHooks.PRE_SET, (data) => console.log(`Setting key ${data.key} to ${data.value}`));

//POST_SET hook
const keyv = new Keyv();
keyv.hooks.addHandler(KeyvHooks.POST_SET, ({key, value}) => console.log(`Set key ${key} to ${value}`));
```

In these examples you can also manipulate the value before it is set. For example, you could add a prefix to all keys.

```js
const keyv = new Keyv();
keyv.hooks.addHandler(KeyvHooks.PRE_SET, (data) => {
  console.log(`Manipulating key ${data.key} and ${data.value}`);
  data.key = `prefix-${data.key}`;
  data.value = `prefix-${data.value}`;
});
```

Now this key will have prefix- added to it before it is set.

In `PRE_DELETE` and `POST_DELETE` hooks, the value could be a single item or an `Array`. This is based on the fact that `delete` can accept a single key or an `Array` of keys.


# Custom Serializers

Keyv uses [`buffer`](https://nodejs.org/api/buffer.html) for data serialization to ensure consistency across different backends.

You can optionally provide your own serialization functions to support extra data types or to serialize to something other than JSON.

```js
const keyv = new Keyv({ serialize: JSON.stringify, deserialize: JSON.parse });
```

**Warning:** Using custom serializers means you lose any guarantee of data consistency. You should do extensive testing with your serialisation functions and chosen storage engine.

If you do not want to use serialization you can set the `serialize` and `deserialize` functions to `undefined`. This will also turn off compression.

```js
const keyv = new Keyv();
keyv.serialize = undefined;
keyv.deserialize = undefined;
```

# Official Storage Adapters

The official storage adapters are covered by [over 150 integration tests](https://github.com/jaredwray/keyv/actions/workflows/tests.yaml) to guarantee consistent behaviour. They are lightweight, efficient wrappers over the DB clients making use of indexes and native TTLs where available.

Database | Adapter | Native TTL
---|---|---
Redis | [@keyv/redis](https://github.com/jaredwray/keyv/tree/master/packages/redis) | Yes
Valkey | [@keyv/valkey](https://github.com/jaredwray/keyv/tree/master/packages/valkey) | Yes
MongoDB | [@keyv/mongo](https://github.com/jaredwray/keyv/tree/master/packages/mongo) | Yes 
SQLite | [@keyv/sqlite](https://github.com/jaredwray/keyv/tree/master/packages/sqlite) | No 
PostgreSQL | [@keyv/postgres](https://github.com/jaredwray/keyv/tree/master/packages/postgres) | No 
MySQL | [@keyv/mysql](https://github.com/jaredwray/keyv/tree/master/packages/mysql) | No 
Etcd | [@keyv/etcd](https://github.com/jaredwray/keyv/tree/master/packages/etcd) | Yes
Memcache | [@keyv/memcache](https://github.com/jaredwray/keyv/tree/master/packages/memcache) | Yes
DynamoDB | [@keyv/dynamo](https://github.com/jaredwray/keyv/tree/master/packages/dynamo) | Yes 

# Third-party Storage Adapters

You can also use third-party storage adapters or build your own. Keyv will wrap these storage adapters in TTL functionality and handle complex types internally.

```js
import Keyv from 'keyv';
import myAdapter from 'my-adapter';

const keyv = new Keyv({ store: myAdapter });
```

Any store that follows the [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) api will work.

```js
new Keyv({ store: new Map() });
```

For example, [`quick-lru`](https://github.com/sindresorhus/quick-lru) is a completely unrelated module that implements the Map API.

```js
import Keyv from 'keyv';
import QuickLRU from 'quick-lru';

const lru = new QuickLRU({ maxSize: 1000 });
const keyv = new Keyv({ store: lru });
```

The following are third-party storage adapters compatible with Keyv:

- [quick-lru](https://github.com/sindresorhus/quick-lru) - Simple "Least Recently Used" (LRU) cache
- [keyv-file](https://github.com/zaaack/keyv-file) - File system storage adapter for Keyv
- [keyv-lru](https://www.npmjs.com/package/keyv-lru) - LRU storage adapter for Keyv
- [keyv-null](https://www.npmjs.com/package/keyv-null) - Null storage adapter for Keyv
- [keyv-firestore ](https://github.com/goto-bus-stop/keyv-firestore) – Firebase Cloud Firestore adapter for Keyv
- [keyv-mssql](https://github.com/pmorgan3/keyv-mssql) - Microsoft Sql Server adapter for Keyv
- [keyv-azuretable](https://github.com/howlowck/keyv-azuretable) - Azure Table Storage/API adapter for Keyv
- [keyv-arango](https://github.com/TimMikeladze/keyv-arango) - ArangoDB storage adapter for Keyv
- [keyv-momento](https://github.com/momentohq/node-keyv-adaptor/) - Momento storage adapter for Keyv
- [@resolid/keyv-sqlite](https://github.com/huijiewei/keyv-sqlite) - A new SQLite storage adapter for Keyv

# Compression

Keyv supports `gzip`, `brotli` and `lz4` compression. To enable compression, pass the `compress` option to the constructor.

```js
import Keyv from 'keyv';
import KeyvGzip from '@keyv/compress-gzip';

const keyvGzip = new KeyvGzip();
const keyv = new Keyv({ compression: keyvGzip });
```

```js
import Keyv from 'keyv';
import KeyvBrotli from '@keyv/compress-brotli';

const keyvBrotli = new KeyvBrotli();
const keyv = new Keyv({ compression: keyvBrotli });
```

```js
import Keyv from 'keyv';
import KeyvLz4 from '@keyv/compress-lz4';

const keyvLz4 = new KeyvLz4();
const keyv = new Keyv({ compression: keyvLz4 });
```

You can also pass a custom compression function to the `compression` option. Following the pattern of the official compression adapters.

## Want to build your own CompressionAdapter? 

Great! Keyv is designed to be easily extended. You can build your own compression adapter by following the pattern of the official compression adapters based on this interface:

```typescript
interface CompressionAdapter {
	async compress(value: any, options?: any);
	async decompress(value: any, options?: any);
	async serialize(value: any);
	async deserialize(value: any);
}
```

In addition to the interface, you can test it with our compression test suite using @keyv/test-suite:

```js
import { keyvCompresstionTests } from '@keyv/test-suite';
import KeyvGzip from '@keyv/compress-gzip';

keyvCompresstionTests(test, new KeyvGzip());
```

# API

## new Keyv([storage-adapter], [options]) or new Keyv([options])

Returns a new Keyv instance.

The Keyv instance is also an `EventEmitter` that will emit an `'error'` event if the storage adapter connection fails.

## storage-adapter

Type: `KeyvStorageAdapter`<br />
Default: `undefined`

The connection string URI.

Merged into the options object as options.uri.

## .namespace

Type: `String`
Default: `'keyv'`

This is the namespace for the current instance. When you set it it will set it also on the storage adapter. This is the preferred way to set the namespace over `.opts.namespace`.

## options

Type: `Object`

The options object is also passed through to the storage adapter. Check your storage adapter docs for any extra options.

## options.namespace

Type: `String`<br />
Default: `'keyv'`

Namespace for the current instance.

## options.ttl

Type: `Number`<br />
Default: `undefined`

Default TTL. Can be overridden by specififying a TTL on `.set()`.

## options.compression

Type: `@keyv/compress-<compression_package_name>`<br />
Default: `undefined`

Compression package to use. See [Compression](#compression) for more details.

## options.serialize

Type: `Function`<br />
Default: `JSON.stringify`

A custom serialization function.

## options.deserialize

Type: `Function`<br />
Default: `JSON.parse`

A custom deserialization function.

## options.store

Type: `Storage adapter instance`<br />
Default: `new Map()`

The storage adapter instance to be used by Keyv.

# Keyv Instance

Keys must always be strings. Values can be of any type.

## .set(key, value, [ttl])

Set a value.

By default keys are persistent. You can set an expiry TTL in milliseconds.

Returns a promise which resolves to `true`.

## .setMany(entries)

Set multiple values using KeyvEntrys `{ key: string, value: any, ttl?: number }`.

## .get(key, [options])

Returns a promise which resolves to the retrieved value.

## .getMany(keys, [options])

Returns a promise which resolves to an array of retrieved values.

### options.raw - (Will be deprecated in v6)

Type: `Boolean`<br />
Default: `false`

If set to true the raw DB object Keyv stores internally will be returned instead of just the value.

This contains the TTL timestamp.

NOTE: This option will be deprecated in v6 and replaced with `.getRaw()` and `.getManyRaw()` methods.

## .getRaw(key)

Returns a promise which resolves to the raw stored data for the key or `undefined` if the key does not exist or is expired.

## .getManyRaw(keys)

Returns a promise which resolves to an array of raw stored data for the keys or `undefined` if the key does not exist or is expired.

## .delete(key)

Deletes an entry.

Returns a promise which resolves to `true` if the key existed, `false` if not.

## .deleteMany(keys)
Deletes multiple entries.
Returns a promise which resolves to an array of booleans indicating if the key existed or not.

## .clear()

Delete all entries in the current namespace.

Returns a promise which is resolved when the entries have been cleared.

## .iterator()

Iterate over all entries of the current namespace.

Returns a iterable that can be iterated by for-of loops. For example:

```js
// please note that the "await" keyword should be used here
for await (const [key, value] of this.keyv.iterator()) {
  console.log(key, value);
};
```

# API - Properties

## .namespace

Type: `String`

The namespace for the current instance. This will define the namespace for the current instance and the storage adapter. If you set the namespace to `undefined` it will no longer do key prefixing.

```js
const keyv = new Keyv({ namespace: 'my-namespace' });
console.log(keyv.namespace); // 'my-namespace'
```

here is an example of setting the namespace to `undefined`:

```js
const keyv = new Keyv();
console.log(keyv.namespace); // 'keyv' which is default
keyv.namespace = undefined;
console.log(keyv.namespace); // undefined
```

## .ttl

Type: `Number`<br />
Default: `undefined`

Default TTL. Can be overridden by specififying a TTL on `.set()`. If set to `undefined` it will never expire.

```js
const keyv = new Keyv({ ttl: 5000 });
console.log(keyv.ttl); // 5000
keyv.ttl = undefined;
console.log(keyv.ttl); // undefined (never expires)
```

## .store

Type: `Storage adapter instance`<br />
Default: `new Map()`

The storage adapter instance to be used by Keyv. This will wire up the iterator, events, and more when a set happens. If it is not a valid Map or Storage Adapter it will throw an error. 

```js
import KeyvSqlite from '@keyv/sqlite';
const keyv = new Keyv();
console.log(keyv.store instanceof Map); // true
keyv.store = new KeyvSqlite('sqlite://path/to/database.sqlite');
console.log(keyv.store instanceof KeyvSqlite); // true
```

## .serialize

Type: `Function`<br />
Default: `JSON.stringify`

A custom serialization function used for any value. 

```js
const keyv = new Keyv();
console.log(keyv.serialize); // JSON.stringify
keyv.serialize = value => value.toString();
console.log(keyv.serialize); // value => value.toString()
```

## .deserialize

Type: `Function`<br />
Default: `JSON.parse`

A custom deserialization function used for any value.

```js
const keyv = new Keyv();
console.log(keyv.deserialize); // JSON.parse
keyv.deserialize = value => parseInt(value);
console.log(keyv.deserialize); // value => parseInt(value)
```

## .compression

Type: `CompressionAdapter`<br />
Default: `undefined`

this is the compression package to use. See [Compression](#compression) for more details. If it is undefined it will not compress (default).

```js
import KeyvGzip from '@keyv/compress-gzip';

const keyv = new Keyv();
console.log(keyv.compression); // undefined
keyv.compression = new KeyvGzip();
console.log(keyv.compression); // KeyvGzip
```

## .useKeyPrefix

Type: `Boolean`<br />
Default: `true`

If set to `true` Keyv will prefix all keys with the namespace. This is useful if you want to avoid collisions with other data in your storage.

```js
const keyv = new Keyv({ useKeyPrefix: false });
console.log(keyv.useKeyPrefix); // false
keyv.useKeyPrefix = true;
console.log(keyv.useKeyPrefix); // true
```

With many of the storage adapters you will also need to set the `namespace` option to `undefined` to have it work correctly. This is because in `v5` we started the transition to having the storage adapter handle the namespacing and `Keyv` will no longer handle it internally via KeyPrefixing. Here is an example of doing ith with `KeyvSqlite`:

```js
import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';

const store = new KeyvSqlite('sqlite://path/to/database.sqlite');
const keyv = new Keyv({ store });
keyv.useKeyPrefix = false; // disable key prefixing
store.namespace = undefined; // disable namespacing in the storage adapter

await keyv.set('foo', 'bar'); // true
await keyv.get('foo'); // 'bar'
await keyv.clear();
```

## .throwOnErrors

Type: `Boolean`<br />
Default: `false`

If set to `true`, Keyv will throw an error if any operation fails. This is useful if you want to ensure that all operations are successful and you want to handle errors.

```js
const keyv = new Keyv({ throwOnErrors: true });
console.log(keyv.throwOnErrors); // true
keyv.throwOnErrors = false;
console.log(keyv.throwOnErrors); // false
```

A good example of this is with the `@keyv/redis` storage adapter. If you want to handle connection errors, retries, and timeouts more gracefully, you can use the `throwOnErrors` option. This will throw an error if any operation fails, allowing you to catch it and handle it accordingly:

```js
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

// create redis instance that will throw on connection error
const keyvRedis = new KeyvRedis('redis://user:pass@localhost:6379', { throwOnConnectErrors: true });

const keyv = new Keyv({ store: keyvRedis, throwOnErrors: true });
```

What this does is it only throw on connection errors with the Redis client.

# How to Contribute

We welcome contributions to Keyv! 🎉 Here are some guides to get you started with contributing:

* [Contributing](https://github.com/jaredwray/keyv/blob/main/CONTRIBUTING.md) - Learn about how to contribute to Keyv
* [Code of Conduct](https://github.com/jaredwray/keyv/blob/main/CODE_OF_CONDUCT.md) - Learn about the Keyv Code of Conduct
* [How to Contribute](https://github.com/jaredwray/keyv/blob/main/README.md) - How do develop in the Keyv mono repo! 

# License

[MIT © Jared Wray](LICENSE)
