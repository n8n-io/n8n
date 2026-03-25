declare namespace pDebounce {
	interface Options {
		/**
		Call the `fn` on the [leading edge of the timeout](https://css-tricks.com/debouncing-throttling-explained-examples/#article-header-id-1). Meaning immediately, instead of waiting for `wait` milliseconds.

		@default false
		*/
		readonly leading?: boolean;
	}
}

declare const pDebounce: {
	/**
	[Debounce](https://css-tricks.com/debouncing-throttling-explained-examples/) promise-returning & async functions.

	@param fn - Promise-returning/async function to debounce.
	@param wait - Milliseconds to wait before calling `fn`.
	@returns A function that delays calling `fn` until after `wait` milliseconds have elapsed since the last time it was called.

	@example
	```
	import pDebounce = require('p-debounce');

	const expensiveCall = async input => input;

	const debouncedFn = pDebounce(expensiveCall, 200);

	for (const i of [1, 2, 3]) {
		debouncedFn(i).then(console.log);
	}
	//=> 3
	//=> 3
	//=> 3
	```
	*/
	<ArgumentsType extends unknown[], ReturnType>(
		fn: (...arguments: ArgumentsType) => PromiseLike<ReturnType> | ReturnType,
		wait: number,
		options?: pDebounce.Options
	): (...arguments: ArgumentsType) => Promise<ReturnType>;

	// TODO: Remove this for the next major release, refactor the whole definition to:
	// declare function pDebounce<ArgumentsType extends unknown[], ReturnType>(
	// 	fn: (...arguments: ArgumentsType) => PromiseLike<ReturnType> | ReturnType,
	// 	wait: number,
	// 	options?: pDebounce.Options
	// ): (...arguments: ArgumentsType) => Promise<ReturnType>;
	// export = pDebounce;
	default: typeof pDebounce;
};

export = pDebounce;
