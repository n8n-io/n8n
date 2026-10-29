import { Container, Service } from '@n8n/di';

import { AbstractServer } from '@/abstract-server';
import { ChatServer } from '@/chat/chat-server';
import { inE2ETests } from '@/constants';

@Service()
export class WebhookServer extends AbstractServer {
	/** Mounts `/metrics` so dedicated webhook procs are scrapeable. */
	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus/index.js');
			Container.get(PrometheusMetricsService).init(this.app);
		}

		// Webhook procs have no REST controllers, so the test-only diagnostics routes live here.
		if (inE2ETests) {
			const { createE2EDiagnosticsRouter } = await import('@/services/e2e-diagnostics.router.js');
			this.app.use(`/${this.restEndpoint}/e2e`, createE2EDiagnosticsRouter());
		}
	}

	/** The chat widget opens its WebSocket against the same origin that served the chat webhook */
	protected setupPushServer() {
		Container.get(ChatServer).setup(this.server, this.app);
	}
}
