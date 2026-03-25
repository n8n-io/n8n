[![Build Status](https://travis-ci.org/NodeRedis/node-redis-parser.png?branch=master)](https://travis-ci.org/NodeRedis/node-redis-parser)
[![Test Coverage](https://codeclimate.com/github/NodeRedis/node-redis-parser/badges/coverage.svg)](https://codeclimate.com/github/NodeRedis/node-redis-parser/coverage)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

# redis-parser

A high performance javascript redis parser built for [node_redis](https://github.com/NodeRedis/node_redis) and [ioredis](https://github.com/luin/ioredis). Parses all [RESP](http://redis.io/topics/protocol) data.

## Install

Install with [NPM](https://npmjs.org/):

    npm install redis-parser

## Usage

```js
const Parser = require('redis-parser');

const myParser = new Parser(options);
```

### Options

* `returnReply`: *function*; mandatory
* `returnError`: *function*; mandatory
* `returnFatalError`: *function*; optional, defaults to the returnError function
* `returnBuffers`: *boolean*; optional, defaults to false
* `stringNumbers`: *boolean*; optional, defaults to false

### Functions

* `reset()`: reset the parser to it's initial state
* `setReturnBuffers(boolean)`: set the returnBuffers option on/off without resetting the parser
* `setStringNumbers(boolean)`: set the stringNumbers option on/off without resetting the parser

### Error classes

* `RedisError` sub class of Error
* `ReplyError` sub class of RedisError
* `ParserError` sub class of RedisError

All Redis errors will be returned as `ReplyErrors` while a parser error is returned as `ParserError`.  
All error classes can be imported by the npm `redis-errors` package.

### Example

```js
const Parser = require("redis-parser");

class Library {
  returnReply(reply) { /* ... */ }
  returnError(err) { /* ... */ }
  returnFatalError(err) { /* ... */ }

  streamHandler() {
    this.stream.on('data', (buffer) => {
      // Here the data (e.g. `Buffer.from('$5\r\nHello\r\n'`))
      // is passed to the parser and the result is passed to
      // either function depending on the provided data.
      parser.execute(buffer);
    });
  }
}

const lib = new Library();

const parser = new Parser({
  returnReply(reply) {
    lib.returnReply(reply);
  },
  returnError(err) {
    lib.returnError(err);
  },
  returnFatalError(err) {
    lib.returnFatalError(err);
  }
});
```

You do not have to use the returnFatalError function. Fatal errors will be returned in the normal error function in that case.

And if you want to return buffers instead of strings, you can do this by adding the `returnBuffers` option.

If you handle with big numbers that are to large for JS (Number.MAX_SAFE_INTEGER === 2^53 - 16) please use the `stringNumbers` option. That way all numbers are going to be returned as String and you can handle them safely.

```js
// Same functions as in the first example

const parser = new Parser({
  returnReply(reply) {
    lib.returnReply(reply);
  },
  returnError(err) {
    lib.returnError(err);
  },
  returnBuffers: true, // All strings are returned as Buffer e.g. <Buffer 48 65 6c 6c 6f>
  stringNumbers: true // All numbers are returned as String
});

// The streamHandler as above
```

## Protocol errors

To handle protocol errors (this is very unlikely to happen) gracefully you should add the returnFatalError option, reject any still running command (they might have been processed properly but the reply is just wrong), destroy the socket and reconnect. Note that while doing this no new command may be added, so all new commands have to be buffered in the meantime, otherwise a chunk might still contain partial data of a following command that was already processed properly but answered in the same chunk as the command that resulted in the protocol error.

## Contribute

The parser is highly optimized but there may still be further optimizations possible.

    npm install
    npm test
    npm run benchmark

Currently the benchmark compares the performance against the hiredis parser:

    HIREDIS:   $ multiple chunks in a bulk string x 994,387 ops/sec ±0.22% (554 runs sampled)
    JS PARSER: $ multiple chunks in a bulk string x 1,010,728 ops/sec ±0.28% (559 runs sampled)
    HIREDIS BUF:   $ multiple chunks in a bulk string x 648,742 ops/sec ±0.80% (526 runs sampled)
    JS PARSER BUF: $ multiple chunks in a bulk string x 1,728,849 ops/sec ±0.41% (555 runs sampled)

    HIREDIS:   + multiple chunks in a string x 1,861,132 ops/sec ±0.18% (564 runs sampled)
    JS PARSER: + multiple chunks in a string x 2,131,892 ops/sec ±0.31% (558 runs sampled)
    HIREDIS BUF:   + multiple chunks in a string x 965,132 ops/sec ±0.58% (521 runs sampled)
    JS PARSER BUF: + multiple chunks in a string x 2,304,482 ops/sec ±0.31% (559 runs sampled)

    HIREDIS:   $ 4mb bulk string x 269 ops/sec ±0.56% (452 runs sampled)
    JS PARSER: $ 4mb bulk string x 763 ops/sec ±0.25% (466 runs sampled)
    HIREDIS BUF:   $ 4mb bulk string x 336 ops/sec ±0.59% (459 runs sampled)
    JS PARSER BUF: $ 4mb bulk string x 994 ops/sec ±0.36% (482 runs sampled)

    HIREDIS:   + simple string x 2,504,305 ops/sec ±0.19% (563 runs sampled)
    JS PARSER: + simple string x 5,121,952 ops/sec ±0.30% (560 runs sampled)
    HIREDIS BUF:   + simple string x 1,122,899 ops/sec ±0.52% (516 runs sampled)
    JS PARSER BUF: + simple string x 5,907,323 ops/sec ±0.23% (562 runs sampled)

    HIREDIS:   : integer x 2,461,376 ops/sec ±0.14% (561 runs sampled)
    JS PARSER: : integer x 18,543,688 ops/sec ±0.19% (539 runs sampled)
    JS PARSER STR: : integer x 14,149,305 ops/sec ±0.24% (561 runs sampled)

    HIREDIS:   : big integer x 2,114,270 ops/sec ±0.15% (561 runs sampled)
    JS PARSER: : big integer x 10,794,439 ops/sec ±0.25% (560 runs sampled)
    JS PARSER STR: : big integer x 4,594,807 ops/sec ±0.24% (558 runs sampled)

    HIREDIS:   * array x 45,597 ops/sec ±0.23% (565 runs sampled)
    JS PARSER: * array x 68,396 ops/sec ±0.30% (563 runs sampled)
    HIREDIS BUF:   * array x 14,726 ops/sec ±0.39% (498 runs sampled)
    JS PARSER BUF: * array x 80,961 ops/sec ±0.25% (561 runs sampled)

    HIREDIS:   * big nested array x 212 ops/sec ±0.17% (511 runs sampled)
    JS PARSER: * big nested array x 243 ops/sec ±0.21% (496 runs sampled)
    HIREDIS BUF:   * big nested array x 207 ops/sec ±0.37% (430 runs sampled)
    JS PARSER BUF: * big nested array x 297 ops/sec ±1.10% (421 runs sampled)

    HIREDIS:   - error x 168,761 ops/sec ±0.28% (559 runs sampled)
    JS PARSER: - error x 424,257 ops/sec ±0.28% (557 runs sampled)

    Platform info:
    Ubuntu 17.04
    Node.js 7.10.0
    Intel(R) Core(TM) i7-5600U CPU

## License

[MIT](./LICENSE)
