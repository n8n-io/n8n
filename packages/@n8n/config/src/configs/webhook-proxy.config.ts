import { Config, Env } from '../decorators';

@Config
export class WebhookProxyConfig {
	/** Webhook base URL to use in frontend if webhook proxy should be used. */
	@Env('N8N_WEBHOOK_PROXY_URL')
	url: string = '';
}
