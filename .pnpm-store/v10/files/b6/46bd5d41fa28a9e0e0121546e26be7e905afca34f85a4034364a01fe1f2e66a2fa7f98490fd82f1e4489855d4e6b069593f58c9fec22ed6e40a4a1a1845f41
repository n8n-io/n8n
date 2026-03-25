declare class TimeoutErrorClass extends Error {
	readonly name: 'TimeoutError';
	constructor(message?: string);
}

declare namespace pTimeout {
	type TimeoutError = TimeoutErrorClass;
}

declare const pTimeout: {
	/**
	Timeout a promise after a specified amount of time.

	If you pass in a cancelable promise, specifically a promise with a `.cancel()` method, that method will be called when the `pTimeout` promise times out.

	@param input - Promise to decorate.
	@param milliseconds - Milliseconds before timing out.
	@param message - Specify a custom error message or error. If you do a custom error, it's recommended to sub-class `pTimeout.TimeoutError`. Default: `'Promise timed out after 50 milliseconds'`.
	@returns A decorated `input` that times out after `milliseconds` time.

	@example
	```
	import delay = require('delay');
	import pTimeout = require('p-timeout');

	const delayedPromise = delay(200);

	pTimeout(delayedPromise, 50).then(() => 'foo');
	//=> [TimeoutError: Promise timed out after 50 milliseconds]
	```
	*/
	<ValueType>(
		input: PromiseLike<ValueType>,
		milliseconds: number,
		message?: string | Error
	): Promise<ValueType>;

	/**
	Timeout a promise after a specified amount of time.

	If you pass in a cancelable promise, specifically a promise with a `.cancel()` method, that method will be called when the `pTimeout` promise times out.

	@param input - Promise to decorate.
	@param milliseconds - Milliseconds before timing out. Passing `Infinity` will cause it to never time out.
	@param fallback - Do something other than rejecting with an error on timeout. You could for example retry.
	@returns A decorated `input` that times out after `milliseconds` time.

	@example
	```
	import delay = require('delay');
	import pTimeout = require('p-timeout');

	const delayedPromise = () => delay(200);

	pTimeout(delayedPromise(), 50, () => {
		return pTimeout(delayedPromise(), 300);
	});
	```
	*/
	<ValueType, ReturnType>(
		input: PromiseLike<ValueType>,
		milliseconds: number,
		fallback: () => ReturnType | Promise<ReturnType>
	): Promise<ValueType | ReturnType>;

	TimeoutError: typeof TimeoutErrorClass;

	// TODO: Remove this for the next major release
	default: typeof pTimeout;
};

export = pTimeout;
