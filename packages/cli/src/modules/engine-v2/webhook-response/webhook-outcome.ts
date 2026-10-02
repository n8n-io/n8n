import type { ExecutionResponse, ResponseExpectation, StepSlots } from '@n8n/engine';
import { decodeBufferBody } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

/** The last node that ran, as the `lastNode` response mode answers with. */
export type LastNode = { nodeName: string; outputs: StepSlots };

/** What a data-plane run produced, from the open request's point of view. */
export type WebhookRunOutcome =
	| { status: 'response'; response: unknown }
	| { status: 'completed'; lastNode?: LastNode }
	| {
			status: 'failed';
			nodeId: string;
			nodeName: string;
			error?: { name: string; message: string };
	  }
	/** The execution response could not be produced or delivered. */
	| { status: 'undeliverable'; error: { name: string; message: string } }
	| { status: 'timeout' };

/**
 * Maps one execution response to the outcome of the webhook request that waits
 * for it. Returns `undefined` when the response does not answer the request.
 *
 * @param expectation What the request waits for. Only `stepResponse` lets a
 * Respond to Webhook result answer it. The engine obeys this too, so this
 * filter is a second defense.
 */
export function toWebhookOutcome(
	received: ExecutionResponse,
	expectation: ResponseExpectation,
): WebhookRunOutcome | undefined {
	switch (received.type) {
		case 'undeliverable':
			return {
				status: 'undeliverable',
				error: { name: received.error.code, message: received.error.message },
			};

		case 'response':
			if (expectation.kind !== 'stepResponse') return undefined;
			// A Buffer body arrives base64-encoded, because the channel is JSON.
			return { status: 'response', response: decodeBufferBody(received.payload) };

		case 'chunk':
			// A chunk is a part of a stream. It never answers the request alone.
			return undefined;

		case 'ended': {
			const { nodeId, nodeName, outputs, error } = received.lastStep;

			switch (received.status) {
				case 'failed':
					// The step that ended a failed run is the one that failed, so its name
					// and error are what the caller reports.
					return { status: 'failed', nodeId, nodeName, error };

				case 'completed':
					return {
						status: 'completed',
						// A skipped or failed step carries nothing to answer with.
						lastNode: outputs ? { nodeName, outputs } : undefined,
					};

				default: {
					const exhaustive: never = received.status;
					throw new UnexpectedError(`Unexpected run status: ${JSON.stringify(exhaustive)}`);
				}
			}
		}

		default: {
			const exhaustive: never = received;
			throw new UnexpectedError(`Unexpected response type: ${JSON.stringify(exhaustive)}`);
		}
	}
}
