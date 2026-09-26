import type { EndedMessage, ExecutionResponse, UndeliverableMessage } from '@n8n/engine';

import type { PendingWebhookResponse } from '@/services/pending-webhook-response';

/** The HTTP response operations that streaming delivery owns. */
export interface ResponseStream {
	readonly writableEnded: boolean;
	readonly destroyed?: boolean;
	write(chunk: string): void;
	end(): void;
	flush?: () => void;
	once(event: 'finish' | 'close', listener: () => void): void;
	off(event: 'finish' | 'close', listener: () => void): void;
}

/** Turns the responses of one run into the answer of its webhook request. */
export interface WebhookResponseDelivery {
	handle(received: ExecutionResponse): void;
	dispose?(): void;
}

export function resolveUndeliverableResponse(
	response: PendingWebhookResponse,
	received: UndeliverableMessage,
): void {
	response.resolve({
		status: 'undeliverable',
		error: { name: received.error.code, message: received.error.message },
	});
}

export function resolveEndedResponse(
	response: PendingWebhookResponse,
	received: EndedMessage,
): void {
	const { nodeName, outputs, error } = received.lastStep;

	if (received.status === 'failed') {
		// The step that ended a failed run is the one that failed, so its name
		// and error are what the caller reports.
		response.resolve({ status: 'failed', nodeName, error });
		return;
	}

	response.resolve({
		status: 'completed',
		// A skipped or failed step carries nothing to answer with.
		lastNode: outputs ? { nodeName, outputs } : undefined,
	});
}
