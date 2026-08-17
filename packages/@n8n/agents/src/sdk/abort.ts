/**
 * Abort helpers for agent runs and long-running tool / sandbox work.
 * Stop should unblock the executor even when underlying I/O does not cancel.
 */

export function isAbortError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	if (error.name === 'AbortError') return true;
	return error.message === 'Aborted' || error.message === 'This operation was aborted';
}

export function createAbortError(reason?: unknown): Error {
	if (reason instanceof Error) return reason;
	const error = new Error(typeof reason === 'string' ? reason : 'This operation was aborted');
	error.name = 'AbortError';
	return error;
}

/** Throw if the given signal has already fired. */
export function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw createAbortError(signal.reason);
	}
}

/**
 * Race work against an abort signal so Stop settles promptly even when the
 * underlying work ignores cancellation. Pass a factory when work must not start
 * until after the abort check (e.g. sandbox recover/retry). Cooperative callers
 * should still forward `abortSignal` into I/O where the provider supports it.
 *
 * The abort listener is always removed when the race settles so run-scoped
 * signals do not accumulate listeners across nested tool calls.
 */
export async function raceWithAbort<T>(
	work: Promise<T> | (() => Promise<T>),
	signal?: AbortSignal,
): Promise<T> {
	const run = typeof work === 'function' ? work : async () => await work;
	if (!signal) {
		return await run();
	}
	throwIfAborted(signal);

	let onAbort!: () => void;
	const rejection = new Promise<never>((_, reject) => {
		onAbort = () => {
			reject(createAbortError(signal.reason));
		};
		signal.addEventListener('abort', onAbort, { once: true });
	});

	try {
		return await Promise.race([run(), rejection]);
	} finally {
		signal.removeEventListener('abort', onAbort);
	}
}
