import { Container, Service } from '@n8n/di';

import { AbstractServer } from '@/abstract-server';

@Service()
export class WebhookServer extends AbstractServer {
	/**
	 * Mirrors `Server.configure()` for the Prometheus metrics endpoint so that
	 * dedicated `n8n webhook` procs are observable. Without this, the proc
	 * runs `webhook-post-execute` events through its own `PrometheusMetricsService`
	 * instance (registered via DI when `N8N_METRICS=true`) but never serves
	 * `/metrics`, leaving counters like `n8n_workflow_success_total` invisible
	 * to any scraper.
	 */
	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus-metrics.service');
			await Container.get(PrometheusMetricsService).init(this.app);
		}
	}
}
