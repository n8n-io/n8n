// Thin headless-only subclass of WebhookServer. The base AbstractServer
// stores its underlying http.Server on a protected field with no public
// close() method (the `webhook` and `start` commands keep the process
// alive forever and rely on process.exit for teardown). Headless needs
// to stop the listener cleanly when the lifecycle aborts, so we expose
// `close()` here without touching the framework class.

import { Service } from '@n8n/di';

import { WebhookServer } from '@/webhooks/webhook-server';

@Service()
export class HeadlessWebhookServer extends WebhookServer {
	async close(): Promise<void> {
		if (!this.server) return;
		await new Promise<void>((resolve, reject) => {
			this.server.close((error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	}
}
