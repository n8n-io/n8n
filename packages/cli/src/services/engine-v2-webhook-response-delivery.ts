import type { EndedMessage, ExecutionResponse } from '@n8n/engine';

import { PendingWebhookResponse } from '@/services/pending-webhook-response';

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

export interface WebhookResponseDelivery {
	handle(published: ExecutionResponse): void;
	dispose?(): void;
}

export function resolveEndedResponse(
	response: PendingWebhookResponse,
	published: EndedMessage,
): void {
	const { nodeName, outputs, error } = published.lastStep;

	if (published.status === 'failed') {
		response.resolve({ status: 'failed', nodeName, error });
		return;
	}

	response.resolve({
		status: 'completed',
		lastNode: outputs ? { nodeName, outputs } : undefined,
	});
}
