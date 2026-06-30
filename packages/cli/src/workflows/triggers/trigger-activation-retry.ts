import { WebhookPathTakenError, ensureError, sleep } from 'n8n-workflow';

import { WORKFLOW_REACTIVATE_INITIAL_TIMEOUT, WORKFLOW_REACTIVATE_MAX_TIMEOUT } from '@/constants';

/**
 * Determines whether an activation error is transient, i.e. worth retrying
 */
export const isTransientActivationError = (error: Error): boolean =>
	!(error instanceof WebhookPathTakenError);

/**
 * Activates a single trigger node, retrying transient failures in-process with
 * exponential backoff up to `maxAttempts` before giving up.
 *
 * The activate function must be self-atomic — it must leave no partial state behind on
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
			if (!isTransientActivationError(ensureError(error)) || isLastAttempt) throw error;

			await sleep(
				Math.min(
					WORKFLOW_REACTIVATE_INITIAL_TIMEOUT * 2 ** attempt,
					WORKFLOW_REACTIVATE_MAX_TIMEOUT,
				),
			);
		}
	}
}
