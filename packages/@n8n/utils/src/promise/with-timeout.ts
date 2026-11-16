/**
 * Settles as `promise` does, or rejects with `timeoutError()` when `promise` is not
 * settled after `timeoutMs`. A fractional `timeoutMs` is rounded up.
 *
 * The timeout does not stop the work behind `promise`. Only the caller stops waiting.
 */
export async function withTimeout<T>(
	promise: PromiseLike<T>,
	timeoutMs: number,
	timeoutError: () => Error,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(timeoutError()), Math.ceil(timeoutMs));
	});

	try {
		return await Promise.race([promise, timedOut]);
	} finally {
		clearTimeout(timer);
	}
}
