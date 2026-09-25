import type { WebhookResponse } from './webhook-response';
import type { IWebhookResponseCallbackData } from './webhook.types';

export type WebhookResponseCallback = (
	error: Error | null,
	data: IWebhookResponseCallbackData | WebhookResponse,
) => void;

/**
 * Sends the response to a webhook request and tracks if a response was sent.
 * A webhook request must get exactly one response.
 */
export class WebhookResponder {
	private responded = false;

	constructor(private readonly sendResponse: WebhookResponseCallback) {}

	/** Whether a response was sent, or another party took ownership of the response. */
	get hasResponded(): boolean {
		return this.responded;
	}

	/** Sends the response data and records that the request has a response. */
	respondWith(data: IWebhookResponseCallbackData | WebhookResponse): void {
		this.sendResponse(null, data);
		this.responded = true;
	}

	/** Sends an error response and records that the request has a response. */
	respondWithError(error: Error): void {
		this.sendResponse(error, {});
		this.responded = true;
	}

	/**
	 * Records that the request has a response without sending one here, because
	 * another party (e.g. a streaming node) owns the response.
	 */
	markResponded(): void {
		this.responded = true;
	}
}
