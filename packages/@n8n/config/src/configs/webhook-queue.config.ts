import { Config, Env } from '../decorators';

@Config
export class WebhookQueueConfig {
	/** Webhook base URL to use in frontend if webhook queueing should be used. */
	@Env('N8N_WEBHOOK_QUEUE_URL')
	url: string = '';
}
