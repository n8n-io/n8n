# pg-pool

[![Build Status](https://travis-ci.org/brianc/node-pg-pool.svg?branch=master)](https://travis-ci.org/brianc/node-pg-pool)

A connection pool for node-postgres

## install

```sh
npm i pg-pool pg
```

## use

### create

to use pg-pool you must first create an instance of a pool

```js
const Pool = require('pg-pool')

// by default the pool uses the same
// configuration as whatever `pg` version you have installed
const pool = new Pool()

// you can pass properties to the pool
// these properties are passed unchanged to both the node-postgres Client constructor
// and the pool constructor, allowing you to fully configure the behavior of both
const pool2 = new Pool({
  database: 'postgres',
  user: 'brianc',
  password: 'secret!',
  port: 5432,
  ssl: true,
  max: 20, // set pool max size to 20
  idleTimeoutMillis: 1000, // close idle clients after 1 second
  connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
  maxUses: 7500, // close (and replace) a connection after it has been used 7500 times (see below for discussion)
})

// you can supply a custom client constructor
// if you want to use the native postgres client
const NativeClient = require('pg').native.Client
const nativePool = new Pool({ Client: NativeClient })

// you can even pool pg-native clients directly
const PgNativeClient = require('pg-native')
const pgNativePool = new Pool({ Client: PgNativeClient })
```

##### Note:

The Pool constructor does not support passing a Database URL as the parameter. To use pg-pool on heroku, for example, you need to parse the URL into a config object. Here is an example of how to parse a Database URL.

```js
const Pool = require('pg-pool')
const url = require('url')

const params = url.parse(process.env.DATABASE_URL)
const auth = params.auth.split(':')

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true,
}

const pool = new Pool(config)

/*
  Transforms, 'postgres://DBuser:secret@DBHost:#####/myDB', into
  config = {
    user: 'DBuser',
    password: 'secret',
    host: 'DBHost',
    port: '#####',
    database: 'myDB',
    ssl: true
  }
*/
```

### acquire clients with a promise

pg-pool supports a fully promise-based api for acquiring clients

```js
const pool = new Pool()
pool.connect().then((client) => {
  client
    .query('select $1::text as name', ['pg-pool'])
    .then((res) => {
      client.release()
      console.log('hello from', res.rows[0].name)
    })
    .catch((e) => {
      client.release()
      console.error('query error', e.message, e.stack)
    })
})
```

### plays nice with async/await

this ends up looking much nicer if you're using [co](https://github.com/tj/co) or async/await:

```js
// with async/await
;(async () => {
  const pool = new Pool()
  const client = await pool.connect()
  try {
    const result = await client.query('select $1::text as name', ['brianc'])
    console.log('hello from', result.rows[0])
  } finally {
    client.release()
  }
})().catch((e) => console.error(e.message, e.stack))

// with co
co(function* () {
  const client = yield pool.connect()
  try {
    const result = yield client.query('select $1::text as name', ['brianc'])
    console.log('hello from', result.rows[0])
  } finally {
    client.release()
  }
}).catch((e) => console.error(e.message, e.stack))
```

### your new favorite helper method

because its so common to just run a query and return the client to the pool afterward pg-pool has this built-in:

```js
const pool = new Pool()
const time = await pool.query('SELECT NOW()')
const name = await pool.query('select $1::text as name', ['brianc'])
console.log(name.rows[0].name, 'says hello at', time.rows[0].now)
```

you can also use a callback here if you'd like:

```js
const pool = new Pool()
pool.query('SELECT $1::text as name', ['brianc'], function (err, res) {
  console.log(res.rows[0].name) // brianc
})
```

**pro tip:** unless you need to run a transaction (which requires a single client for multiple queries) or you
have some other edge case like [streaming rows](https://github.com/brianc/node-pg-query-stream) or using a [cursor](https://github.com/brianc/node-pg-cursor)
you should almost always just use `pool.query`. Its easy, it does the right thing :tm:, and wont ever forget to return
clients back to the pool after the query is done.

### drop-in backwards compatible

pg-pool still and will always support the traditional callback api for acquiring a client. This is the exact API node-postgres has shipped with for years:

```js
const pool = new Pool()
pool.connect((err, client, done) => {
  if (err) return done(err)

  client.query('SELECT $1::text as name', ['pg-pool'], (err, res) => {
    done()
    if (err) {
      return console.error('query error', err.message, err.stack)
    }
    console.log('hello from', res.rows[0].name)
  })
})
```

### shut it down

When you are finished with the pool if all the clients are idle the pool will close them after `config.idleTimeoutMillis` and your app
will shutdown gracefully. If you don't want to wait for the timeout you can end the pool as follows:

```js
const pool = new Pool()
const client = await pool.connect()
console.log(await client.query('select now()'))
client.release()
await pool.end()
```

### a note on instances

The pool should be a **long-lived object** in your application. Generally you'll want to instantiate one pool when your app starts up and use the same instance of the pool throughout the lifetime of your application. If you are frequently creating a new pool within your code you likely don't have your pool initialization code in the correct place. Example:

```js
// assume this is a file in your program at ./your-app/lib/db.js

// correct usage: create the pool and let it live
// 'globally' here, controlling access to it through exported methods
const pool = new pg.Pool()

// this is the right way to export the query method
module.exports.query = (text, values) => {
  console.log('query:', text, values)
  return pool.query(text, values)
}

// this would be the WRONG way to export the connect method
module.exports.connect = () => {
  // notice how we would be creating a pool instance here
  // every time we called 'connect' to get a new client?
  // that's a bad thing & results in creating an unbounded
  // number of pools & therefore connections
  const aPool = new pg.Pool()
  return aPool.connect()
}
```

### events

Every instance of a `Pool` is an event emitter. These instances emit the following events:

#### error

Emitted whenever an idle client in the pool encounters an error. This is common when your PostgreSQL server shuts down, reboots, or a network partition otherwise causes it to become unavailable while your pool has connected clients.

Example:

```js
const Pool = require('pg-pool')
const pool = new Pool()

// attach an error handler to the pool for when a connected, idle client
// receives an error by being disconnected, etc
pool.on('error', function (error, client) {
  // handle this in the same way you would treat process.on('uncaughtException')
  // it is supplied the error as well as the idle client which received the error
})
```

#### connect

Fired whenever the pool creates a **new** `pg.Client` instance and successfully connects it to the backend.

Example:

```js
const Pool = require('pg-pool')
const pool = new Pool()

const count = 0

pool.on('connect', (client) => {
  client.count = count++
})

pool
  .connect()
  .then((client) => {
    return client
      .query('SELECT $1::int AS "clientCount"', [client.count])
      .then((res) => console.log(res.rows[0].clientCount)) // outputs 0
      .then(() => client)
  })
  .then((client) => client.release())
```

#### acquire

Fired whenever a client is acquired from the pool

Example:

This allows you to count the number of clients which have ever been acquired from the pool.

```js
const Pool = require('pg-pool')
const pool = new Pool()

const acquireCount = 0
pool.on('acquire', function (client) {
  acquireCount++
})

const connectCount = 0
pool.on('connect', function () {
  connectCount++
})

for (let i = 0; i < 200; i++) {
  pool.query('SELECT NOW()')
}

setTimeout(function () {
  console.log('connect count:', connectCount) // output: connect count: 10
  console.log('acquire count:', acquireCount) // output: acquire count: 200
}, 100)
```

### environment variables

pg-pool & node-postgres support some of the same environment variables as `psql` supports. The most common are:

```
PGDATABASE=my_db
PGUSER=username
PGPASSWORD="my awesome password"
PGPORT=5432
PGSSLMODE=require
```

Usually I will export these into my local environment via a `.env` file with environment settings or export them in `~/.bash_profile` or something similar. This way I get configurability which works with both the postgres suite of tools (`psql`, `pg_dump`, `pg_restore`) and node, I can vary the environment variables locally and in production, and it supports the concept of a [12-factor app](http://12factor.net/) out of the box.

## maxUses and read-replica autoscaling (e.g. AWS Aurora)

The maxUses config option can help an application instance rebalance load against a replica set that has been auto-scaled after the connection pool is already full of healthy connections.

The mechanism here is that a connection is considered "expended" after it has been acquired and released `maxUses` number of times. Depending on the load on your system, this means there will be an approximate time in which any given connection will live, thus creating a window for rebalancing.

Imagine a scenario where you have 10 app instances providing an API running against a replica cluster of 3 that are accessed via a round-robin DNS entry. Each instance runs a connection pool size of 20. With an ambient load of 50 requests per second, the connection pool will likely fill up in a few minutes with healthy connections.

If you have weekly bursts of traffic which peak at 1,000 requests per second, you might want to grow your replicas to 10 during this period. Without setting `maxUses`, the new replicas will not be adopted by the app servers without an intervention -- namely, restarting each in turn in order to build up new connection pools that are balanced against all the replicas. Adding additional app server instances will help to some extent because they will adopt all the replicas in an even way, but the initial app servers will continue to focus additional load on the original replicas.

This is where the `maxUses` configuration option comes into play. Setting `maxUses` to 7500 will ensure that over a period of 30 minutes or so the new replicas will be adopted as the pre-existing connections are closed and replaced with new ones, thus creating a window for eventual balance.

You'll want to test based on your own scenarios, but one way to make a first guess at `maxUses` is to identify an acceptable window for rebalancing and then solve for the value:

```
maxUses = rebalanceWindowSeconds * totalRequestsPerSecond / numAppInstances / poolSize
```

In the example above, assuming we acquire and release 1 connection per request and we are aiming for a 30 minute rebalancing window:

```
maxUses = rebalanceWindowSeconds * totalRequestsPerSecond / numAppInstances / poolSize
   7200 =        1800            *          1000          /        10       /    25
```

## tests

To run tests clone the repo, `npm i` in the working dir, and then run `npm test`

## contributions

I love contributions. Please make sure they have tests, and submit a PR. If you're not sure if the issue is worth it or will be accepted it never hurts to open an issue to begin the conversation. If you're interested in keeping up with node-postgres releated stuff, you can follow me on twitter at [@briancarlson](https://twitter.com/briancarlson) - I generally announce any noteworthy updates there.

## license

The MIT License (MIT)
Copyright (c) 2016 Brian M. Carlson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
