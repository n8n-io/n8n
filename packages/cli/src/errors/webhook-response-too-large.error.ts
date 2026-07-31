import { UserError } from 'n8n-workflow';

export class WebhookResponseTooLargeError extends UserError {
	constructor(maxSizeInMiB: number) {
		super(
			`The response is too large to be sent back from the worker (limit is ${maxSizeInMiB} MiB)`,
			{
				description:
					'In scaling mode a response is relayed to the main instance through the queue, which limits how large it can be. Respond with binary data to have the payload streamed from storage instead, or raise N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX.',
			},
		);
	}
}
