Memoize functions results using an lru-cache.

## Installation

```
npm i lru-memoizer --save
```

## Intro

This module uses an [lru-cache](https://github.com/isaacs/node-lru-cache) internally to cache the results of an async function.

The `load` function can have N parameters and the last one must be a callback. The callback should be an errback (first parameter is `err`).

The `hash` function purpose is generate a custom hash for storing results. It has all the arguments applied to it minus the callback, and must return an string synchronous.

The `disable` function allows you to conditionally disable the use of the cache.  Useful for test environments.

The `freeze` option (defaults to **false**) allows you to deep-freeze the result of the async function.

The `clone` option (defaults to **false**) allows you to deep-clone the result every time is returned from the cache.

## Usage

```javascript

var memoizer = require('lru-memoizer');

var memoizedGet = memoizer({
  //defines how to load the resource when
  //it is not in the cache.
  load: function (options, callback) {
    request.get(options, callback);
  },

  //defines how to create a cache key from the params.
  hash: function (options) {
    return options.url + qs.stringify(options.qs);
  },

  //don't cache in test environment
  disable: isTestEnv(),

  //all other params for the LRU cache.
  max: 100,
  maxAge: 1000 * 60
});

memoizedGet({
  url: 'https://google.com',
  qs: { foo: 123 }
}, function (err, result, body) {
 //console.log(body);
})

```

## Sync lru-memoizer

Use `memoizer.sync` to cache things that are slow to calculate or methods returning promises.

```
var memoizer = require('lru-memoizer');
var memoizedGet = memoizer.sync({
  //defines how to load the resource when
  //it is not in the cache.
  load: function (params) {
    //return something_hard_to_compute;s
  },

  //defines how to create a cache key from the params.
  hash: function (params) {
    return params.foo;
  },

  //all other params for the LRU cache.
  max: 100,
  maxAge: 1000 * 60
});
```

## Similar modules

This module is very similar to [async-cache](https://github.com/isaacs/async-cache), the main difference is the `hash` function.

## License

MIT 2016 - José F. Romaniello
