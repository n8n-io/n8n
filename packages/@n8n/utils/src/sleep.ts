async function sleepWithAbort(ms: number, abortSignal: AbortSignal): Promise<void> {
	return await new Promise((resolve, reject) => {
		if (abortSignal.aborted) {
			reject(new Error('Aborted'));
			return;
		}

		const timeout = setTimeout(resolve, ms);

		abortSignal.addEventListener(
			'abort',
			() => {
				clearTimeout(timeout);
				reject(new Error('Aborted'));
			},
			{ once: true },
		);
	});
}

/**
 * Resolves after `ms` milliseconds, or rejects early if `abortSignal` is aborted.
 */
export async function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
	if (!abortSignal) {
		return await new Promise((resolve) => setTimeout(resolve, ms));
	}

	return await sleepWithAbort(ms, abortSignal);
}
