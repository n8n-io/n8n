import { Container, Service } from '@n8n/di';

import { AbstractServer } from '@/abstract-server';

@Service()
export class WebhookServer extends AbstractServer {
	/** Mounts `/metrics` so dedicated webhook procs are scrapeable. */
	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus');
			Container.get(PrometheusMetricsService).init(this.app);
		}
	}
}
