# one-time

Call the supplied function exactly one time. This prevents double callback
execution. This module can be used on both Node.js, React-Native, or browsers
using Browserify. No magical ES5/6 methods used unlike the `once` module does
(except for the async version).

## Installation

This module is published to the public npm registry and can be installed
by running:

```sh
npm install --save one-time
```

## Usage (normal)

Simply supply the function with the function that should only be called one
time:

```js
var one = require('one-time');

function load(file, fn) {
  fn = one(fn);

  eventemitter.once('load', fn);
  eventemitter.once('error', fn);

  // do stuff
  eventemitter.emit('error', new Error('Failed to load, but still finished'));
  eventemitter.emit('load');
}

function example(fn) {
  fn = one(fn);

  fn();
  fn('also receives all arguments');
  fn('it returns the same value') === 'bar';
  fn('never');
  fn('gonna');
  fn('give');
  fn('you');
  fn('up');
}

example(function () {
  return 'bar'
});
```

## Usage (async)

The same pattern is available for **async** functions as well, for that you
should import that `one-time/async` version instead. This one is optimized
for **async** and **await** support. It following exactly the same as the
normal version but assumes it's an `async function () {}` that it's wrapping
instead of a regular function, and it will return an `async function() {}`
instead of a regular function.

```js
import one from 'one-time/async';

const fn = one(async function () {
  return await example();
});

await fn();
await fn();
await fn();
```

### Why not `once`?

The main reason is that `once` cannot be used in a browser environment unless
it's ES5 compatible. For a module as simple as this I find that unacceptable. In
addition to that it super heavy on the dependency side. So it's totally not
suitable to be used in client side applications.

In addition to that we make sure that your code stays easy to debug as returned
functions are named in the same way as your supplied functions. Making heap
inspection and stack traces easier to understand.

## License

[MIT](LICENSE)
