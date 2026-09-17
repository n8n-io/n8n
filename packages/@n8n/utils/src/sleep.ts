import { ensureError } from './errors/ensure-error';

async function sleepWithAbort(ms: number, abortSignal: AbortSignal): Promise<void> {
	return await new Promise((resolve, reject) => {
		if (abortSignal.aborted) {
			reject(ensureError(abortSignal.reason));
			return;
		}

		const onAbort = () => {
			clearTimeout(timeout);
			reject(ensureError(abortSignal.reason));
		};

		const timeout = setTimeout(() => {
			abortSignal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);

		abortSignal.addEventListener('abort', onAbort, { once: true });
	});
}

/**
 * Resolves after `ms` milliseconds, or rejects with the signal's abort reason
 * if `abortSignal` fires first.
 */
export async function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
	if (!abortSignal) {
		return await new Promise((resolve) => setTimeout(resolve, ms));
	}

	return await sleepWithAbort(ms, abortSignal);
}
