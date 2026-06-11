import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';

/**
 * Tracks the active workflow count via a Gauge, queried lazily on each scrape.
 * Results are cached to avoid hitting the database on every metrics request;
 * cache TTL is controlled by `endpoints.metrics.activeWorkflowCountInterval`.
 */
@Service()
export class PrometheusActiveWorkflowMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly cacheService: CacheService,
	) {}

	get enabled(): boolean {
		return true;
	}

	init() {
		const workflowRepository = this.workflowRepository;
		const cacheService = this.cacheService;
		const cacheKey = 'metrics:active-workflow-count';
		const cacheTtl = this.config.activeWorkflowCountInterval * Time.seconds.toMilliseconds;

		new promClient.Gauge({
			name: `${this.config.prefix}active_workflow_count`,
			help: 'Total number of active workflows.',
			async collect() {
				const value = await cacheService.get<string>(cacheKey);
				const numericValue = value !== undefined ? parseInt(value, 10) : undefined;

				if (numericValue !== undefined && Number.isFinite(numericValue)) {
					this.set(numericValue);
				} else {
					const activeWorkflowCount = await workflowRepository.getActiveCount();
					await cacheService.set(cacheKey, activeWorkflowCount.toString(), cacheTtl);

					this.set(activeWorkflowCount);
				}
			},
		});
	}
}
