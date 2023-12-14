import { AbstractServer } from '@/AbstractServer';

export class WebhookServer extends AbstractServer {
	constructor(opts: {
		shutdown: {
			signal: AbortSignal;
			timeoutInS: number;
		};
	}) {
		super('webhook');

		const { signal: shutdownSignal, timeoutInS } = opts.shutdown;

		shutdownSignal.addEventListener(
			'abort',
			async () => {
				await this.stop(timeoutInS);
			},
			{ once: true },
		);
	}

	/**
	 * Stops the server from accepting new connections and gives existing
	 * connections X seconds to finish their work and then closes them
	 * forcefully.
	 */
	private async stop(timeoutInS: number): Promise<void> {
		await super.stopServer(timeoutInS);
	}
}
