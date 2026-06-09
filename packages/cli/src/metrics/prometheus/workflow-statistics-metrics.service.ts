import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import promClient from 'prom-client';

import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';

type LicenseMetrics = Awaited<ReturnType<LicenseMetricsRepository['getLicenseRenewalMetrics']>>;

/**
 * Tracks workflow and instance statistics as Gauges (executions, users, workflows, credentials).
 * Values are cached — first in Redis/persistent cache, then in-memory for scrape deduplication —
 * to avoid repeated DB hits per scrape cycle. Cache TTL is controlled by
 * `endpoints.metrics.workflowStatisticsInterval`.
 */
@Service()
export class PrometheusWorkflowStatisticsMetricsService implements PrometheusMetricsCollector {
	/** Shared in-memory cache to deduplicate DB calls within a single scrape cycle. */
	private workflowStatisticsCache: {
		data: LicenseMetrics;
		timestamp: number;
		ttl: number;
	} | null = null;

	/** Coalesces concurrent collect() calls so only one DB/Redis fetch runs at a time. */
	private inFlightRequest: Promise<LicenseMetrics> | null = null;

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
			this.createWorkflowStatisticsGauge(config.name, config.help, config.getValue, cacheTtl);
		});
	}

	private createWorkflowStatisticsGauge(
		metricName: string,
		help: string,
		getMetricValue: (metrics: LicenseMetrics) => number,
		cacheTtl: number,
	): promClient.Gauge {
		const fetchMetrics = async () => await this.getWorkflowStatistics(cacheTtl);
		return new promClient.Gauge({
			name: `${this.config.prefix}${metricName}`,
			help,
			async collect() {
				this.set(getMetricValue(await fetchMetrics()));
			},
		});
	}

	private async getWorkflowStatistics(cacheTtl: number): Promise<LicenseMetrics> {
		const now = Date.now();

		if (
			this.workflowStatisticsCache &&
			now - this.workflowStatisticsCache.timestamp < this.workflowStatisticsCache.ttl
		) {
			return this.workflowStatisticsCache.data;
		}

		this.inFlightRequest ??= this.fetchAndCacheMetrics(cacheTtl).finally(() => {
			this.inFlightRequest = null;
		});

		return await this.inFlightRequest;
	}

	private async fetchAndCacheMetrics(cacheTtl: number): Promise<LicenseMetrics> {
		const now = Date.now();
		const fullCacheKey = 'metrics:workflow-statistics:shared';
		const cachedValue = await this.cacheService.get(fullCacheKey);

		if (typeof cachedValue === 'string') {
			const parsedValue = jsonParse(cachedValue, { fallbackValue: undefined });
			if (parsedValue !== undefined) {
				this.workflowStatisticsCache = {
					data: parsedValue,
					timestamp: now,
					ttl: 1_000, // 1 second — enough to dedupe within a single scrape
				};
				return parsedValue;
			}
		}

		const metrics = await this.licenseMetricsRepository.getLicenseRenewalMetrics();
		await this.cacheService.set(fullCacheKey, JSON.stringify(metrics), cacheTtl);

		this.workflowStatisticsCache = {
			data: metrics,
			timestamp: now,
			ttl: 1_000, // 1 second — in-memory cache is only for scrape deduplication
		};

		return metrics;
	}
}
