# stream-chain [![NPM version][npm-img]][npm-url]

[npm-img]:      https://img.shields.io/npm/v/stream-chain.svg
[npm-url]:      https://npmjs.org/package/stream-chain

`stream-chain` creates a chain of streams out of regular functions, asynchronous functions, generator functions, and existing streams, while properly handling [backpressure](https://nodejs.org/en/docs/guides/backpressuring-in-streams/). The resulting chain is represented as a [Duplex](https://nodejs.org/api/stream.html#stream_class_stream_duplex) stream, which can be combined with other streams the usual way. It eliminates a boilerplate helping to concentrate on functionality without losing the performance especially make it easy to build object mode data processing pipelines.

Originally `stream-chain` was used internally with [stream-fork](https://www.npmjs.com/package/stream-fork) and [stream-json](https://www.npmjs.com/package/stream-json) to create flexible data processing pipelines.

`stream-chain` is a lightweight, no-dependencies micro-package. It is distributed under New BSD license.

## Intro

```js
const Chain = require('stream-chain');

const fs = require('fs');
const zlib = require('zlib');
const {Transform} = require('stream');

// the chain will work on a stream of number objects
const chain = new Chain([
  // transforms a value
  x => x * x,
  // returns several values
  x => [x - 1, x, x + 1],
  // waits for an asynchronous operation
  async x => await getTotalFromDatabaseByKey(x),
  // returns multiple values with a generator
  function* (x) {
    for (let i = x; i > 0; --i) {
      yield i;
    }
    return 0;
  },
  // filters out even values
  x => x % 2 ? x : null,
  // uses an arbitrary transform stream
  new Transform({
    writableObjectMode: true,
    transform(x, _, callback) {
      // transform to text
      callback(null, x.toString());
    }
  }),
  // compress
  zlib.createGzip()
]);
// log errors
chain.on('error', error => console.log(error));
// use the chain, and save the result to a file
dataSource.pipe(chain).pipe(fs.createWriteStream('output.txt.gz'));
```

Making processing pipelines appears to be easy: just chain functions one after another, and we are done. Real life pipelines filter objects out and/or produce more objects out of a few ones. On top of that we have to deal with asynchronous operations, while processing or producing data: networking, databases, files, user responses, and so on. Unequal number of values per stage, and unequal throughput of stages introduced problems like [backpressure](https://nodejs.org/en/docs/guides/backpressuring-in-streams/), which requires algorithms implemented by [streams](https://nodejs.org/api/stream.html).

While a lot of API improvements were made to make streams easy to use, in reality, a lot of boilerplate is required when creating a pipeline. `stream-chain` eliminates most of it.

## Installation

```bash
npm i --save stream-chain
# or: yarn add stream-chain
```

## Documentation

`Chain`, which is returned by `require('stream-chain')`, is based on [Duplex](https://nodejs.org/api/stream.html#stream_class_stream_duplex). It chains its dependents in a single pipeline optionally binding `error` events.

Many details about this package can be discovered by looking at test files located in `tests/` and in the source code (`index.js`).

### Constructor: `new Chain(fns[, options])`

The constructor accepts the following arguments:

* `fns` is an array of functions arrays or stream instances.
  * If a value is a function, a [Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform) stream is created, which calls this function with two parameters: `chunk` (an object), and an optional `encoding`. See [Node's documentation](https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback) for more details on those parameters. The function will be called in the context of the created stream.
    * If it is a regular function, it can return:
      * Regular value:
        * *(deprecated since 2.1.0)* Array of values to pass several or zero values to the next stream as they are.
          ```js
          // produces no values:
          x => []
          // produces two values:
          x => [x, x + 1]
          // produces one array value:
          x => [[x, x + 1]]
          ```
        * Single value.
          * If it is `undefined` or `null`, no value shall be passed.
          * Otherwise, the value will be passed to the next stream.
          ```js
          // produces no values:
          x => null
          x => undefined
          // produces one value:
          x => x
          ```
      * Special value:
        * If it is an instance of [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) or "thenable" (an object with a method called `then()`), it will be waited for. Its result should be a regular value.
          ```js
          // delays by 0.5s:
          x => new Promise(
            resolve => setTimeout(() => resolve(x), 500))
          ```
        * If it is an instance of a generator or "nextable" (an object with a method called `next()`), it will be iterated according to the [generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) protocol. The results should be regular values.
          ```js
          // produces multiple values:
          class Nextable {
            constructor(x) {
              this.x = x;
              this.i = -1;
            }
            next() {
              return {
                done:  this.i <= 1,
                value: this.x + this.i++
              };
            }
          }
          x => new Nextable(x)
          ```
          `next()` can return a `Promise` according to the [asynchronous generator](https://zaiste.net/nodejs_10_asynchronous_iteration_async_generators/) protocol.
      * Any thrown exception will be caught and passed to a callback function effectively generating an error event.
        ```js
        // fails
        x => { throw new Error('Bad!'); }
        ```
  * If it is an asynchronous function, it can return a regular value.
    * In essence, it is covered under "special values" as a function that returns a promise.
    ```js
    // delays by 0.5s:
    async x => {
      await new Promise(resolve => setTimeout(() => resolve(), 500));
      return x;
    }
    ```
  * If it is a generator function, each yield should produce a regular value.
    * In essence, it is covered under "special values" as a function that returns a generator object.
    ```js
    // produces multiple values:
    function* (x) {
      for (let i = -1; i <= 1; ++i) {
        if (i) yield x + i;
      }
      return x;
    }
    ```
  * *(since 2.2.0)* If it is an asynchronous generator function, each yield should produce a regular value.
    * In essence, it is covered under "special values" as a function that returns a generator object.
    ```js
    // produces multiple values:
    async function* (x) {
      for (let i = -1; i <= 1; ++i) {
        if (i) {
          await new Promise(resolve => setTimeout(() => resolve(), 50));
          yield x + i;
        }
      }
      return x;
    }
    ```
  * *(since 2.1.0)* If a value is an array, it is assumed to be an array of regular functions.
    Their values are passed in a chain. All values (including `null`, `undefined`, and arrays) are allowed
    and passed without modifications. The last value is a subject to processing defined above for regular functions.
    * Empty arrays are ignored.
    * If any function returns a value produced by `Chain.final(value)` (see below), it terminates the chain using
      `value` as the final value of the chain.
    * This feature bypasses streams. It is implemented for performance reasons.
  * If a value is a valid stream, it is included as is in the pipeline.
    * [Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform).
    * [Duplex](https://nodejs.org/api/stream.html#stream_class_stream_duplex).
    * The very first stream can be [Readable](https://nodejs.org/api/stream.html#stream_class_stream_readable).
      * In this case a `Chain` instance ignores all possible writes to the front, and ends when the first stream ends.
    * The very last stream can be [Writable](https://nodejs.org/api/stream.html#stream_class_stream_writable).
      * In this case a `Chain` instance does not produce any output, and finishes when the last stream finishes.
      * Because `'data'` event is not used in this case, the instance resumes itself automatically. Read about it in Node's documentation:
        * [Two modes](https://nodejs.org/api/stream.html#stream_two_modes).
        * [readable.resume()](https://nodejs.org/api/stream.html#stream_readable_resume).
* `options` is an optional object detailed in the [Node's documentation](https://nodejs.org/api/stream.html#stream_new_stream_duplex_options).
  * If `options` is not specified, or falsy, it is assumed to be:
    ```js
    {writableObjectMode: true, readableObjectMode: true}
    ```
  * Always make sure that `writableObjectMode` is the same as the corresponding object mode of the first stream, and `readableObjectMode` is the same as the corresponding object mode of the last stream.
    * Eventually both these modes can be deduced, but Node does not define the standard way to determine it, so currently it cannot be done reliably.
  * Additionally the following custom properties are recognized:
    * `skipEvents` is an optional flag. If it is falsy (the default), `'error'` events from all streams are forwarded to the created instance. If it is truthy, no event forwarding is made. A user can always do so externally or in a constructor of derived classes.

An instance can be used to attach handlers for stream events.

```js
const chain = new Chain([x => x * x, x => [x - 1, x, x + 1]]);
chain.on('error', error => console.error(error));
dataSource.pipe(chain);
```

### Properties

Following public properties are available:

* `streams` is an array of streams created by a constructor. Its values either [Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform) streams that use corresponding functions from a constructor parameter, or user-provided streams. All streams are piped sequentially starting from the beginning.
* `input` is the beginning of the pipeline. Effectively it is the first item of `streams`.
* `output` is the end of the pipeline. Effectively it is the last item of `streams`.

Generally, a `Chain` instance should be used to represent a chain:

```js
const chain = new Chain([
  x => x * x,
  x => [x - 1, x, x + 1],
  new Transform({
    writableObjectMode: true,
    transform(chunk, _, callback) {
      callback(null, chunk.toString());
    }
  })
]);
dataSource
  .pipe(chain);
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'));
```

But in some cases `input` and `output` provide a better control over how a data processing pipeline should be organized:

```js
chain.output
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'));
dataSource.pipe(chain.input);
```

Please select what style you want to use, and never mix them together with the same object.

### Static methods

Following static methods are available:

* `chain(fns[, options)` is a helper factory function, which has the same arguments as the constructor and returns a `Chain` instance.
  ```js
  const {chain} = require('stream-chain');

  // simple
  dataSource
    .pipe(chain([x => x * x, x => [x - 1, x, x + 1]]));

  // all inclusive
  chain([
    dataSource,
    x => x * x,
    x => [x - 1, x, x + 1],
    zlib.createGzip(),
    fs.createWriteStream('output.txt.gz')
  ])
  ```
* *(since 2.1.0)* `final(value)` is a helper factory function, which can be used in by chained functions (see above the array of functions).
  It returns a special value, which terminates the chain and uses the passed value as the result of the chain.
  ```js
  const {chain, final} = require('stream-chain');

  // simple
  dataSource
    .pipe(chain([[x => x * x, x => 2 * x + 1]]));
  // faster than [x => x * x, x => 2 * x + 1]

  // final
  dataSource
    .pipe(chain([[
      x => x * x,
      x => final(x),
      x => 2 * x + 1
    ]]));
  // the same as [[x => x * x, x => x]]
  // the same as [[x => x * x]]
  // the same as [x => x * x]

  // final as a terminator
  dataSource
    .pipe(chain([[
      x => x * x,
      x => final(),
      x => 2 * x + 1
    ]]));
  // produces no values, because the final value is undefined,
  // which is interpreted as "no value shall be passed"
  // see the doc above

  // final() as a filter
  dataSource
    .pipe(chain([[
      x => x * x,
      x => x % 2 ? final() : x,
      x => 2 * x + 1
    ]]));
  // only even values are passed, odd values are ignored

  // if you want to be really performant...
  const none = final();
  dataSource
    .pipe(chain([[
      x => x * x,
      x => x % 2 ? none : x,
      x => 2 * x + 1
    ]]));
  ```
* *(since 2.1.0)* `many(array)` is a helper factory function, which is used to wrap arrays to be interpreted as multiple values returned from a function.
  At the moment it is redundant: you can use a simple array to indicate that, but a naked array is being deprecated and in future versions it will be passed as is.
  The thinking is that using `many()` is better indicates the intention. Additionally, in the future versions it will be used by array of functions (see above).
  ```js
  const {chain, many} = require('stream-chain');

  dataSource
    .pipe(chain([x => many([x, x + 1, x + 2])]));
  // currently the same as [x => [x, x + 1, x + 2]]
  ```

## Release History

- 2.2.5 *Relaxed the definition of a stream (thx [Rich Hodgkins](https://github.com/rhodgkins)).*
- 2.2.4 *Bugfix: wrong `const`-ness in the async generator branch (thx [Patrick Pang](https://github.com/patrickpang)).*
- 2.2.3 *Technical release. No need to upgrade.*
- 2.2.2 *Technical release. No need to upgrade.*
- 2.2.1 *Technical release: new symbols namespace, explicit license (thx [Keen Yee Liau](https://github.com/kyliau)), added Greenkeeper.*
- 2.2.0 *Added utilities: `take`, `takeWhile`, `skip`, `skipWhile`, `fold`, `scan`, `Reduce`, `comp`.*
- 2.1.0 *Added simple transducers, dropped Node 6.*
- 2.0.3 *Added TypeScript typings and the badge.*
- 2.0.2 *Workaround for Node 6: use `'finish'` event instead of `_final()`.*
- 2.0.1 *Improved documentation.*
- 2.0.0 *Upgraded to use Duplex instead of EventEmitter as the base.*
- 1.0.3 *Improved documentation.*
- 1.0.2 *Better README.*
- 1.0.1 *Fixed the README.*
- 1.0.0 *The initial release.*
