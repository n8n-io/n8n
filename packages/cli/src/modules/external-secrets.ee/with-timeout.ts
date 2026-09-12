import { OperationalError } from 'n8n-workflow';

/**
 * Rejects with `message` if `work` has not settled after `ms`.
 *
 * The losing promise is not cancelled: providers expose no abort handle, so the caller
 * only stops waiting for it. A provider that answers later still runs its own state
 * transitions, which the retry that follows a timeout supersedes.
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
