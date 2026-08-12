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

function createTimeoutError(timeoutMs: number): Error {
	const error = new Error(`Operation timed out after ${timeoutMs}ms`);
	error.name = 'TimeoutError';
	return error;
}

/** Throw if the given signal has already fired. */
export function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw createAbortError(signal.reason);
	}
}

/**
 * Race work against an abort signal (and optional deadline) so Stop — or a
 * hung tool — settles promptly even when the underlying work ignores
 * cancellation. Pass a factory when work must not start until after the
 * abort check (e.g. sandbox recover/retry). Cooperative callers should still
 * forward `abortSignal` into I/O where the provider supports it.
 *
 * When `timeoutMs` is set, work that has not settled by the deadline rejects
 * with a `TimeoutError` (distinct from `AbortError`) so the executor can
 * record it as a tool error the LLM can self-correct from, rather than a
 * cancellation. The abort listener and any pending timer are always removed
 * when the race settles so run-scoped signals do not accumulate listeners
 * across nested tool calls.
 */
export async function raceWithAbort<T>(
	work: Promise<T> | (() => Promise<T>),
	signal?: AbortSignal,
	timeoutMs?: number,
): Promise<T> {
	const run = typeof work === 'function' ? work : async () => await work;
	const deadline = timeoutMs !== undefined && timeoutMs > 0 ? timeoutMs : undefined;
	const hasTimeout = deadline !== undefined;
	if (!signal && !hasTimeout) {
		return await run();
	}
	if (signal) throwIfAborted(signal);

	let onAbort!: () => void;
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const racers: Array<Promise<never>> = [];

	if (signal) {
		racers.push(
			new Promise<never>((_, reject) => {
				onAbort = () => {
					reject(createAbortError(signal.reason));
				};
				signal.addEventListener('abort', onAbort, { once: true });
			}),
		);
	}

	if (hasTimeout) {
		racers.push(
			new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => reject(createTimeoutError(deadline)), deadline);
			}),
		);
	}

	try {
		return await Promise.race([run(), ...racers]);
	} finally {
		if (signal) signal.removeEventListener('abort', onAbort);
		if (timeoutId !== undefined) clearTimeout(timeoutId);
	}
}
