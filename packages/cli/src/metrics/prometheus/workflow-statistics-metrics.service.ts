import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';
import { CachedMetricQuery } from './cached-metric-query';

type LicenseMetrics = Awaited<ReturnType<LicenseMetricsRepository['getLicenseRenewalMetrics']>>;

/**
 * Tracks workflow and instance statistics as Gauges (executions, users, workflows, credentials).
 * Values are cached to avoid repeated DB hits per scrape cycle, and concurrent gauge collects
 * within a scrape are coalesced to a single query. Cache TTL is controlled by
 * `endpoints.metrics.workflowStatisticsInterval`.
 */
@Service()
export class PrometheusWorkflowStatisticsMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly cacheService: CacheService,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
	) {}

	get enabled(): boolean {
		return this.config.includeWorkflowStatistics;
	}

	init() {
		const cacheTtl = this.config.workflowStatisticsInterval * Time.seconds.toMilliseconds;
		const query = new CachedMetricQuery<LicenseMetrics>({
			cacheService: this.cacheService,
			cacheKey: 'metrics:workflow-statistics:shared:v2',
			ttlMs: cacheTtl,
			query: async () => await this.licenseMetricsRepository.getLicenseRenewalMetrics(),
		});

		const metricsConfig = [
			{
				name: 'production_executions',
				help: 'Total number of production workflow executions (success + error).',
				getValue: (metrics: LicenseMetrics) => Number(metrics.productionExecutions) || 0,
			},
			{
				name: 'production_root_executions',
				help: 'Total number of production root workflow executions (excludes sub-workflows).',
				getValue: (metrics: LicenseMetrics) => Number(metrics.productionRootExecutions) || 0,
			},
			{
				name: 'manual_executions',
				help: 'Total number of manual workflow executions (success + error).',
				getValue: (metrics: LicenseMetrics) => Number(metrics.manualExecutions) || 0,
			},
			{
				name: 'enabled_users',
				help: 'Total number of enabled users.',
				getValue: (metrics: LicenseMetrics) => Number(metrics.enabledUsers) || 0,
			},
			{
				name: 'users',
				help: 'Total number of users.',
				getValue: (metrics: LicenseMetrics) => Number(metrics.totalUsers) || 0,
			},
			{
				name: 'workflows',
				help: 'Total number of workflows.',
				getValue: (metrics: LicenseMetrics) => Number(metrics.totalWorkflows) || 0,
			},
			{
				name: 'credentials',
				help: 'Total number of credentials.',
				getValue: (metrics: LicenseMetrics) => Number(metrics.totalCredentials) || 0,
			},
		];

		metricsConfig.forEach((config) => {
			this.createWorkflowStatisticsGauge(config.name, config.help, config.getValue, query);
		});
	}

	private createWorkflowStatisticsGauge(
		metricName: string,
		help: string,
		getMetricValue: (metrics: LicenseMetrics) => number,
		query: CachedMetricQuery<LicenseMetrics>,
	): promClient.Gauge {
		return new promClient.Gauge({
			name: `${this.config.prefix}${metricName}`,
			help,
			async collect() {
				this.set(getMetricValue(await query.get()));
			},
		});
	}
}
