import { ExecutionUsageCache } from '@n8n/backend-module-execution-limits';
import { EventService } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/** Metrics for the execution usage held in memory. */
@Service()
export class PrometheusExecutionLimitsMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly usageCache: ExecutionUsageCache,
		private readonly eventService: EventService,
	) {}

	/** The cache runs only where the module started it, so it decides for the module and licence. */
	get enabled(): boolean {
		return this.config.includeExecutionLimitsMetrics && this.usageCache.isRunning;
	}

	init() {
		const prefix = this.config.prefix;

		const refreshDuration = new promClient.Histogram({
			name: `${prefix}execution_limit_usage_refresh_duration_seconds`,
			help: 'Time spent reading execution usage from the database into memory.',
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		});

		const lastSuccess = new promClient.Gauge({
			name: `${prefix}execution_limit_usage_refresh_last_success_timestamp_seconds`,
			help: 'Unix time in seconds of the last successful refresh of execution usage, including refreshes that found no limit.',
		});

		const refreshFailures = new promClient.Counter({
			name: `${prefix}execution_limit_usage_refresh_failures_total`,
			help: 'Total number of failed reads of execution usage from the database into memory.',
		});

		this.eventService.on('execution-limit-usage-refreshed', ({ durationMs, queried }) => {
			lastSuccess.set(Date.now() * Time.milliseconds.toSeconds);
			// A refresh with no limit reads nothing, so its duration would skew the histogram.
			if (queried) refreshDuration.observe(durationMs * Time.milliseconds.toSeconds);
		});

		this.eventService.on('execution-limit-usage-refresh-failed', () => {
			refreshFailures.inc();
		});
	}
}
