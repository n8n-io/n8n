export class TimeoutError extends Error {
	readonly name: 'TimeoutError';
	constructor(message?: string, options?: ErrorOptions);
}

export type ClearablePromise<T> = {
	/**
	Clear the timeout.
	*/
	clear: () => void;
} & Promise<T>;

export type Options<ReturnType> = {
	/**
	Milliseconds before timing out.

	Passing `Infinity` will cause it to never time out.
	*/
	milliseconds: number;

	/**
	Do something other than rejecting with an error on timeout.

	You could for example retry:

	@example
	```
	import {setTimeout} from 'node:timers/promises';
	import pTimeout from 'p-timeout';

	const delayedPromise = () => setTimeout(200);

	await pTimeout(delayedPromise(), {
		milliseconds: 50,
		fallback: () => {
			return pTimeout(delayedPromise(), {
				milliseconds: 300
			});
		},
	});
	```
	*/
	fallback?: () => ReturnType | Promise<ReturnType>;

	/**
	Specify a custom error message or error to throw when it times out:

	- `message: 'too slow'` will throw `TimeoutError('too slow')`
	- `message: new MyCustomError('it’s over 9000')` will throw the same error instance
	- `message: false` will make the promise resolve with `undefined` instead of rejecting

	If you do a custom error, it's recommended to sub-class `TimeoutError`:

	```
	import {TimeoutError} from 'p-timeout';

	class MyCustomError extends TimeoutError {
		name = "MyCustomError";
	}
	```
	*/
	message?: string | Error | false;

	/**
	Custom implementations for the `setTimeout` and `clearTimeout` functions.

	Useful for testing purposes, in particular to work around [`sinon.useFakeTimers()`](https://sinonjs.org/releases/latest/fake-timers/).

	@example
	```
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
	*/
	readonly customTimers?: {
		setTimeout: typeof globalThis.setTimeout;
		clearTimeout: typeof globalThis.clearTimeout;
	};

	/**
	Abort the promise.

	@example
	```
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
	*/
	signal?: globalThis.AbortSignal;
};

/**
Timeout a promise after a specified amount of time.

If you pass in a cancelable promise, specifically a promise with a `.cancel()` method, that method will be called when the `pTimeout` promise times out.

@param input - Promise to decorate.
@returns A decorated `input` that times out after `milliseconds` time. It has a `.clear()` method that clears the timeout.

@example
```
import {setTimeout} from 'node:timers/promises';
import pTimeout from 'p-timeout';

const delayedPromise = () => setTimeout(200);

await pTimeout(delayedPromise(), {
	milliseconds: 50,
	fallback: () => {
		return pTimeout(delayedPromise(), {milliseconds: 300});
	}
});
```
*/
export default function pTimeout<ValueType, ReturnType = ValueType>(
	input: PromiseLike<ValueType>,
	options: Options<ReturnType> & {message: false}
): ClearablePromise<ValueType | ReturnType | undefined>;
export default function pTimeout<ValueType, ReturnType = ValueType>(
	input: PromiseLike<ValueType>,
	options: Options<ReturnType>
): ClearablePromise<ValueType | ReturnType>;
