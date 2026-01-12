/**
 * Utility for creating abortable delays with proper cleanup.
 */
export class Delay {
	/**
	 * Pauses execution for specified duration with optional abort signal support.
	 *
	 * @param ms - Delay duration in milliseconds (must be non-negative, zero returns immediately)
	 * @param signal - Optional AbortSignal to cancel delay early (throws immediately if already aborted)
	 * @throws RangeError if ms < 0 (developer error)
	 * @throws Error if signal aborts during delay (propagates signal.reason)
	 */
	static async apply(ms: number, signal?: AbortSignal): Promise<void> {
		if (ms === 0) return;
		if (ms < 0) throw new RangeError(`Invalid delay duration: ${ms}. Duration must be non-negative.`);

		signal?.throwIfAborted();

		return await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				// NOTE: Explicit cleanup prevents memory leak if signal outlives timeout
				signal?.removeEventListener('abort', onAbort);
				resolve();
			}, ms);

			const onAbort = () => {
				clearTimeout(timeout);
				reject(signal?.reason as Error);
			};

			// NOTE: {once: true} ensures listener auto-removes on abort, preventing duplicate cleanup
			signal?.addEventListener('abort', onAbort, { once: true });
		});
	}
}
