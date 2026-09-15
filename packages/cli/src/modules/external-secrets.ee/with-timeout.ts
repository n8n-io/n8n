import { OperationalError } from 'n8n-workflow';

/**
 * Rejects with `message` if `work` has not settled after `ms`.
 *
 * The losing promise is not cancelled: the caller only stops waiting for it. The work
 * keeps running and any provider-internal side effects of a late answer still apply.
 */
export async function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
	let timeoutId: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new OperationalError(message)), ms);
	});

	try {
		return await Promise.race([work, timeout]);
	} finally {
		clearTimeout(timeoutId);
	}
}
