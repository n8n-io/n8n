import { LockAcquisitionTimeoutError, LockNamespace, LockService } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { LockedError, ServiceUnavailableError } from '@n8n/errors';

/** The lock key of one environment, in `LockNamespace.KNOWN_LOCKS`. */
export function promotionEnvironmentLockKey(environmentId: string): string {
	return `promotion-environment:${environmentId}`;
}

export class PromotionLockLostError extends ServiceUnavailableError {
	constructor() {
		super(
			'The promotion operation stopped because n8n lost its lock on this environment. Try again.',
		);
	}
}

/** Call just before a step that cannot be undone. After that step, let the operation finish. */
export function throwIfLockLost(signal: AbortSignal): void {
	if (signal.aborted) throw new PromotionLockLostError();
}

/**
 * One lock for each promotion environment. It protects the environment's folder and the
 * operations that write to it or import from it, on all mains of one instance. Read-only paths
 * (the changes view, the review diff, and the Apply preview read) do not take it.
 *
 * This is an efficiency lock without fencing: on Redis the lease can expire while an operation
 * still runs. Operations check `throwIfLockLost` before each step that cannot be undone.
 *
 * The lock is not reentrant. A locked path must not call another locked path for the same
 * environment.
 */
@Service()
export class PromotionEnvironmentLockService {
	constructor(private readonly lockService: LockService) {}

	/** Runs `fn` while it holds the environment's lock. A busy lock fails at once with 423. */
	async run<T>(environmentId: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
		let started = false;
		try {
			return await this.lockService.withLease(
				LockNamespace.KNOWN_LOCKS,
				promotionEnvironmentLockKey(environmentId),
				async (signal) => {
					started = true;
					return await fn(signal);
				},
				{ waitTimeoutMs: 0 },
			);
		} catch (error) {
			// Only a failed acquisition means busy. The same error from inside `fn` passes through.
			if (!started && error instanceof LockAcquisitionTimeoutError) {
				throw new LockedError(
					'Another promotion operation is running for this environment. Try again when it finishes.',
				);
			}
			throw error;
		}
	}
}
