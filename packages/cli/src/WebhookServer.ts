import { AbstractServer } from '@/AbstractServer';

export class WebhookServer extends AbstractServer {
	constructor() {
		super('webhook');
	}

	/**
	 * Stops the server from accepting new connections and gives existing
	 * connections X seconds to finish their work and then closes them
	 * forcefully.
	 */
	async stop(timeoutInS: number = 30): Promise<void> {
		await super.stopServer(timeoutInS);
	}
}
