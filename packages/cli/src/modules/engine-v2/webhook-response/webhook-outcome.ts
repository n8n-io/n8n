import type { EndedMessage, ExecutionResponse, ResponseExpectation, StepSlots } from '@n8n/engine';
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
	/** The run was stopped on request, so no node answers. */
	| { status: 'cancelled' }
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

		case 'ended':
			switch (received.status) {
				case 'cancelled':
					// The run was stopped on request, so no node answers.
					return { status: 'cancelled' };

				case 'failed': {
					// The step that ended a failed run is the one that failed, so its name
					// and error are what the caller reports.
					const { nodeId, nodeName, error } = settledLastStep(received);
					return { status: 'failed', nodeId, nodeName, error };
				}

				case 'completed': {
					const { nodeName, outputs } = settledLastStep(received);
					return {
						status: 'completed',
						// A skipped or failed step carries nothing to answer with.
						lastNode: outputs ? { nodeName, outputs } : undefined,
					};
				}

				default: {
					const exhaustive: never = received.status;
					throw new UnexpectedError(`Unexpected run status: ${JSON.stringify(exhaustive)}`);
				}
			}

		default: {
			const exhaustive: never = received;
			throw new UnexpectedError(`Unexpected response type: ${JSON.stringify(exhaustive)}`);
		}
	}
}

/**
 * The step that ended a settled run. Only a cancelled run ends without one,
 * and the wire schema holds the two together.
 */
function settledLastStep(received: EndedMessage): NonNullable<EndedMessage['lastStep']> {
	if (received.lastStep === null) {
		throw new UnexpectedError(
			`Run ${received.executionId} ended ${received.status} with no last step`,
		);
	}
	return received.lastStep;
}
