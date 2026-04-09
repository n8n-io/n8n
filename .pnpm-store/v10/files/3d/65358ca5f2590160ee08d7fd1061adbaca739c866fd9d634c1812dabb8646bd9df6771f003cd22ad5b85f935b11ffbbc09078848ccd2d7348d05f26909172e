promise-limit  [![npm version](https://img.shields.io/npm/v/promise-limit.svg)](https://www.npmjs.com/package/promise-limit) [![npm](https://img.shields.io/npm/dm/promise-limit.svg)](https://www.npmjs.com/package/promise-limit) [![Build Status](https://travis-ci.org/featurist/promise-limit.svg?branch=master)](https://travis-ci.org/featurist/promise-limit)
===

Limit outstanding calls to promise returning functions, or a semaphore for promises. You might want to do this to reduce load on external services, or reduce memory usage when processing large batches of jobs.

```sh
npm install promise-limit
```

```js
var promiseLimit = require('promise-limit')

var limit = promiseLimit(2)

var jobs = ['a', 'b', 'c', 'd', 'e']

Promise.all(jobs.map((name) => {
  return limit(() => job(name))
})).then(results => {
  console.log()
  console.log('results:', results)
})

function job (name) {
  var text = `job ${name}`
  console.log('started', text)

  return new Promise(function (resolve) {
    setTimeout(() => {
      console.log('       ', text, 'finished')
      resolve(text)
    }, 100)
  })
}
```

will output:

```
started job a
started job b
        job a finished
        job b finished
started job c
started job d
        job c finished
        job d finished
started job e
        job e finished

results: [ 'job a', 'job b', 'job c', 'job d', 'job e' ]
```

API
---

```js
var promiseLimit = require('promise-limit')

promiseLimit(concurrency?: Number) -> limit
```

Returns a function that can be used to wrap promise returning functions, limiting them to `concurrency` outstanding calls.

- `concurrency` the concurrency, i.e. 1 will limit calls to one at a time, effectively in sequence or serial. 2 will allow two at a time, etc. 0 or `undefined` specify no limit, and all calls will be run in parallel.

limit
=====

```js
limit(fn: () -> Promise<T>) -> Promise<T>
```

A function that limits calls to `fn`, based on `concurrency` above. Returns a promise that resolves or rejects the same value or error as `fn`. All functions are executed in the same order in which they were passed to `limit`. `fn` must return a promise.

* `fn` a function that is called with no arguments and returns a promise. You can pass arguments to your function by putting it inside another function, i.e. `() -> myfunc(a, b, c)`.

limit.map
=========

```js
limit.map(items: [T], mapper: (T) -> Promise<R>) -> Promise<[R]>
```

Maps an array of items using `mapper`, but limiting the number of concurrent calls to `mapper` with the `concurrency` of `limit`. If at least one call to `mapper` returns a rejected promise, the result of `map` is a the same rejected promise, and no further calls to `mapper` are made.

limit.queue
===========

```js
limit.queue: Number
```

Returns the queue length, the number of jobs that are waiting to be started. You could use this to throttle incoming jobs, so the queue doesn't overwhealm the available memory - for e.g. `pause()` a stream.

## We're Hiring!
Featurist provides full stack, feature driven development teams. Want to join us? Check out [our career opportunities](https://www.featurist.co.uk/careers/).
