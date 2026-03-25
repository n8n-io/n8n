[![build status](https://secure.travis-ci.org/coopernurse/node-pool.png)](http://travis-ci.org/coopernurse/node-pool)

# Generic Pool

## About

  Generic resource pool with Promise based API. Can be used to reuse or throttle usage of expensive resources such as database connections.



**V3 upgrade warning**

Version 3 contains many breaking changes. The differences are mostly minor and I hope easy to accommodate. There is a very rough and basic [upgrade guide](https://gist.github.com/sandfox/5ca20648b60a0cb959638c0cd6fcd02d) I've written, improvements and other attempts most welcome.

If you are after the older version 2 of this library you should look at the [current github branch](https://github.com/coopernurse/node-pool/tree/v2.5) for it.


## History

The history has been moved to the [CHANGELOG](CHANGELOG.md)


## Installation

```sh
$ npm install generic-pool [--save]
```


## Example

Here is an example using a fictional generic database driver that doesn't implement any pooling whatsoever itself.

```js
const genericPool = require("generic-pool");
const DbDriver = require("some-db-driver");

/**
 * Step 1 - Create pool using a factory object
 */
const factory = {
  create: function() {
    return DbDriver.createClient();
  },
  destroy: function(client) {
    client.disconnect();
  }
};

const opts = {
  max: 10, // maximum size of the pool
  min: 2 // minimum size of the pool
};

const myPool = genericPool.createPool(factory, opts);

/**
 * Step 2 - Use pool in your code to acquire/release resources
 */

// acquire connection - Promise is resolved
// once a resource becomes available
const resourcePromise = myPool.acquire();

resourcePromise
  .then(function(client) {
    client.query("select * from foo", [], function() {
      // return object back to pool
      myPool.release(client);
    });
  })
  .catch(function(err) {
    // handle error - this is generally a timeout or maxWaitingClients
    // error
  });

/**
 * Step 3 - Drain pool during shutdown (optional)
 */
// Only call this once in your application -- at the point you want
// to shutdown and stop using this pool.
myPool.drain().then(function() {
  myPool.clear();
});

```


## Documentation



### Creating a pool

Whilst it is possible to directly instantiate the Pool class directly, it is recommended to use the `createPool` function exported by module as the constructor method signature may change in the future.

### createPool

The createPool function takes two arguments:

- `factory` :  an object containing functions to create/destroy/test resources for the `Pool`
- `opts` : an optional object/dictonary to allow configuring/altering behaviour of the `Pool`

```js
const genericPool = require('generic-pool')
const pool = genericPool.createPool(factory, opts)
```

**factory**

Can be any object/instance but must have the following properties:

- `create` : a function that the pool will call when it wants a new resource. It should return a Promise that either resolves to a `resource` or rejects to an `Error` if it is unable to create a resource for whatever reason.
- `destroy`: a function that the pool will call when it wants to destroy a resource. It should accept one argument `resource` where `resource` is whatever `factory.create` made. The `destroy` function should return a `Promise` that resolves once it has destroyed the resource.


optionally it can also have the following property:

- `validate`: a function that the pool will call if it wants to validate a resource. It should accept one argument `resource` where `resource` is whatever `factory.create` made. Should return a `Promise` that resolves a `boolean` where `true` indicates the resource is still valid or `false` if the resource is invalid.

_Note: The values returned from `create`, `destroy`, and `validate` are all wrapped in a `Promise.resolve` by the pool before being used internally._

**opts**

An optional object/dictionary with the any of the following properties:

- `max`: maximum number of resources to create at any given time. (default=1)
- `min`: minimum number of resources to keep in pool at any given time. If this is set >= max, the pool will silently set the min to equal `max`. (default=0)
- `maxWaitingClients`: maximum number of queued requests allowed, additional `acquire` calls will be callback with an `err` in a future cycle of the event loop.
- `testOnBorrow`: `boolean`: should the pool validate resources before giving them to clients. Requires that `factory.validate` is specified.
- `acquireTimeoutMillis`: max milliseconds an `acquire` call will wait for a resource before timing out. (default no limit), if supplied should non-zero positive integer.
- `destroyTimeoutMillis`: max milliseconds a `destroy` call will wait for a resource before timing out. (default no limit), if supplied should non-zero positive integer.
- `fifo` : if true the oldest resources will be first to be allocated. If false the most recently released resources will be the first to be allocated. This in effect turns the pool's behaviour from a queue into a stack. `boolean`, (default true)
- `priorityRange`: int between 1 and x - if set, borrowers can specify their relative priority in the queue if no resources are available.
                         see example.  (default 1)
- `autostart`: boolean, should the pool start creating resources, initialize the evictor, etc once the constructor is called. If false, the pool can be started by calling `pool.start`, otherwise the first call to `acquire` will start the pool. (default true)
- `evictionRunIntervalMillis`: How often to run eviction checks. Default: 0 (does not run).
- `numTestsPerEvictionRun`: Number of resources to check each eviction run.  Default: 3.
- `softIdleTimeoutMillis`: amount of time an object may sit idle in the pool before it is eligible for eviction by the idle object evictor (if any), with the extra condition that at least "min idle" object instances remain in the pool. Default -1 (nothing can get evicted)
- `idleTimeoutMillis`: the minimum amount of time that an object may sit idle in the pool before it is eligible for eviction due to idle time. Supercedes `softIdleTimeoutMillis` Default: 30000
- `Promise`: Promise lib, a Promises/A+ implementation that the pool should use. Defaults to whatever `global.Promise` is (usually native promises).

### pool.acquire

```js
const onfulfilled = function(resource){
	resource.doStuff()
	// release/destroy/etc
}

pool.acquire().then(onfulfilled)
//or
const priority = 2
pool.acquire(priority).then(onfulfilled)
```

This function is for when you want to "borrow" a resource from the pool.

`acquire` takes one optional argument:

- `priority`: optional, number, see **Priority Queueing** below.

and returns a `Promise`
Once a resource in the pool is available, the promise will be resolved with a `resource` (whatever `factory.create` makes for you). If the Pool is unable to give a resource (e.g timeout) then the promise will be rejected with an `Error`

### pool.release

```js
pool.release(resource)
```

This function is for when you want to return a resource to the pool.

`release` takes one required argument:

- `resource`: a previously borrowed resource

and returns a `Promise`. This promise will resolve once the `resource` is accepted by the pool, or reject if the pool is unable to accept the `resource` for any reason (e.g `resource` is not a resource or object that came from the pool). If you do not care the outcome it is safe to ignore this promise.

### pool.isBorrowedResource

```js
pool.isBorrowedResource(resource)
```

This function is for when you need to check if a resource has been acquired from the pool and not yet released/destroyed.

`isBorrowedResource` takes one required argument:

- `resource`: any object which you need to test

and returns true (primitive, not Promise) if resource is currently borrowed from the pool, false otherwise.

### pool.destroy

```js
pool.destroy(resource)
```

This function is for when you want to return a resource to the pool but want it destroyed rather than being made available to other resources. E.g you may know the resource has timed out or crashed.

`destroy` takes one required argument:

- `resource`: a previously borrowed resource

and returns a `Promise`. This promise will resolve once the `resource` is accepted by the pool, or reject if the pool is unable to accept the `resource` for any reason (e.g `resource` is not a resource or object that came from the pool). If you do not care the outcome it is safe to ignore this promise.

### pool.on

```js
pool.on('factoryCreateError', function(err){
  //log stuff maybe
})

pool.on('factoryDestroyError', function(err){
  //log stuff maybe
})
```

The pool is an event emitter. Below are the events it emits and any args for those events

- `factoryCreateError` : emitted when a promise returned by `factory.create` is rejected. If this event has no listeners then the `error` will be silently discarded
  - `error`: whatever `reason` the promise was rejected with.

- `factoryDestroyError` : emitted when a promise returned by `factory.destroy` is rejected. If this event has no listeners then the `error` will be silently discarded
  - `error`: whatever `reason` the promise was rejected with.

### pool.start

```js
pool.start()
```

If `autostart` is `false` then this method can be used to start the pool and therefore begin creation of resources, start the evictor, and any other internal logic.

### pool.ready

```js
pool.ready()
```

Waits for the pool to fully start.

### pool.use

```js

const myTask = dbClient => {
  return new Promise( (resolve, reject) => {
    // do something with the client and resolve/reject
    })
}

pool.use(myTask).then(/* a promise that will run after myTask resolves */)
```

This method handles acquiring a `resource` from the pool, handing it to your function and then calling `pool.release` or `pool.destroy` with resource after your function has finished.

`use` takes one required argument:

- `fn`: a function that accepts a `resource` and returns a `Promise`. Once that promise `resolve`s the `resource` is returned to the pool, else if it `reject`s then the resource is destroyed.
- `priority`: Optionally, you can specify the priority as number. See [Priority Queueing](#priority-queueing) section.

and returns a `Promise` that either `resolve`s with the value from the user supplied `fn` or `reject`s with an error.

## Idle Object Eviction

The pool has an evictor (off by default) which will inspect idle items in the pool and `destroy` them if they are too old.

By default the evictor does not run, to enable it you must set the `evictionRunIntervalMillis` option to a non-zero value. Once enable the evictor will check at most `numTestsPerEvictionRun` each time, this is to stop it blocking your application if you have lots of resources in the pool.


## Priority Queueing

The pool supports optional priority queueing.  This becomes relevant when no resources are available and the caller has to wait. `acquire()` accepts an optional priority int which
specifies the caller's relative position in the queue. Each priority slot has it's own internal queue created for it. When a resource is available for borrowing, the first request in the highest priority queue will be given it.

Specifying a `priority` to `acquire` that is outside the `priorityRange` set at `Pool` creation time will result in the `priority` being converted the lowest possible `priority`

```js
// create pool with priorityRange of 3
// borrowers can specify a priority 0 to 2
const opts = {
  priorityRange : 3
}
const pool = genericPool.createPool(someFactory,opts);

// acquire connection - no priority specified - will go onto lowest priority queue
pool.acquire().then(function(client) {
    pool.release(client);
});

// acquire connection - high priority - will go into highest priority queue
pool.acquire(0).then(function(client) {
    pool.release(client);
});

// acquire connection - medium priority - will go into 'mid' priority queue
pool.acquire(1).then(function(client) {
    pool.release(client);
});

// etc..
```

## Draining

If you are shutting down a long-lived process, you may notice
that node fails to exit for 30 seconds or so.  This is a side
effect of the idleTimeoutMillis behavior -- the pool has a
setTimeout() call registered that is in the event loop queue, so
node won't terminate until all resources have timed out, and the pool
stops trying to manage them.

This behavior will be more problematic when you set factory.min > 0,
as the pool will never become empty, and the setTimeout calls will
never end.

In these cases, use the pool.drain() function.  This sets the pool
into a "draining" state which will gracefully wait until all
idle resources have timed out.  For example, you can call:

If you do this, your node process will exit gracefully.

If you know you would like to terminate all the available resources in your pool before any timeouts they might have are reached, you can use `clear()` in conjunction with `drain()`:

```js
const p = pool.drain()
.then(function() {
    return pool.clear();
});
```
The `promise` returned will resolve once all waiting clients have acquired and return resources, and any available resources have been destroyed

One side-effect of calling `drain()` is that subsequent calls to `acquire()`
will throw an Error.

## Pooled function decoration

This has now been extracted out it's own module [generic-pool-decorator](https://github.com/sandfox/generic-pool-decorator)

## Pool info

The following properties will let you get information about the pool:

```js

// How many many more resources can the pool manage/create
pool.spareResourceCapacity

// returns number of resources in the pool regardless of
// whether they are free or in use
pool.size

// returns number of unused resources in the pool
pool.available

// number of resources that are currently acquired by userland code
pool.borrowed

// returns number of callers waiting to acquire a resource
pool.pending

// returns number of maxixmum number of resources allowed by pool
pool.max

// returns number of minimum number of resources allowed by pool
pool.min

```

## Run Tests

    $ npm install
    $ npm test

The tests are run/written using Tap. Most are ports from the old espresso tests and are not in great condition. Most cases are inside `test/generic-pool-test.js` with newer cases in their own files (legacy reasons).

## Linting

We use eslint combined with prettier


## License

(The MIT License)

Copyright (c) 2010-2016 James Cooper &lt;james@bitmechanic.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
