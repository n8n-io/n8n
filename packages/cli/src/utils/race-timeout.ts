/**
 * Race sentinel: the raced work can resolve to anything, so the deadline
 * resolves to a symbol it cannot produce.
 */
export const TIMED_OUT = Symbol('timed-out');

export type RaceTimeoutOptions = {
	/**
	 * Whether a pending deadline may let the process exit. Off by default, so a
	 * caller that has no other active handle still reaches its timeout branch.
	 * Turn it on only where the deadline must never keep the event loop alive.
	 */
	unref?: boolean;
};

/**
 * Resolves with the raced work, or with {@link TIMED_OUT} after `timeoutMs`.
 *
 * Pass a factory when the work does synchronous setup before it returns its
 * promise: the deadline is armed first, so `timeoutMs` covers that setup too.
 */
export async function raceTimeout<T>(
	work: Promise<T> | (() => Promise<T>),
	timeoutMs: number,
	{ unref = false }: RaceTimeoutOptions = {},
): Promise<T | typeof TIMED_OUT> {
	let timer: NodeJS.Timeout | undefined;
	try {
		const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
			timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
			if (unref) timer.unref();
		});
		return await Promise.race([typeof work === 'function' ? work() : work, timedOut]);
	} finally {
		clearTimeout(timer);
	}
}
