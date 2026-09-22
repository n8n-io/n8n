import type { ExecutionResponse } from '@n8n/engine';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData, IN8nHttpFullResponse } from 'n8n-workflow';

import {
	resolveEndedResponse,
	type WebhookResponseDelivery,
} from '@/services/engine-v2-webhook-response-delivery';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';

/** Delivers terminal and Respond-node results for a non-streaming webhook request. */
export class NonStreamingWebhookResponseDelivery implements WebhookResponseDelivery {
	constructor(
		private readonly response: PendingWebhookResponse,
		private readonly responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	) {}

	handle(published: ExecutionResponse): void {
		switch (published.type) {
			case 'failure':
				this.responsePromise?.reject(new Error(published.error.message));
				this.response.resolve({
					status: 'failed',
					error: { name: published.error.code, message: published.error.message },
				});
				return;

			case 'response':
				// The payload is opaque on the channel. Only this plane knows the v1 response.
				this.responsePromise?.resolve(published.payload as unknown as IN8nHttpFullResponse);
				return;

			case 'chunk':
				return;

			case 'ended':
				// The sentinel lets the webhook handler answer when the Respond node did not run.
				this.responsePromise?.resolve(EXECUTION_ENDED_WITHOUT_RESPONSE);
				resolveEndedResponse(this.response, published);
				return;
		}
	}
}
