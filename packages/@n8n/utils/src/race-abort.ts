/**
 * Awaits `promise`, rejecting early with `abortError()` if `abortSignal` fires.
 *
 * The abort promise is built per call and its listener is removed as soon as
 * either side wins. A shared abort promise that stays pending for the lifetime
 * of a consumer must not be raced against: V8 keeps every reaction registered
 * on a pending promise, and each reaction holds the result promise of its race
 * along with the value that promise settled with, so each completed call would
 * stay reachable until the shared promise settles.
 */
export async function raceAbort<T>(
	promise: PromiseLike<T>,
	abortSignal: AbortSignal,
	abortError: () => Error,
): Promise<T> {
	if (abortSignal.aborted) throw abortError();

	let onAbort!: () => void;
	const aborted = new Promise<never>((_, reject) => {
		onAbort = () => reject(abortError());
		abortSignal.addEventListener('abort', onAbort, { once: true });
	});
	// An abort after `promise` already won leaves this rejection unconsumed.
	void aborted.catch(() => undefined);

	try {
		return await Promise.race([promise, aborted]);
	} finally {
		abortSignal.removeEventListener('abort', onAbort);
	}
}
