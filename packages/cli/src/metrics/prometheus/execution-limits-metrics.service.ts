import { EventService } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/** Metrics for the execution usage held in memory. Workers do not hold it. */
@Service()
export class PrometheusExecutionLimitsMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		const { instanceType } = this.instanceSettings;
		return (
			this.config.includeExecutionLimitsMetrics &&
			(instanceType === 'main' || instanceType === 'webhook')
		);
	}

	init() {
		const prefix = this.config.prefix;

		const refreshDuration = new promClient.Histogram({
			name: `${prefix}execution_limit_usage_refresh_duration_seconds`,
			help: 'Time spent reading execution usage from the database into memory.',
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		});

		const refreshFailures = new promClient.Counter({
			name: `${prefix}execution_limit_usage_refresh_failures_total`,
			help: 'Total number of failed reads of execution usage from the database into memory.',
		});

		this.eventService.on('execution-limit-usage-refreshed', ({ durationMs }) => {
			refreshDuration.observe(durationMs * Time.milliseconds.toSeconds);
		});

		this.eventService.on('execution-limit-usage-refresh-failed', () => {
			refreshFailures.inc();
		});
	}
}
