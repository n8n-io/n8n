import { WebhookPathTakenError, ensureError, sleep } from 'n8n-workflow';

import { WORKFLOW_REACTIVATE_INITIAL_TIMEOUT, WORKFLOW_REACTIVATE_MAX_TIMEOUT } from '@/constants';

/**
 * A deterministic activation error cannot be resolved by retrying: a webhook path
 * already owned by another workflow stays taken until the conflict is removed. Both
 * the retry loop and the applier's result classification rely on this distinction.
 */
export const isDeterministicActivationError = (error: Error): error is WebhookPathTakenError =>
	error instanceof WebhookPathTakenError;

/**
 * Activates a single trigger node, retrying transient failures in-process with
 * exponential backoff up to `maxAttempts` before giving up. Deterministic errors
 * (see {@link isDeterministicActivationError}) are rethrown without retry.
 *
 * The activated unit must be self-atomic — it must leave no partial state behind on
 * failure — so a re-attempt does not conflict with itself and needs no cleanup.
 */
export async function retryTriggerActivation(
	activate: () => Promise<void>,
	maxAttempts: number,
): Promise<void> {
	for (let attempt = 0; ; attempt++) {
		try {
			await activate();
			return;
		} catch (error) {
			const isLastAttempt = attempt >= maxAttempts - 1;
			if (isDeterministicActivationError(ensureError(error)) || isLastAttempt) throw error;

			await sleep(
				Math.min(
					WORKFLOW_REACTIVATE_INITIAL_TIMEOUT * 2 ** attempt,
					WORKFLOW_REACTIVATE_MAX_TIMEOUT,
				),
			);
		}
	}
}
