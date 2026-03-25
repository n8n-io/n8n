import isNetworkError from 'is-network-error';

function validateRetries(retries) {
	if (typeof retries === 'number') {
		if (retries < 0) {
			throw new TypeError('Expected `retries` to be a non-negative number.');
		}

		if (Number.isNaN(retries)) {
			throw new TypeError('Expected `retries` to be a valid number or Infinity, got NaN.');
		}
	} else if (retries !== undefined) {
		throw new TypeError('Expected `retries` to be a number or Infinity.');
	}
}

function validateNumberOption(name, value, {min = 0, allowInfinity = false} = {}) {
	if (value === undefined) {
		return;
	}

	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw new TypeError(`Expected \`${name}\` to be a number${allowInfinity ? ' or Infinity' : ''}.`);
	}

	if (!allowInfinity && !Number.isFinite(value)) {
		throw new TypeError(`Expected \`${name}\` to be a finite number.`);
	}

	if (value < min) {
		throw new TypeError(`Expected \`${name}\` to be \u2265 ${min}.`);
	}
}

export class AbortError extends Error {
	constructor(message) {
		super();

		if (message instanceof Error) {
			this.originalError = message;
			({message} = message);
		} else {
			this.originalError = new Error(message);
			this.originalError.stack = this.stack;
		}

		this.name = 'AbortError';
		this.message = message;
	}
}

function calculateDelay(retriesConsumed, options) {
	const attempt = Math.max(1, retriesConsumed + 1);
	const random = options.randomize ? (Math.random() + 1) : 1;

	let timeout = Math.round(random * options.minTimeout * (options.factor ** (attempt - 1)));
	timeout = Math.min(timeout, options.maxTimeout);

	return timeout;
}

function calculateRemainingTime(start, max) {
	if (!Number.isFinite(max)) {
		return max;
	}

	return max - (performance.now() - start);
}

async function onAttemptFailure({error, attemptNumber, retriesConsumed, startTime, options}) {
	const normalizedError = error instanceof Error
		? error
		: new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`);

	if (normalizedError instanceof AbortError) {
		throw normalizedError.originalError;
	}

	const retriesLeft = Number.isFinite(options.retries)
		? Math.max(0, options.retries - retriesConsumed)
		: options.retries;

	const maxRetryTime = options.maxRetryTime ?? Number.POSITIVE_INFINITY;

	const context = Object.freeze({
		error: normalizedError,
		attemptNumber,
		retriesLeft,
		retriesConsumed,
	});

	await options.onFailedAttempt(context);

	if (calculateRemainingTime(startTime, maxRetryTime) <= 0) {
		throw normalizedError;
	}

	const consumeRetry = await options.shouldConsumeRetry(context);

	const remainingTime = calculateRemainingTime(startTime, maxRetryTime);

	if (remainingTime <= 0 || retriesLeft <= 0) {
		throw normalizedError;
	}

	if (normalizedError instanceof TypeError && !isNetworkError(normalizedError)) {
		if (consumeRetry) {
			throw normalizedError;
		}

		options.signal?.throwIfAborted();
		return false;
	}

	if (!await options.shouldRetry(context)) {
		throw normalizedError;
	}

	if (!consumeRetry) {
		options.signal?.throwIfAborted();
		return false;
	}

	const delayTime = calculateDelay(retriesConsumed, options);
	const finalDelay = Math.min(delayTime, remainingTime);

	options.signal?.throwIfAborted();

	if (finalDelay > 0) {
		await new Promise((resolve, reject) => {
			const onAbort = () => {
				clearTimeout(timeoutToken);
				options.signal?.removeEventListener('abort', onAbort);
				reject(options.signal.reason);
			};

			const timeoutToken = setTimeout(() => {
				options.signal?.removeEventListener('abort', onAbort);
				resolve();
			}, finalDelay);

			if (options.unref) {
				timeoutToken.unref?.();
			}

			options.signal?.addEventListener('abort', onAbort, {once: true});
		});
	}

	options.signal?.throwIfAborted();

	return true;
}

export default async function pRetry(input, options = {}) {
	options = {...options};

	validateRetries(options.retries);

	if (Object.hasOwn(options, 'forever')) {
		throw new Error('The `forever` option is no longer supported. For many use-cases, you can set `retries: Infinity` instead.');
	}

	options.retries ??= 10;
	options.factor ??= 2;
	options.minTimeout ??= 1000;
	options.maxTimeout ??= Number.POSITIVE_INFINITY;
	options.maxRetryTime ??= Number.POSITIVE_INFINITY;
	options.randomize ??= false;
	options.onFailedAttempt ??= () => {};
	options.shouldRetry ??= () => true;
	options.shouldConsumeRetry ??= () => true;

	// Validate numeric options and normalize edge cases
	validateNumberOption('factor', options.factor, {min: 0, allowInfinity: false});
	validateNumberOption('minTimeout', options.minTimeout, {min: 0, allowInfinity: false});
	validateNumberOption('maxTimeout', options.maxTimeout, {min: 0, allowInfinity: true});
	validateNumberOption('maxRetryTime', options.maxRetryTime, {min: 0, allowInfinity: true});

	// Treat non-positive factor as 1 to avoid zero backoff or negative behavior
	if (!(options.factor > 0)) {
		options.factor = 1;
	}

	options.signal?.throwIfAborted();

	let attemptNumber = 0;
	let retriesConsumed = 0;
	const startTime = performance.now();

	while (Number.isFinite(options.retries) ? retriesConsumed <= options.retries : true) {
		attemptNumber++;

		try {
			options.signal?.throwIfAborted();

			const result = await input(attemptNumber);

			options.signal?.throwIfAborted();

			return result;
		} catch (error) {
			if (await onAttemptFailure({
				error,
				attemptNumber,
				retriesConsumed,
				startTime,
				options,
			})) {
				retriesConsumed++;
			}
		}
	}

	// Should not reach here, but in case it does, throw an error
	throw new Error('Retry attempts exhausted without throwing an error.');
}

export function makeRetriable(function_, options) {
	return function (...arguments_) {
		return pRetry(() => function_.apply(this, arguments_), options);
	};
}
