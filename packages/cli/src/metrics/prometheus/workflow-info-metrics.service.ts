import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';
import { CachedMetricQuery } from './cached-metric-query';

/**
 * Exposes a gauge (`n8n_workflow_info`) that maps workflow IDs to their human-readable
 * names, enabling dashboards to resolve IDs to names without extra lookups.
 * Results are cached to avoid hitting the database on every metrics scrape;
 * cache TTL is controlled by `endpoints.metrics.workflowInfoMetricInterval`.
 */
@Service()
export class PrometheusWorkflowInfoMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly cacheService: CacheService,
	) {}

	get enabled(): boolean {
		return this.config.includeWorkflowInfoMetrics;
	}

	init() {
		const cacheTtl = this.config.workflowInfoMetricInterval * Time.seconds.toMilliseconds;
		const query = new CachedMetricQuery<Array<{ id: string; name: string }>>({
			cacheService: this.cacheService,
			cacheKey: 'metrics:workflow-info:v2',
			ttlMs: cacheTtl,
			query: async () => await this.workflowRepository.find({ select: ['id', 'name'] }),
		});

		new promClient.Gauge({
			name: `${this.config.prefix}workflow_info`,
			help: 'Map of workflow ID to name.',
			labelNames: ['workflow_id', 'workflow_name'],
			async collect() {
				this.reset();

				const workflows = await query.get();
				for (const { id, name } of workflows) {
					this.labels({ workflow_id: id, workflow_name: name }).set(1);
				}
			},
		});
	}
}
