[![Build Status](https://travis-ci.org/Vincit/tarn.js.svg?branch=master)](https://travis-ci.org/Vincit/tarn.js)

## Why yet another resource pool?

Tarn is focused on robustness and ability to recover from errors. Tarn has timeouts for all operations
that can fail or timeout so that you should never end up with pool full of crap. Tarn has a comprehensive
test suite and we are committed to adding tests and fixing all bugs that are found.

Tarn will always remain simple.

## Install

```
npm install tarn
```

## Usage

```js
const { Pool, TimeoutError } = require('tarn');

const pool = new Pool({
  // Function that creates a resource. You can either pass the resource
  // to the callback(error, resource) or return a promise that resolves the resource
  // (but not both) Callback syntax will be deprecated at some point.
  create: cb => {
    cb(null, new SomeResource());
  },

  // Validates a connection before it is used. Return true or false
  // from it. If false is returned, the resource is destroyed and
  // another one is acquired. Should return a Promise if validate is
  // an async function.
  validate: resource => {
    return true;
  },

  // Function that destroys a resource, should return a promise if
  // destroying is an asynchronous operation.
  destroy: someResource => {
    someResource.cleanup();
  },

  // logger function, noop by default
  log: (message, logLevel) => console.log(`${logLevel}: ${message}`)

  // minimum size
  min: 2,

  // maximum size
  max: 10,

  // acquire promises are rejected after this many milliseconds
  // if a resource cannot be acquired
  acquireTimeoutMillis: 30000,

  // create operations are cancelled after this many milliseconds
  // if a resource cannot be acquired
  createTimeoutMillis: 30000,

  // destroy operations are awaited for at most this many milliseconds
  // new resources will be created after this timeout
  destroyTimeoutMillis: 5000,

  // free resouces are destroyed after this many milliseconds
  idleTimeoutMillis: 30000,

  // how often to check for idle resources to destroy
  reapIntervalMillis: 1000,

  // how long to idle after failed create before trying again
  createRetryIntervalMillis: 200,

  // If true, when a create fails, the first pending acquire is
  // rejected with the error. If this is false (the default) then
  // create is retried until acquireTimeoutMillis milliseconds has
  // passed.
  propagateCreateError: false
});

// acquires a resource. The promise is rejected with `tarn.TimeoutError`
// after `acquireTimeoutMillis` if a resource could not be acquired.
const acquire = pool.acquire();

// acquire can be aborted using the abort method.
// If acquire had triggered creating a new resource in the pool
// creation will continue and it is not aborted.
acquire.abort();

// the acquire object has a promise property that gets resolved with
// the acquired resource
try {
  const resource = await acquire.promise;
} catch (err) {
  // if the acquire times out an error of class TimeoutError is thrown
  if (err instanceof TimeoutError) {
    console.log('timeout');
  }
}

// releases the resource.
pool.release(resource);

// returns the number of non-free resources
pool.numUsed();

// returns the number of free resources
pool.numFree();

// how many acquires are waiting for a resource to be released
pool.numPendingAcquires();

// how many asynchronous create calls are running
pool.numPendingCreates();

// waits for all resources to be returned to the pool and destroys them.
// pool cannot be used after this.
await pool.destroy();

// The following examples add synchronous event handlers. For example, to
// allow externally collecting pool behaviour diagnostic data.
// If any of these hooks fail, all errors are caught and warnings are logged.

// resource is acquired from pool
pool.on('acquireRequest', eventId => {});
pool.on('acquireSuccess', (eventId, resource) => {});
pool.on('acquireFail', (eventId, err) => {});

// resource returned to pool
pool.on('release', resource => {});

// resource was created and added to the pool
pool.on('createRequest', eventId => {});
pool.on('createSuccess', (eventId, resource) => {});
pool.on('createFail', (eventId, err) => {});

// resource is destroyed and evicted from pool
// resource may or may not be invalid when destroySuccess / destroyFail is called
pool.on('destroyRequest', (eventId, resource) => {});
pool.on('destroySuccess', (eventId, resource) => {});
pool.on('destroyFail', (eventId, resource, err) => {});

// when internal reaping event clock is activated / deactivated
pool.on('startReaping', () => {});
pool.on('stopReaping', () => {});

// pool is destroyed (after poolDestroySuccess all event handlers are also cleared)
pool.on('poolDestroyRequest', eventId => {});
pool.on('poolDestroySuccess', eventId => {});

// remove single event listener
pool.removeListener(eventName, listener);

// remove all listeners from an event
pool.removeAllListeners(eventName);
```

## Changelog

### Master

### 3.0.2 2021-11-29

- Valid resources with rejected acquires are returned to the pool #68

### 3.0.1 2020-10-25

- Added triggering missing createFail event on timeout error - fixes #57

### 3.0.0 2020-04-18

- Async validation support, now validation resource function can return a promise #45
- Fixed releasing abandoned resource after creation when create timeout #48

Released as major version, because async validation support did require lots of internal changes, which may cause subtle difference in behavior.

### 2.0.0 2019-06-02

- Accidentally published breaking changes in 1.2.0. Unpublished it and published again with correct version number 2.0.0 #33

### 1.2.0 2019-06-02 (UNPUBLISHED)

- Passing unknown options throws an error #19 #32
- Diagnostic event handlers to allow monitoring pool behaviour #14 #23
- Dropped node 6 support #25 #28
- pool.destroy() now always waits for all pending destroys to finish before resolving #29

### 1.1.5 2019-04-06

- Added changelog #22
- Handle opt.destroy() being a promise with destroyTimeout #16
- Explicitly silence bluebird warnings #17
- Add strict typings via TypeScript #10
