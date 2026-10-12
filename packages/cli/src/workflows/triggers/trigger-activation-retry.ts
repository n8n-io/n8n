import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import { WebhookPathTakenError } from 'n8n-workflow';

import { WORKFLOW_REACTIVATE_INITIAL_TIMEOUT, WORKFLOW_REACTIVATE_MAX_TIMEOUT } from '@/constants';

/**
 * Determines whether an activation error is transient, i.e. worth retrying
 */
export const isTransientActivationError = (error: Error): boolean =>
	!(error instanceof WebhookPathTakenError);

/**
 * Activates a single trigger node, retrying transient failures in-process with
 * exponential backoff up to `maxAttempts` before giving up. Once `signal`
 * aborts, no further attempt is started: a caller that abandoned this
 * activation must not have an old registration committed behind its back.
 *
 * The activate function must be self-atomic — it must leave no partial state behind on
 * failure — so a re-attempt does not conflict with itself and needs no cleanup.
 */
export async function retryTriggerActivation(
	activate: () => Promise<void>,
	maxAttempts: number,
	signal: AbortSignal,
): Promise<void> {
	for (let attempt = 0; ; attempt++) {
		signal.throwIfAborted();
		try {
			await activate();
			return;
		} catch (error) {
			const isLastAttempt = attempt >= maxAttempts - 1;
			if (!isTransientActivationError(ensureError(error)) || isLastAttempt || signal.aborted)
				throw error;

			// `sleep` rejects with the abort reason as soon as the signal fires, so
			// an abandoned retry unwinds promptly instead of sleeping out the backoff
			// (up to a day) while its caller holds the workflow's lifecycle lock.
			await sleep(
				Math.min(
					WORKFLOW_REACTIVATE_INITIAL_TIMEOUT * 2 ** attempt,
					WORKFLOW_REACTIVATE_MAX_TIMEOUT,
				),
				signal,
			);
		}
	}
}
