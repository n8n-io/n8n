import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { DatabaseMetricQueryService } from './database-metric-query.service';

type WorkflowInfoGaugeParams = {
	name: string;
	help: string;
	activeOnly: boolean;
};

/**
 * Exposes gauges that map workflow IDs to their human-readable names, enabling
 * dashboards to resolve IDs to names without extra lookups.
 *
 * Only the leader reports, as the mapping is instance-wide state.
 *
 * Results are cached to avoid hitting the database on every metrics scrape;
 * cache TTL is controlled by `endpoints.metrics.workflowInfoMetricInterval`.
 */
@Service()
export class PrometheusWorkflowInfoMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly databaseQueries: DatabaseMetricQueryService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	get enabled(): boolean {
		return this.config.includeWorkflowInfoMetrics;
	}

	init() {
		this.initGauge({
			name: 'workflow_info',
			help: 'Map of workflow ID to name. Reported by the leader main only.',
			activeOnly: false,
		});
		this.initGauge({
			name: 'active_workflow_info',
			help: 'Map of active workflow ID to name. Reported by the leader main only.',
			activeOnly: true,
		});
	}

	private initGauge({ name, help, activeOnly }: WorkflowInfoGaugeParams) {
		const { instanceSettings } = this;
		const cacheTtl = this.config.workflowInfoMetricInterval * Time.seconds.toMilliseconds;
		const query = this.databaseQueries.workflowInfo(cacheTtl, activeOnly);

		new promClient.Gauge({
			name: `${this.config.prefix}${name}`,
			help,
			labelNames: ['workflow_id', 'workflow_name'],
			async collect() {
				if (!instanceSettings.isLeader) {
					this.reset();
					return;
				}

				const workflows = await query.get();
				if (workflows !== undefined) {
					this.reset();
					for (const { id, name: workflowName } of workflows) {
						this.labels({ workflow_id: id, workflow_name: workflowName }).set(1);
					}
				}
			},
		});
	}
}
