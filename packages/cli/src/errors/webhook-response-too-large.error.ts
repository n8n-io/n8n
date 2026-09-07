import { UserError } from 'n8n-workflow';

/**
 * A response a worker cannot deliver back to the main instance because of its size.
 *
 * @param description How to make the response deliverable, which depends on
 * which limit it crossed: the size relayable inline through the queue, or the
 * size the binary-data store accepts for an offloaded body.
 */
export class WebhookResponseTooLargeError extends UserError {
	constructor(message: string, options: { description: string; cause?: unknown }) {
		super(message, options);
	}
}
