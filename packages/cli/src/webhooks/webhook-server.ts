import { Container, Service } from '@n8n/di';

import { AbstractServer } from '@/abstract-server';

@Service()
export class WebhookServer extends AbstractServer {
	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus-metrics.service');
			await Container.get(PrometheusMetricsService).init(this.app);
		}
	}
}
