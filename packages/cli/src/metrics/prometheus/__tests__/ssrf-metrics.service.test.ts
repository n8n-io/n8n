import type { Mock } from 'vitest';
import type { SsrfProtectionService } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig, SsrfProtectionConfig } from '@n8n/config';
import promClient from 'prom-client';

import { PrometheusSsrfMetricsService } from '../ssrf-metrics.service';

vi.mock('prom-client');

describe('PrometheusSsrfMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeSsrfMetrics: true,
	});

	const ssrfConfig = mockInstance(SsrfProtectionConfig, {
		enabled: true,
	});

	const ssrfEvents = { on: vi.fn() };
	const ssrfProtectionService = {
		events: ssrfEvents,
	} as unknown as SsrfProtectionService;

	let service: PrometheusSsrfMetricsService;
	let mockCounterInc: Mock;
	let mockHistogramObserve: Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeSsrfMetrics: true });
		Object.assign(ssrfConfig, { enabled: true });
		service = new PrometheusSsrfMetricsService(ssrfProtectionService, config, ssrfConfig);
		mockCounterInc = vi.fn();
		mockHistogramObserve = vi.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function getEventsHandler(eventName: string) {
		const calls = ssrfEvents.on.mock.calls as Array<[string, (...args: unknown[]) => void]>;
		return calls.find((c) => c[0] === eventName)?.[1];
	}

	describe('enabled', () => {
		it('should be true when includeSsrfMetrics and SSRF protection are both enabled', () => {
			config.includeSsrfMetrics = true;
			ssrfConfig.enabled = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeSsrfMetrics is false', () => {
			config.includeSsrfMetrics = false;
			ssrfConfig.enabled = true;
			expect(service.enabled).toBe(false);
		});

		it('should be false when SSRF protection is disabled', () => {
			config.includeSsrfMetrics = true;
			ssrfConfig.enabled = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create ssrf_checks_total counter with result and phase labels', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_ssrf_checks_total',
				help: 'Total number of SSRF checks by result and phase.',
				labelNames: ['result', 'phase'],
			});
		});

		it('should create ssrf_blocked_checks_total counter with phase and reason labels', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_ssrf_blocked_checks_total',
				help: 'Total number of blocked SSRF checks by phase and reason.',
				labelNames: ['phase', 'reason'],
			});
		});

		it('should create ssrf_check_duration_seconds histogram with correct config', () => {
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_ssrf_check_duration_seconds',
					help: 'Duration of SSRF checks in seconds.',
					labelNames: ['result', 'phase'],
				}),
			);
		});

		it('should apply custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_checks_total' }),
			);
			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_blocked_checks_total' }),
			);
			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_ssrf_check_duration_seconds' }),
			);
		});

		it('should register listeners for ssrf.blocked and ssrf.allowed', () => {
			service.init();

			expect(ssrfEvents.on).toHaveBeenCalledWith('ssrf.blocked', expect.any(Function));
			expect(ssrfEvents.on).toHaveBeenCalledWith('ssrf.allowed', expect.any(Function));
		});

		describe('ssrf.blocked handler', () => {
			it('should increment checks counter with result and phase', () => {
				service.init();
				const handler = getEventsHandler('ssrf.blocked')!;

				handler({ phase: 'pre_flight', reason: 'blocked_ip', durationMs: 10 });

				expect(mockCounterInc).toHaveBeenCalledWith({ result: 'blocked', phase: 'pre_flight' });
			});

			it('should increment blocked_by_reason counter with phase and reason', () => {
				service.init();
				const handler = getEventsHandler('ssrf.blocked')!;

				handler({ phase: 'pre_flight', reason: 'blocked_ip', durationMs: 10 });

				expect(mockCounterInc).toHaveBeenCalledWith({ phase: 'pre_flight', reason: 'blocked_ip' });
			});

			it('should observe histogram with duration converted to seconds', () => {
				service.init();
				const handler = getEventsHandler('ssrf.blocked')!;

				handler({ phase: 'connect_time', reason: 'dns_error', durationMs: 250 });

				expect(mockHistogramObserve).toHaveBeenCalledWith(
					{ result: 'blocked', phase: 'connect_time' },
					0.25,
				);
			});
		});

		describe('ssrf.allowed handler', () => {
			it('should increment checks counter with result and phase only', () => {
				service.init();
				const handler = getEventsHandler('ssrf.allowed')!;

				handler({ phase: 'redirect', durationMs: 5 });

				expect(mockCounterInc).toHaveBeenCalledWith({ result: 'allowed', phase: 'redirect' });
				expect(mockCounterInc).toHaveBeenCalledTimes(1);
			});

			it('should observe histogram with duration converted to seconds', () => {
				service.init();
				const handler = getEventsHandler('ssrf.allowed')!;

				handler({ phase: 'pre_flight', durationMs: 100 });

				expect(mockHistogramObserve).toHaveBeenCalledWith(
					{ result: 'allowed', phase: 'pre_flight' },
					0.1,
				);
			});
		});
	});
});
