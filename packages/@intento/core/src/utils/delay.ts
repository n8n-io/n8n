/**
 * Utility for creating cancellable delays with AbortSignal support.
 *
 * Provides promise-based delays that can be interrupted via AbortSignal,
 * with proper cleanup to prevent memory leaks from dangling timeouts and listeners.
 */
export class Delay {
	/**
	 * Creates a cancellable delay that resolves after the specified duration.
	 *
	 * Returns immediately for 0ms delay. Properly cleans up timeout and abort listener
	 * when signal fires or timeout completes, preventing memory leaks in long-running processes.
	 *
	 * @param ms - Delay duration in milliseconds (must be ≥0)
	 * @param signal - Optional signal to cancel delay early
	 * @throws RangeError if ms is negative (developer error)
	 * @throws AbortError if signal aborts during delay
	 *
	 * @example
	 * ```typescript
	 * // Simple delay
	 * await Delay.apply(1000);
	 *
	 * // Cancellable delay
	 * const controller = new AbortController();
	 * setTimeout(() => controller.abort(), 500);
	 * await Delay.apply(1000, controller.signal); // Aborts after 500ms
	 * ```
	 */
	static async apply(ms: number, signal?: AbortSignal): Promise<void> {
		// NOTE: 0ms delay is no-op optimization - avoids unnecessary Promise/timeout overhead
		if (ms === 0) return;

		// Fail fast for developer errors - negative delays indicate incorrect usage
		if (ms < 0) throw new RangeError(`🐞 [BUG] Invalid delay duration: ${ms}. Duration must be non-negative.`);

		// Check if already cancelled before setting up timeout
		signal?.throwIfAborted();

		return await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				// CLEANUP: Remove abort listener when timeout completes normally
				// Prevents memory leak from listener attached to long-lived signal
				signal?.removeEventListener('abort', onAbort);
				resolve();
			}, ms);

			const onAbort = () => {
				// CLEANUP: Cancel pending timeout to prevent it firing after abort
				clearTimeout(timeout);
				reject(signal?.reason as Error);
			};

			// NOTE: { once: true } automatically removes listener after first fire,
			// providing additional cleanup safety if manual removal fails
			signal?.addEventListener('abort', onAbort, { once: true });
		});
	}
}
