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

async function abortRejection(signal: AbortSignal): Promise<never> {
	return await new Promise((_, reject) => {
		if (signal.aborted) {
			reject(createAbortError(signal.reason));
			return;
		}
		signal.addEventListener(
			'abort',
			() => {
				reject(createAbortError(signal.reason));
			},
			{ once: true },
		);
	});
}

/**
 * Race a promise against an abort signal so Stop settles promptly even when
 * the underlying work ignores cancellation. Cooperative callers should still
 * forward `abortSignal` into I/O where the provider supports it.
 */
export async function raceWithAbort<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
	if (!signal) {
		return await work;
	}
	throwIfAborted(signal);
	return await Promise.race([work, abortRejection(signal)]);
}
