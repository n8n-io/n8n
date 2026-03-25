# p-timeout

> Timeout a promise after a specified amount of time

> [!NOTE]
> You may want to use `AbortSignal.timeout()` instead. [Learn more.](#abortsignal)

## Install

```sh
npm install p-timeout
```

## Usage

```js
import {setTimeout} from 'node:timers/promises';
import pTimeout from 'p-timeout';

const delayedPromise = setTimeout(200);

await pTimeout(delayedPromise, {
	milliseconds: 50,
});
//=> [TimeoutError: Promise timed out after 50 milliseconds]
```

## API

### pTimeout(input, options)

Returns a decorated `input` that times out after `milliseconds` time. It has a `.clear()` method that clears the timeout.

If you pass in a cancelable promise, specifically a promise with a `.cancel()` method, that method will be called when the `pTimeout` promise times out.

#### input

Type: `Promise`

Promise to decorate.

#### options

Type: `object`

##### milliseconds

Type: `number`

Milliseconds before timing out.

Passing `Infinity` will cause it to never time out.

##### message

Type: `string | Error | false`\
Default: `'Promise timed out after {milliseconds} milliseconds'`

Specify a custom error message or error to throw when it times out:

- `message: 'too slow'` will throw `TimeoutError('too slow')`
- `message: new MyCustomError('it’s over 9000')` will throw the same error instance
- `message: false` will make the promise resolve with `undefined` instead of rejecting

If you do a custom error, it's recommended to sub-class `TimeoutError`:

```js
import {TimeoutError} from 'p-timeout';

class MyCustomError extends TimeoutError {
	name = "MyCustomError";
}
```

##### fallback

Type: `Function`

Do something other than rejecting with an error on timeout.

The function can return a value or a promise.

You could for example retry:

```js
import {setTimeout} from 'node:timers/promises';
import pTimeout from 'p-timeout';

const delayedPromise = () => setTimeout(200);

await pTimeout(delayedPromise(), {
	milliseconds: 50,
	fallback: () => {
		return pTimeout(delayedPromise(), {
			milliseconds: 300
		});
	}
});
```

##### customTimers

Type: `object` with function properties `setTimeout` and `clearTimeout`

Custom implementations for the `setTimeout` and `clearTimeout` functions.

Useful for testing purposes, in particular to work around [`sinon.useFakeTimers()`](https://sinonjs.org/releases/latest/fake-timers/).

Example:

```js
import pTimeout from 'p-timeout';
import sinon from 'sinon';

const originalSetTimeout = setTimeout;
const originalClearTimeout = clearTimeout;

sinon.useFakeTimers();

// Use `pTimeout` without being affected by `sinon.useFakeTimers()`:
await pTimeout(doSomething(), {
	milliseconds: 2000,
	customTimers: {
		setTimeout: originalSetTimeout,
		clearTimeout: originalClearTimeout
	}
});
```

##### signal

Type: [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

Abort the promise.

```js
import pTimeout from 'p-timeout';
import delay from 'delay';

const delayedPromise = delay(3000);

const abortController = new AbortController();

setTimeout(() => {
	abortController.abort();
}, 100);

await pTimeout(delayedPromise, {
	milliseconds: 2000,
	signal: abortController.signal
});
```

### TimeoutError

Exposed for instance checking and sub-classing.

## Related

- [delay](https://github.com/sindresorhus/delay) - Delay a promise a specified amount of time
- [p-min-delay](https://github.com/sindresorhus/p-min-delay) - Delay a promise a minimum amount of time
- [p-retry](https://github.com/sindresorhus/p-retry) - Retry a promise-returning function
- [More…](https://github.com/sindresorhus/promise-fun)

## AbortSignal

> Modern alternative to `p-timeout`

Async functions like `fetch` can accept an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal), which can be conveniently created with [`AbortSignal.timeout()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static).

The advantage over `p-timeout` is that the promise-generating function (like `fetch`) is actually notified that the user is no longer expecting an answer, so it can interrupt its work and free resources.

```js
// Call API, timeout after 5 seconds
const response = await fetch('./my-api', {signal: AbortSignal.timeout(5000)});
```

```js
async function buildWall(signal) {
	for (const brick of bricks) {
		signal.throwIfAborted();
		// Or: if (signal.aborted) { return; }

		await layBrick();
	}
}

// Stop long work after 60 seconds
await buildWall(AbortSignal.timeout(60_000))
```

You can also combine multiple signals, like when you have a timeout *and* an `AbortController` triggered with a “Cancel” button click. You can use the upcoming [`AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static) helper or [`abort-utils`](https://github.com/fregante/abort-utils/blob/main/source/merge-signals.md).
