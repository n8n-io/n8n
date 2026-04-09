# plimit-lit

This package is a helper to run multiple promise-returning & async functions
with limited concurrency.

## Installation

```bash
$ npm i plimit-lit
# or
$ yarn add plimit-lit
```

## Usage

```js
import { pLimit } from 'plimit-lit';

const limit = pLimit(1);

(async () => {
	// NOTE: Only one promise is run at once
	const result = await Promise.all([
		limit(() => fetchSomething('foo')),
		limit(() => fetchSomething('bar')),
		limit(() => doSomething()),
	]);
	console.log(result);
})();
```

## API

### `limit = pLimit(concurrency)`

Returns a `limit` function to enqueue promise returning or async functions.

#### `concurrency`

Type: `number`

Number of the concurrency limit.

### `limit(fn, ...args)`

Returns a promise returned from calling `fn(...args)`.

#### `fn`

Type: `Function`

Promise-returning or async function.

#### `args`

Optional arguments `fn` is being called with.

> **Note:** Support for passing arguments on to the `fn` is provided in order to be
> able to avoid creating unnecessary closures. You probably don't need this
> optimization unless you're pushing a _lot_ of functions.

### `limit.activeCount`

Static method that returns the number of promises currently running.

### `limit.pendingCount`

Static method that returns the number of promises currently waiting to be run
(i.e. their internal `fn` was not called yet).

### `limit.clearQueue()`

Clear the internal queue of promises. This discards pending promises that are
waiting to be run.

> **Note:** This does not cancel in-flight promises!

## Development

(1) Install dependencies

```bash
$ npm i
# or
$ yarn
```

(2) Run initial validation

```bash
$ ./Taskfile.sh validate
```

(3) Start developing. See [`./Taskfile.sh`](./Taskfile.sh) for more tasks to
help you develop.

---

_This project was set up by @jvdx/core_
