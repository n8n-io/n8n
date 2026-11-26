/**
 * A cancel signal for one agent run. It aborts when the execution is cancelled
 * or when a promise given to `abortOnFailure` rejects.
 */
export function createRunCancellation(executionSignal?: AbortSignal) {
	const controller = new AbortController();
	return {
		signal: executionSignal
			? AbortSignal.any([executionSignal, controller.signal])
			: controller.signal,
		/** Tool calls of a failed run can still be in flight. The abort stops them. */
		async abortOnFailure<T>(run: Promise<T>): Promise<T> {
			try {
				return await run;
			} catch (error) {
				controller.abort();
				throw error;
			}
		},
	};
}
