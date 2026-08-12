import type { OneOffTaskSandbox } from '../contracts';

/**
 * Cleanup layer 1 of the one-off task design: the sandbox holds decrypted
 * credentials, so it is destroyed on every in-process path — success, thrown
 * error, and abort. Callers run the whole task (bootstrap + harness launches)
 * inside `fn`.
 */
export async function withOneOffTaskSandbox<T>(
	sandbox: OneOffTaskSandbox,
	fn: (sandbox: OneOffTaskSandbox) => Promise<T>,
): Promise<T> {
	let result: T;
	try {
		result = await fn(sandbox);
	} catch (error) {
		try {
			await sandbox.destroy();
		} catch {
			// The task's own failure is the primary signal; a destroy failure must
			// not mask it.
		}
		throw error;
	}
	// On the success path a failed destroy does surface — a sandbox left
	// holding secrets is a real failure.
	await sandbox.destroy();
	return result;
}
