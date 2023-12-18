import { AbstractServer } from '@/AbstractServer';
import { ShutdownListener } from '@/decorators/ShutdownListener';

@ShutdownListener()
export class WebhookServer extends AbstractServer {
	constructor() {
		super('webhook');
	}
}
