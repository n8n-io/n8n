import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { toGaugeValue } from './cached-metric-query';
import { DatabaseMetricQueryService } from './database-metric-query.service';

/**
 * Tracks the active workflow count via a Gauge, queried lazily on each scrape.
 * Results are cached to avoid hitting the database on every metrics request;
 * cache TTL is controlled by `endpoints.metrics.activeWorkflowCountInterval`.
 */
@Service()
export class PrometheusActiveWorkflowMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly databaseQueries: DatabaseMetricQueryService,
	) {}

	get enabled(): boolean {
		return true;
	}

	init() {
		const cacheTtl = this.config.activeWorkflowCountInterval * Time.seconds.toMilliseconds;
		const query = this.databaseQueries.activeWorkflowCount(cacheTtl);

		new promClient.Gauge({
			name: `${this.config.prefix}active_workflow_count`,
			help: 'Total number of active workflows.',
			async collect() {
				this.set(toGaugeValue(await query.get(), (count) => count));
			},
		});
	}
}
