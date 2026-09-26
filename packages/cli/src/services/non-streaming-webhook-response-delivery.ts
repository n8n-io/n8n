import type { ExecutionResponse } from '@n8n/engine';
import { decodeBufferBody } from 'n8n-core';

import {
	resolveEndedResponse,
	resolveUndeliverableResponse,
	type WebhookResponseDelivery,
} from '@/services/engine-v2-webhook-response-delivery';
import type { PendingWebhookResponse } from '@/services/pending-webhook-response';

/** Delivers the terminal and Respond node results for a non-streaming webhook request. */
export class NonStreamingWebhookResponseDelivery implements WebhookResponseDelivery {
	constructor(private readonly response: PendingWebhookResponse) {}

	handle(received: ExecutionResponse): void {
		switch (received.type) {
			case 'undeliverable':
				resolveUndeliverableResponse(this.response, received);
				return;

			case 'response':
				// A Buffer body arrives base64-encoded, because the channel is JSON.
				this.response.resolveResponse(decodeBufferBody(received.payload));
				return;

			case 'chunk':
				// Nothing streams to a request that does not wait for a stream.
				return;

			case 'ended':
				resolveEndedResponse(this.response, received);
				return;
		}
	}
}
