# ioredis-mock &middot; [![npm](https://img.shields.io/npm/dm/ioredis-mock.svg?style=flat-square)](https://npm-stat.com/charts.html?package=ioredis-mock) [![npm version](https://img.shields.io/npm/v/ioredis-mock.svg?style=flat-square)](https://www.npmjs.com/package/ioredis-mock) [![Redis Compatibility: 65%](https://img.shields.io/badge/redis-65%25-orange.svg?style=flat-square)](compat.md) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

This library emulates [ioredis](https://github.com/luin/ioredis) by performing
all operations in-memory. The best way to do integration testing against redis
and ioredis is on a real redis-server instance. However, there are cases where
mocking the redis-server is a better option.

Cases like:

- Your workflow already use a local redis-server instance for the dev server.
- You're on a platform
  [without an official redis release](https://github.com/MSOpenTech/redis),
  that's even worse than using an emulator.
- You're running tests on a CI, setting it up is complicated. If you combine it
  with CI that also run selenium acceptance testing it's even more complicated,
  as two redis-server instances on the same CI build is hard.
- The GitHub repo have bots that run the testing suite and is limited through
  npm package.json install scripts and can't fire up servers. (Having
  [Renovatebot](https://renovatebot.com/) notifying you when a new release of
  ioredis is out and wether your code breaks or not is awesome).

Check the [compatibility table](compat.md) for supported redis commands.

## Usage ([try it in your browser with RunKit](https://runkit.com/npm/ioredis-mock))

```js
const Redis = require('ioredis-mock')
const redis = new Redis({
  // `options.data` does not exist in `ioredis`, only `ioredis-mock`
  data: {
    user_next: '3',
    emails: {
      'clark@daily.planet': '1',
      'bruce@wayne.enterprises': '2',
    },
    'user:1': { id: '1', username: 'superman', email: 'clark@daily.planet' },
    'user:2': { id: '2', username: 'batman', email: 'bruce@wayne.enterprises' },
  },
})
// Basically use it just like ioredis
```

## Browser usage (Experimental)

There's a browser build available. You can import it directly (`import Redis from 'ioredis-mock/browser.js'`), or use it on unpkg.com:

```js
import Redis from 'https://unpkg.com/ioredis-mock'

const redis = new Redis()
redis.set('foo', 'bar')
console.log(await redis.get('foo'))
```

## Breaking Changes

### from v7 to v8

#### `ioredis@v4` support dropped

`ioredis@v5` is the new baseline. Stay on `ioredis-mock@v7` until you're ready to upgrade to `ioredis@v5`.

#### `PromiseContainer` has been removed.

Support for third-party Promise libraries is dropped. The native Promise library
will always be used.

### from v6 to v7

#### `createConnectedClient` is removed

Replace it with `.duplicate()` or use another `new Redis` instance.

#### Dropped support for Node v10

[It's been EOL since Apr, 2021 and it's recommended to upgrade to v14.x LTS.](https://twitter.com/nodejs/status/1388116425361874945)

#### `ioredis-mock/jest.js` is removed

`ioredis-mock` is no longer doing a `import { Command } from 'ioredis'` internally, it's now doing a direct import `import Command from 'ioredis/built/command'` and thus the `jest.js` [workaround](https://github.com/stipsan/ioredis-mock/issues/568) is no longer needed:

```diff
-jest.mock('ioredis', () => require('ioredis-mock/jest'))
+jest.mock('ioredis', () => require('ioredis-mock'))
```

### from v5 to v6

Before v6, each instance of `ioredis-mock` lived in isolation:

```js
const Redis = require('ioredis-mock')
const redis1 = new Redis()
const redis2 = new Redis()

await redis1.set('foo', 'bar')
console.log(await redis1.get('foo'), await redis2.get('foo')) // 'bar', null
```

In v6 the [internals were rewritten](https://github.com/stipsan/ioredis-mock/pull/1110) to behave more like real life redis, if the host and port is the same, the context is now shared:

```js
const Redis = require('ioredis-mock')
const redis1 = new Redis()
const redis2 = new Redis()
const redis3 = new Redis(6380) // 6379 is the default port

await redis1.set('foo', 'bar')
console.log(
  await redis1.get('foo'), // 'bar'
  await redis2.get('foo'), // 'bar'
  await redis3.get('foo') // null
)
```

And since `ioredis-mock` now persist data between instances, you'll [likely](https://github.com/luin/ioredis/blob/8278ec0a435756c54ba4f98587aec1a913e8b7d3/test/helpers/global.ts#L8) need to run `flushall` between testing suites:

```js
const Redis = require('ioredis-mock')

afterEach(done => {
  new Redis().flushall().then(() => done())
})
```

## Pub/Sub channels

We also support redis [publish/subscribe](https://redis.io/topics/pubsub) channels.
Like [ioredis](https://github.com/luin/ioredis#pubsub), you need two clients:

```js
const Redis = require('ioredis-mock')
const redisPub = new Redis()
const redisSub = new Redis()

redisSub.on('message', (channel, message) => {
  console.log(`Received ${message} from ${channel}`)
})
redisSub.subscribe('emails')
redisPub.publish('emails', 'clark@daily.planet')
```

## Lua scripting

You can use the `defineCommand` to define custom commands using lua or `eval` to directly execute lua code.

In order to create custom commands, using [lua](http://lua.org) scripting, [ioredis exposes the defineCommand method](https://github.com/luin/ioredis#lua-scripting).

You could define a custom command `multiply` which accepts one
key and one argument. A redis key, where you can get the multiplicand, and an argument which will be the multiplicator:

```js
const Redis = require('ioredis-mock')
const redis = new Redis({ data: { k1: 5 } })
const commandDefinition = {
  numberOfKeys: 1,
  lua: 'return redis.call("GET", KEYS[1]) * ARGV[1]',
}
redis.defineCommand('multiply', commandDefinition) // defineCommand(name, definition)
// now we can call our brand new multiply command as an ordinary command
redis.multiply('k1', 10).then(result => {
  expect(result).toBe(5 * 10)
})
```

You can also achieve the same effect by using the `eval` command:

```js
const Redis = require('ioredis-mock')
const redis = new Redis({ data: { k1: 5 } })
const result = redis.eval(`return redis.call("GET", "k1") * 10`)
expect(result).toBe(5 * 10)
```

note we are calling the ordinary redis `GET` command by using the global `redis` object's `call` method.

As a difference from ioredis we currently don't support:

- dynamic key number by passing the number of keys as the first argument of the command.
- automatic definition of the custom command buffer companion (i.e. for the custom command `multiply` the `multiplyBuffer` which returns values using `Buffer.from(...)`)
- the `evalsha` command
- the `script` command

## Cluster(Experimental)

Work on Cluster support has started, the current implementation is minimal and PRs welcome #359

```js
const Redis = require('ioredis-mock')

const cluster = new Redis.Cluster(['redis://localhost:7001'])
const nodes = cluster.nodes()
expect(nodes.length).toEqual(1)
```

## [Roadmap](https://github.com/users/stipsan/projects/1/views/4)

You can check the [roadmap project page](https://github.com/users/stipsan/projects/1/views/4), and [the compat table](compat.md), to see how close we are to feature parity with `ioredis`.

## I need a feature not listed here

Just create an issue and tell us all about it or submit a PR with it! 😄
