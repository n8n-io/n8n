# Node-Redis

[![Tests](https://img.shields.io/github/actions/workflow/status/redis/node-redis/tests.yml?branch=master)](https://github.com/redis/node-redis/actions/workflows/tests.yml)
[![Coverage](https://codecov.io/gh/redis/node-redis/branch/master/graph/badge.svg?token=xcfqHhJC37)](https://codecov.io/gh/redis/node-redis)
[![License](https://img.shields.io/github/license/redis/node-redis.svg)](https://github.com/redis/node-redis/blob/master/LICENSE)

[![Discord](https://img.shields.io/discord/697882427875393627.svg?style=social&logo=discord)](https://discord.gg/redis)
[![Twitch](https://img.shields.io/twitch/status/redisinc?style=social)](https://www.twitch.tv/redisinc)
[![YouTube](https://img.shields.io/youtube/channel/views/UCD78lHSwYqMlyetR0_P4Vig?style=social)](https://www.youtube.com/redisinc)
[![Twitter](https://img.shields.io/twitter/follow/redisinc?style=social)](https://twitter.com/redisinc)

node-redis is a modern, high performance [Redis](https://redis.io) client for Node.js.

## How do I Redis?

[Learn for free at Redis University](https://university.redis.com/)

[Build faster with the Redis Launchpad](https://launchpad.redis.com/)

[Try the Redis Cloud](https://redis.com/try-free/)

[Dive in developer tutorials](https://developer.redis.com/)

[Join the Redis community](https://redis.com/community/)

[Work at Redis](https://redis.com/company/careers/jobs/)

## Packages

| Name                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
|----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [redis](./)                                  | [![Downloads](https://img.shields.io/npm/dm/redis.svg)](https://www.npmjs.com/package/redis) [![Version](https://img.shields.io/npm/v/redis.svg)](https://www.npmjs.com/package/redis)                                                                                                                                                                                                                                         |
| [@redis/client](./packages/client)           | [![Downloads](https://img.shields.io/npm/dm/@redis/client.svg)](https://www.npmjs.com/package/@redis/client) [![Version](https://img.shields.io/npm/v/@redis/client.svg)](https://www.npmjs.com/package/@redis/client) [![Docs](https://img.shields.io/badge/-documentation-dc382c)](https://redis.js.org/documentation/client/)                                                                                               |
| [@redis/bloom](./packages/bloom)             | [![Downloads](https://img.shields.io/npm/dm/@redis/bloom.svg)](https://www.npmjs.com/package/@redis/bloom) [![Version](https://img.shields.io/npm/v/@redis/bloom.svg)](https://www.npmjs.com/package/@redis/bloom) [![Docs](https://img.shields.io/badge/-documentation-dc382c)](https://redis.js.org/documentation/bloom/) [Redis Bloom](https://oss.redis.com/redisbloom/) commands                                          |
| [@redis/graph](./packages/graph)             | [![Downloads](https://img.shields.io/npm/dm/@redis/graph.svg)](https://www.npmjs.com/package/@redis/graph) [![Version](https://img.shields.io/npm/v/@redis/graph.svg)](https://www.npmjs.com/package/@redis/graph) [![Docs](https://img.shields.io/badge/-documentation-dc382c)](https://redis.js.org/documentation/graph/) [Redis Graph](https://oss.redis.com/redisgraph/) commands                                          |
| [@redis/json](./packages/json)               | [![Downloads](https://img.shields.io/npm/dm/@redis/json.svg)](https://www.npmjs.com/package/@redis/json) [![Version](https://img.shields.io/npm/v/@redis/json.svg)](https://www.npmjs.com/package/@redis/json) [![Docs](https://img.shields.io/badge/-documentation-dc382c)](https://redis.js.org/documentation/json/) [Redis JSON](https://oss.redis.com/redisjson/) commands                                                 |
| [@redis/search](./packages/search)           | [![Downloads](https://img.shields.io/npm/dm/@redis/search.svg)](https://www.npmjs.com/package/@redis/search) [![Version](https://img.shields.io/npm/v/@redis/search.svg)](https://www.npmjs.com/package/@redis/search) [![Docs](https://img.shields.io/badge/-documentation-dc382c)](https://redis.js.org/documentation/search/) [RediSearch](https://oss.redis.com/redisearch/) commands                                    |
| [@redis/time-series](./packages/time-series) | [![Downloads](https://img.shields.io/npm/dm/@redis/time-series.svg)](https://www.npmjs.com/package/@redis/time-series) [![Version](https://img.shields.io/npm/v/@redis/time-series.svg)](https://www.npmjs.com/package/@redis/time-series) [![Docs](https://img.shields.io/badge/-documentation-dc382c)](https://redis.js.org/documentation/time-series/) [Redis Time-Series](https://oss.redis.com/redistimeseries/) commands |

> :warning: In version 4.1.0 we moved our subpackages from `@node-redis` to `@redis`. If you're just using `npm install redis`, you don't need to do anything—it'll upgrade automatically. If you're using the subpackages directly, you'll need to point to the new scope (e.g. `@redis/client` instead of `@node-redis/client`).

## Installation

Start a redis via docker:

``` bash
docker run -p 6379:6379 -it redis/redis-stack-server:latest
```

To install node-redis, simply:

```bash
npm install redis
```

> :warning: The new interface is clean and cool, but if you have an existing codebase, you'll want to read the [migration guide](./docs/v3-to-v4.md).

Looking for a high-level library to handle object mapping? See [redis-om-node](https://github.com/redis/redis-om-node)!

## Usage

### Basic Example

```typescript
import { createClient } from 'redis';

const client = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect();

await client.set('key', 'value');
const value = await client.get('key');
await client.disconnect();
```

The above code connects to localhost on port 6379. To connect to a different host or port, use a connection string in the format `redis[s]://[[username][:password]@][host][:port][/db-number]`:

```typescript
createClient({
  url: 'redis://alice:foobared@awesome.redis.server:6380'
});
```

You can also use discrete parameters, UNIX sockets, and even TLS to connect. Details can be found in the [client configuration guide](./docs/client-configuration.md).

To check if the the client is connected and ready to send commands, use `client.isReady` which returns a boolean. `client.isOpen` is also available.  This returns `true` when the client's underlying socket is open, and `false` when it isn't (for example when the client is still connecting or reconnecting after a network error).

### Redis Commands

There is built-in support for all of the [out-of-the-box Redis commands](https://redis.io/commands). They are exposed using the raw Redis command names (`HSET`, `HGETALL`, etc.) and a friendlier camel-cased version (`hSet`, `hGetAll`, etc.):

```typescript
// raw Redis commands
await client.HSET('key', 'field', 'value');
await client.HGETALL('key');

// friendly JavaScript commands
await client.hSet('key', 'field', 'value');
await client.hGetAll('key');
```

Modifiers to commands are specified using a JavaScript object:

```typescript
await client.set('key', 'value', {
  EX: 10,
  NX: true
});
```

Replies will be transformed into useful data structures:

```typescript
await client.hGetAll('key'); // { field1: 'value1', field2: 'value2' }
await client.hVals('key'); // ['value1', 'value2']
```

`Buffer`s are supported as well:

```typescript
await client.hSet('key', 'field', Buffer.from('value')); // 'OK'
await client.hGetAll(
  commandOptions({ returnBuffers: true }),
  'key'
); // { field: <Buffer 76 61 6c 75 65> }
```

### Unsupported Redis Commands

If you want to run commands and/or use arguments that Node Redis doesn't know about (yet!) use `.sendCommand()`:

```typescript
await client.sendCommand(['SET', 'key', 'value', 'NX']); // 'OK'

await client.sendCommand(['HGETALL', 'key']); // ['key1', 'field1', 'key2', 'field2']
```

### Transactions (Multi/Exec)

Start a [transaction](https://redis.io/topics/transactions) by calling `.multi()`, then chaining your commands. When you're done, call `.exec()` and you'll get an array back with your results:

```typescript
await client.set('another-key', 'another-value');

const [setKeyReply, otherKeyValue] = await client
  .multi()
  .set('key', 'value')
  .get('another-key')
  .exec(); // ['OK', 'another-value']
```

You can also [watch](https://redis.io/topics/transactions#optimistic-locking-using-check-and-set) keys by calling `.watch()`. Your transaction will abort if any of the watched keys change.

To dig deeper into transactions, check out the [Isolated Execution Guide](./docs/isolated-execution.md).

### Blocking Commands

Any command can be run on a new connection by specifying the `isolated` option. The newly created connection is closed when the command's `Promise` is fulfilled.

This pattern works especially well for blocking commands—such as `BLPOP` and `BLMOVE`:

```typescript
import { commandOptions } from 'redis';

const blPopPromise = client.blPop(
  commandOptions({ isolated: true }),
  'key',
  0
);

await client.lPush('key', ['1', '2']);

await blPopPromise; // '2'
```

To learn more about isolated execution, check out the [guide](./docs/isolated-execution.md).

### Pub/Sub

See the [Pub/Sub overview](./docs/pub-sub.md).

### Scan Iterator

[`SCAN`](https://redis.io/commands/scan) results can be looped over using [async iterators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator):

```typescript
for await (const key of client.scanIterator()) {
  // use the key!
  await client.get(key);
}
```

This works with `HSCAN`, `SSCAN`, and `ZSCAN` too:

```typescript
for await (const { field, value } of client.hScanIterator('hash')) {}
for await (const member of client.sScanIterator('set')) {}
for await (const { score, value } of client.zScanIterator('sorted-set')) {}
```

You can override the default options by providing a configuration object:

```typescript
client.scanIterator({
  TYPE: 'string', // `SCAN` only
  MATCH: 'patter*',
  COUNT: 100
});
```

### [Programmability](https://redis.io/docs/manual/programmability/)

Redis provides a programming interface allowing code execution on the redis server.

#### [Functions](https://redis.io/docs/manual/programmability/functions-intro/)

The following example retrieves a key in redis, returning the value of the key, incremented by an integer. For example, if your key _foo_ has the value _17_ and we run `add('foo', 25)`, it returns the answer to Life, the Universe and Everything.

```lua
#!lua name=library

redis.register_function {
  function_name = 'add',
  callback = function(keys, args) return redis.call('GET', keys[1]) + args[1] end,
  flags = { 'no-writes' }
}
```

Here is the same example, but in a format that can be pasted into the `redis-cli`.

```
FUNCTION LOAD "#!lua name=library\nredis.register_function{function_name=\"add\", callback=function(keys, args) return redis.call('GET', keys[1])+args[1] end, flags={\"no-writes\"}}"
```

Load the prior redis function on the _redis server_ before running the example below.

```typescript
import { createClient } from 'redis';

const client = createClient({
  functions: {
    library: {
      add: {
        NUMBER_OF_KEYS: 1,
        transformArguments(key: string, toAdd: number): Array<string> {
          return [key, toAdd.toString()];
        },
        transformReply(reply: number): number {
          return reply;
        }
      }
    }
  }
});

await client.connect();

await client.set('key', '1');
await client.library.add('key', 2); // 3
```

#### [Lua Scripts](https://redis.io/docs/manual/programmability/eval-intro/)

The following is an end-to-end example of the prior concept.

```typescript
import { createClient, defineScript } from 'redis';

const client = createClient({
  scripts: {
    add: defineScript({
      NUMBER_OF_KEYS: 1,
      SCRIPT:
        'return redis.call("GET", KEYS[1]) + ARGV[1];',
      transformArguments(key: string, toAdd: number): Array<string> {
        return [key, toAdd.toString()];
      },
      transformReply(reply: number): number {
        return reply;
      }
    })
  }
});

await client.connect();

await client.set('key', '1');
await client.add('key', 2); // 3
```

### Disconnecting

There are two functions that disconnect a client from the Redis server. In most scenarios you should use `.quit()` to ensure that pending commands are sent to Redis before closing a connection.

#### `.QUIT()`/`.quit()`

Gracefully close a client's connection to Redis, by sending the [`QUIT`](https://redis.io/commands/quit) command to the server. Before quitting, the client executes any remaining commands in its queue, and will receive replies from Redis for each of them.

```typescript
const [ping, get, quit] = await Promise.all([
  client.ping(),
  client.get('key'),
  client.quit()
]); // ['PONG', null, 'OK']

try {
  await client.get('key');
} catch (err) {
  // ClosedClient Error
}
```

#### `.disconnect()`

Forcibly close a client's connection to Redis immediately. Calling `disconnect` will not send further pending commands to the Redis server, or wait for or parse outstanding responses.

```typescript
await client.disconnect();
```

### Auto-Pipelining

Node Redis will automatically pipeline requests that are made during the same "tick".

```typescript
client.set('Tm9kZSBSZWRpcw==', 'users:1');
client.sAdd('users:1:tokens', 'Tm9kZSBSZWRpcw==');
```

Of course, if you don't do something with your Promises you're certain to get [unhandled Promise exceptions](https://nodejs.org/api/process.html#process_event_unhandledrejection). To take advantage of auto-pipelining and handle your Promises, use `Promise.all()`.

```typescript
await Promise.all([
  client.set('Tm9kZSBSZWRpcw==', 'users:1'),
  client.sAdd('users:1:tokens', 'Tm9kZSBSZWRpcw==')
]);
```

### Clustering

Check out the [Clustering Guide](./docs/clustering.md) when using Node Redis to connect to a Redis Cluster.

### Events

The Node Redis client class is an Nodejs EventEmitter and it emits an event each time the network status changes:

| Name                    | When                                                                               | Listener arguments                                         |
|-------------------------|------------------------------------------------------------------------------------|------------------------------------------------------------|
| `connect`               | Initiating a connection to the server                                              | *No arguments*                                             |
| `ready`                 | Client is ready to use                                                             | *No arguments*                                             |
| `end`                   | Connection has been closed (via `.quit()` or `.disconnect()`)                      | *No arguments*                                             |
| `error`                 | An error has occurred—usually a network issue such as "Socket closed unexpectedly" | `(error: Error)`                                           |
| `reconnecting`          | Client is trying to reconnect to the server                                        | *No arguments*                                             |
| `sharded-channel-moved` | See [here](./docs/pub-sub.md#sharded-channel-moved-event)                          | See  [here](./docs/pub-sub.md#sharded-channel-moved-event) |

> :warning: You **MUST** listen to `error` events. If a client doesn't have at least one `error` listener registered and an `error` occurs, that error will be thrown and the Node.js process will exit. See the [`EventEmitter` docs](https://nodejs.org/api/events.html#events_error_events) for more details.

> The client will not emit [any other events](./docs/v3-to-v4.md#all-the-removed-events) beyond those listed above.

## Supported Redis versions

Node Redis is supported with the following versions of Redis:

| Version | Supported          |
|---------|--------------------|
| 7.0.z   | :heavy_check_mark: |
| 6.2.z   | :heavy_check_mark: |
| 6.0.z   | :heavy_check_mark: |
| 5.0.z   | :heavy_check_mark: |
| < 5.0   | :x:                |

> Node Redis should work with older versions of Redis, but it is not fully tested and we cannot offer support.

## Contributing

If you'd like to contribute, check out the [contributing guide](CONTRIBUTING.md).

Thank you to all the people who already contributed to Node Redis!

[![Contributors](https://contrib.rocks/image?repo=redis/node-redis)](https://github.com/redis/node-redis/graphs/contributors)

## License

This repository is licensed under the "MIT" license. See [LICENSE](LICENSE).
