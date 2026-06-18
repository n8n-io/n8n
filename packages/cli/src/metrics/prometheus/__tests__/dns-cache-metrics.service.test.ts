import type { InMemoryDnsCache } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig, SsrfProtectionConfig } from '@n8n/config';
import promClient from 'prom-client';

import { PrometheusDnsCacheMetricsService } from '../dns-cache-metrics.service';

jest.mock('prom-client');

describe('PrometheusDnsCacheMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeDnsCacheMetrics: true,
	});

	const ssrfConfig = mockInstance(SsrfProtectionConfig, {
		enabled: true,
	});

	const dnsEvents = { on: jest.fn() };
	let cacheSizeValue = 0;
	const dnsCache = {
		events: dnsEvents,
		get size() {
			return cacheSizeValue;
		},
	} as unknown as InMemoryDnsCache;

	let service: PrometheusDnsCacheMetricsService;
	let mockCounterInc: jest.Mock;
	let mockGaugeSet: jest.Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeDnsCacheMetrics: true });
		Object.assign(ssrfConfig, { enabled: true });
		cacheSizeValue = 0;
		service = new PrometheusDnsCacheMetricsService(dnsCache, config, ssrfConfig);
		mockCounterInc = jest.fn();
		mockGaugeSet = jest.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
		promClient.Gauge.prototype.set = mockGaugeSet;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	function getEventsHandler(eventName: string) {
		const calls = dnsEvents.on.mock.calls as Array<[string, (...args: unknown[]) => void]>;
		return calls.find((c) => c[0] === eventName)?.[1];
	}

	describe('enabled', () => {
		it('should be true when includeDnsCacheMetrics and SSRF protection are both enabled', () => {
			config.includeDnsCacheMetrics = true;
			ssrfConfig.enabled = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeDnsCacheMetrics is false', () => {
			config.includeDnsCacheMetrics = false;
			ssrfConfig.enabled = true;
			expect(service.enabled).toBe(false);
		});

		it('should be false when SSRF protection is disabled', () => {
			config.includeDnsCacheMetrics = true;
			ssrfConfig.enabled = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create ssrf_dns_cache_hits_total counter', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_ssrf_dns_cache_hits_total',
				help: 'Total number of DNS cache hits.',
			});
		});

		it('should create ssrf_dns_cache_misses_total counter', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_ssrf_dns_cache_misses_total',
				help: 'Total number of DNS cache misses.',
			});
		});

		it('should create ssrf_dns_cache_evictions_total counter', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_ssrf_dns_cache_evictions_total',
				help: 'Total number of DNS cache evictions.',
			});
		});

		it('should seed all 3 counters at 0', () => {
			service.init();

			expect(mockCounterInc).toHaveBeenCalledWith(0);
			expect(mockCounterInc).toHaveBeenCalledTimes(3);
		});

		it('should create ssrf_dns_cache_size gauge', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_ssrf_dns_cache_size',
					help: 'Current number of entries in the DNS cache.',
				}),
			);
		});

		it('should apply custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_dns_cache_hits_total' }),
			);
			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_dns_cache_misses_total' }),
			);
			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_dns_cache_evictions_total' }),
			);
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_dns_cache_size' }),
			);
		});

		it('should register a listener for hit that increments the hits counter', () => {
			service.init();

			const handler = getEventsHandler('hit');
			expect(handler).toBeDefined();
			handler!();
			expect(mockCounterInc).toHaveBeenCalledWith(1);
		});

		it('should register a listener for miss that increments the misses counter', () => {
			service.init();

			const handler = getEventsHandler('miss');
			expect(handler).toBeDefined();
			handler!();
			expect(mockCounterInc).toHaveBeenCalledWith(1);
		});

		it('should register a listener for eviction that increments the evictions counter', () => {
			service.init();

			const handler = getEventsHandler('eviction');
			expect(handler).toBeDefined();
			handler!();
			expect(mockCounterInc).toHaveBeenCalledWith(1);
		});

		it('should pass collect function that reads current cache size to the gauge', () => {
			service.init();

			const gaugeOptions = (promClient.Gauge as jest.Mock).mock.calls[0][0] as {
				collect: () => void;
			};
			expect(typeof gaugeOptions.collect).toBe('function');

			cacheSizeValue = 42;
			gaugeOptions.collect.call({ set: mockGaugeSet });
			expect(mockGaugeSet).toHaveBeenCalledWith(42);
		});
	});
});
