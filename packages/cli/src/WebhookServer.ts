import { AbstractServer } from '@/AbstractServer';

export class WebhookServer extends AbstractServer {
	constructor() {
		super('webhook');
	}
}
