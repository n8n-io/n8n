[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

# redis-errors

All error classes used in [node_redis](https://github.com/NodeRedis/node_redis)
from v.3.0.0 are in here. They can be required as needed.

## Install

Install with [NPM](https://npmjs.org/):

  npm install redis-errors

## Usage

```js
const { ReplyError, InterruptError } = require('redis-errors');

// Using async await
try {
  await client.set('foo') // Missing value
} catch (err) {
  if (err instanceof InterruptError) {
    console.error('Command might have been processed')
  }
  if (err instanceof ReplyError) {
    // ...
  }
  throw err
}

// Using callbacks
client.set('foo', (err, res) => {
  if (err) {
    if (err instanceof InterruptError) {
      // ...
    }
  }
})
```

### Error classes

All errors returned by NodeRedis use own Error classes. You can distinguish
different errors easily by checking for these classes.

To know what caused the error they might contain properties to know in more
detail what happened.

Each error contains a `message`, a `name` and a `stack` property. Please be aware
that the stack might not be useful due to the async nature and is in those cases
therefore limited to two frames.

There might be more not yet documented properties as well. Please feel free to
open a pull request to document those as well.

#### RedisError

`Properties`:

Properties depend on the individual error.

All errors returned by NodeRedis (client) are `RedisError`s.  
Subclass of `Error`

#### ReplyError

`Properties`:

* `args`: The arguments passed to the command.
* `command`: The command name.
* `code`: The `Redis` error code. Redis itself uses some internal error codes.

All errors returned by Redis itself (server) will be a `ReplyError`.  
Subclass of `RedisError`

#### ParserError

`Properties`:

* `buffer`: The raw buffer input stringified.
* `offset`: The character count where the parsing error occurred.

Parsing errors are returned as `ParserError`.  
Subclass of `RedisError`
**Note:** If you encounter one of these please report that error including the
attached `offset` and `buffer` properties!  

#### AbortError

`Properties`:

* `args`: The arguments passed to the command.
* `command`: The command name.

If a command was not yet executed but rejected, it'll return a `AbortError`.  
Subclass of `RedisError`

#### InterruptError

`Properties`:

* `args`: The arguments passed to the command.
* `command`: The command name.
* `origin`: The original error that caused the interrupt

All executed commands that could not fulfill (e.g. network drop while
executing) return a `InterruptError`.  
Subclass of `AbortError`  
**Note:** Interrupt errors can happen for multiple reasons that are out of the
scope of NodeRedis itself. There is nothing that can be done on library side
to prevent those.

## License

[MIT](./LICENSE)
