import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/** Metrics for the execution usage held in memory. */
@Service()
export class PrometheusExecutionLimitsMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly licenseState: LicenseState,
		private readonly eventService: EventService,
	) {}

	/**
	 * Mirrors where `ExecutionLimitsModule.init` starts the usage cache. It does not ask the
	 * cache, because an import of the module package loads its pubsub handlers.
	 */
	get enabled(): boolean {
		const { instanceType } = this.instanceSettings;
		return (
			this.config.includeExecutionLimitsMetrics &&
			(instanceType === 'main' || instanceType === 'webhook') &&
			this.moduleRegistry.isActive('execution-limits') &&
			this.licenseState.isExecutionLimitsLicensed()
		);
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
