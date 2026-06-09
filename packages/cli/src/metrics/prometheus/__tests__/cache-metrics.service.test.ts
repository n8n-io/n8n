import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

import { PrometheusCacheMetricsService } from '../cache-metrics.service';

import type { CacheService } from '@/services/cache/cache.service';

jest.mock('prom-client');

describe('PrometheusCacheMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeCacheMetrics: true,
	});
	const cacheService = mock<CacheService>();
	let service: PrometheusCacheMetricsService;
	let mockCounterInc: jest.Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeCacheMetrics: true });
		service = new PrometheusCacheMetricsService(cacheService, config);
		mockCounterInc = jest.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	function getCacheCall(metricName: string): (() => void) | undefined {
		const calls = cacheService.on.mock.calls as unknown as Array<[string, () => void]>;
		return calls.find((call) => call[0] === metricName)?.[1];
	}

	describe('enabled', () => {
		it('should be true when includeCacheMetrics is true', () => {
			config.includeCacheMetrics = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeCacheMetrics is false', () => {
			config.includeCacheMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create cache_hits_total counter with correct config', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
			});
		});

		it('should create cache_misses_total counter with correct config', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_misses_total',
				help: 'Total number of cache misses.',
			});
		});

		it('should create cache_updates_total counter with correct config', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_updates_total',
				help: 'Total number of cache updates.',
			});
		});

		it('should seed all 3 counters at 0', () => {
			service.init();

			expect(mockCounterInc).toHaveBeenCalledWith(0);
			expect(mockCounterInc).toHaveBeenCalledTimes(3);
		});

		it('should apply custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_cache_hits_total' }),
			);
			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_cache_misses_total' }),
			);
			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_cache_updates_total' }),
			);
		});

		it('should register a listener for metrics.cache.hit that increments the counter', () => {
			service.init();

			const hitHandler = getCacheCall('metrics.cache.hit');

			expect(hitHandler).toBeDefined();
			hitHandler!();
			expect(mockCounterInc).toHaveBeenCalledWith(1);
		});

		it('should register a listener for metrics.cache.miss that increments the counter', () => {
			service.init();

			const missHandler = getCacheCall('metrics.cache.miss');
			expect(missHandler).toBeDefined();
			missHandler!();
			expect(mockCounterInc).toHaveBeenCalledWith(1);
		});

		it('should register a listener for metrics.cache.update that increments the counter', () => {
			service.init();

			const updateHandler = getCacheCall('metrics.cache.update');
			expect(updateHandler).toBeDefined();
			updateHandler!();
			expect(mockCounterInc).toHaveBeenCalledWith(1);
		});
	});
});
