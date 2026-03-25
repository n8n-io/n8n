export class TimeoutError extends Error {
	name = 'TimeoutError';

	constructor(message, options) {
		super(message, options);
		Error.captureStackTrace?.(this, TimeoutError);
	}
}

const getAbortedReason = signal => signal.reason ?? new DOMException('This operation was aborted.', 'AbortError');

export default function pTimeout(promise, options) {
	const {
		milliseconds,
		fallback,
		message,
		customTimers = {setTimeout, clearTimeout},
		signal,
	} = options;

	let timer;
	let abortHandler;

	const wrappedPromise = new Promise((resolve, reject) => {
		if (typeof milliseconds !== 'number' || Math.sign(milliseconds) !== 1) {
			throw new TypeError(`Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``);
		}

		if (signal?.aborted) {
			reject(getAbortedReason(signal));
			return;
		}

		if (signal) {
			abortHandler = () => {
				reject(getAbortedReason(signal));
			};

			signal.addEventListener('abort', abortHandler, {once: true});
		}

		// Use .then() instead of async IIFE to preserve stack traces
		// eslint-disable-next-line promise/prefer-await-to-then, promise/prefer-catch
		promise.then(resolve, reject);

		if (milliseconds === Number.POSITIVE_INFINITY) {
			return;
		}

		// We create the error outside of `setTimeout` to preserve the stack trace.
		const timeoutError = new TimeoutError();

		// `.call(undefined, ...)` is needed for custom timers to avoid context issues
		timer = customTimers.setTimeout.call(undefined, () => {
			if (fallback) {
				try {
					resolve(fallback());
				} catch (error) {
					reject(error);
				}

				return;
			}

			if (typeof promise.cancel === 'function') {
				promise.cancel();
			}

			if (message === false) {
				resolve();
			} else if (message instanceof Error) {
				reject(message);
			} else {
				timeoutError.message = message ?? `Promise timed out after ${milliseconds} milliseconds`;
				reject(timeoutError);
			}
		}, milliseconds);
	});

	// eslint-disable-next-line promise/prefer-await-to-then
	const cancelablePromise = wrappedPromise.finally(() => {
		cancelablePromise.clear();
		if (abortHandler && signal) {
			signal.removeEventListener('abort', abortHandler);
		}
	});

	cancelablePromise.clear = () => {
		// `.call(undefined, ...)` is needed for custom timers to avoid context issues
		customTimers.clearTimeout.call(undefined, timer);
		timer = undefined;
	};

	return cancelablePromise;
}
