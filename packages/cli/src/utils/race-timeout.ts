export const TIMED_OUT = Symbol('timed-out');

/** Resolves with the raced promise, or with {@link TIMED_OUT} after `timeoutMs`. */
export async function raceTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T | typeof TIMED_OUT> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<typeof TIMED_OUT>((resolve) => {
				timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
				timer.unref();
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
