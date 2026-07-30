import { Config, Env } from '../decorators';

@Config
export class WebhooksConfig {
	/**
	 * Maximum number of concurrent requests processed at once for a single
	 * workflow's webhook; requests beyond the limit queue. Unset by default
	 * (unlimited).
	 *
	 * Fully bounds concurrent workflow runs only when the webhook's response
	 * mode is "When Last Node Finishes" or uses a "Respond to Webhook" node.
	 * With the default "Immediately" response mode, this limits concurrent
	 * webhook processing but not how many runs stay active afterward.
	 */
	@Env('N8N_WEBHOOK_MAX_CONCURRENT_PROCESSING_PER_WORKFLOW')
	maxConcurrentProcessingPerWorkflow?: number;
}
