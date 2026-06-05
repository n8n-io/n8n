import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';

/**
 * Tracks cache hit, miss, and update counts by subscribing to CacheService events.
 * Registers: `n8n_cache_hits_total`, `n8n_cache_misses_total`, `n8n_cache_updates_total`.
 */
@Service()
export class PrometheusCacheMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly cacheService: CacheService,
		private readonly config: PrometheusMetricsConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeCacheMetrics;
	}

	init() {
		const cache = this.cacheService.isRedis() ? 'redis' : 'memory';

		const [hitsConfig, missesConfig, updatesConfig] = ['hits', 'misses', 'updates'].map((kind) => ({
			name: `${this.config.prefix}cache_${kind}_total`,
			help: `Total number of cache ${kind}.`,
			labelNames: ['cache'],
		}));

		const cacheHitsTotal = new promClient.Counter(hitsConfig);
		cacheHitsTotal.inc({ cache }, 0);
		this.cacheService.on('metrics.cache.hit', () => cacheHitsTotal.inc({ cache }, 1));

		const cacheMissesTotal = new promClient.Counter(missesConfig);
		cacheMissesTotal.inc({ cache }, 0);
		this.cacheService.on('metrics.cache.miss', () => cacheMissesTotal.inc({ cache }, 1));

		const cacheUpdatesTotal = new promClient.Counter(updatesConfig);
		cacheUpdatesTotal.inc({ cache }, 0);
		this.cacheService.on('metrics.cache.update', () => cacheUpdatesTotal.inc({ cache }, 1));
	}
}
