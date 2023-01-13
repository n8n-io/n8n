import { AbstractServer } from '@/AbstractServer';

export class WebhookServer extends AbstractServer {
	async configure() {
		this.setupWebhookEndpoint();
		this.setupWaitingWebhookEndpoint();
	}
}
