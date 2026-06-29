import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { LicenseMetricsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import promClient from 'prom-client';

import type { CacheService } from '@/services/cache/cache.service';

import { PrometheusWorkflowStatisticsMetricsService } from '../workflow-statistics-metrics.service';

vi.mock('prom-client');

const MOCK_METRICS = {
	productionExecutions: 100,
	productionRootExecutions: 90,
	manualExecutions: 50,
	enabledUsers: 10,
	totalUsers: 12,
	totalWorkflows: 25,
	totalCredentials: 8,
	activeWorkflows: 5,
	evaluations: 3,
} as const;

describe('PrometheusWorkflowStatisticsMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeWorkflowStatistics: true,
		workflowStatisticsInterval: 30,
	});
	const cacheService = mock<CacheService>();
	const licenseMetricsRepository = mock<LicenseMetricsRepository>();
	let service: PrometheusWorkflowStatisticsMetricsService;

	const extractGaugeCollect = (nameFragment: string) => {
		const calls = vi.mocked(promClient.Gauge).mock.calls;
		const idx = calls.findIndex((c) => c[0]?.name?.includes(nameFragment));
		if (idx === -1) {
			throw new Error(`Gauge with name containing '${nameFragment}' not found`);
		}
		return calls[idx][0].collect!;
	};

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeWorkflowStatistics: true,
			workflowStatisticsInterval: 30,
		});
		cacheService.get.mockResolvedValue(undefined);
		licenseMetricsRepository.getLicenseRenewalMetrics.mockResolvedValue(MOCK_METRICS);
		service = new PrometheusWorkflowStatisticsMetricsService(
			config,
			cacheService,
			licenseMetricsRepository,
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('enabled', () => {
		it('should be true when includeWorkflowStatistics is true', () => {
			config.includeWorkflowStatistics = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeWorkflowStatistics is false', () => {
			config.includeWorkflowStatistics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create 7 gauges', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledTimes(7);
		});

		it('should create production_executions gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_production_executions' }),
			);
		});

		it('should create production_root_executions gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_production_root_executions' }),
			);
		});

		it('should create manual_executions gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_manual_executions' }),
			);
		});

		it('should create enabled_users gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_enabled_users' }),
			);
		});

		it('should create users gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(expect.objectContaining({ name: 'n8n_users' }));
		});

		it('should create workflows gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_workflows' }),
			);
		});

		it('should create credentials gauge', () => {
			service.init();
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_credentials' }),
			);
		});

		it('should attach a collect function to each gauge', () => {
			service.init();
			const calls = vi.mocked(promClient.Gauge).mock.calls;
			for (const call of calls) {
				expect(call[0].collect).toBeDefined();
				expect(typeof call[0].collect).toBe('function');
			}
		});
	});

	describe('collect callbacks — external cache miss (DB fallback)', () => {
		it('production_executions — calls DB and sets correct value', async () => {
			service.init();
			const collectFn = extractGaugeCollect('production_executions');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(licenseMetricsRepository.getLicenseRenewalMetrics.mock.calls).toHaveLength(1);
			expect(mockGauge.set).toHaveBeenCalledWith(100);
		});

		it('production_root_executions — sets correct value', async () => {
			service.init();
			const collectFn = extractGaugeCollect('production_root_executions');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.set).toHaveBeenCalledWith(90);
		});

		it('manual_executions — sets correct value', async () => {
			service.init();
			const collectFn = extractGaugeCollect('manual_executions');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.set).toHaveBeenCalledWith(50);
		});

		it('enabled_users — sets correct value', async () => {
			service.init();
			const collectFn = extractGaugeCollect('enabled_users');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.set).toHaveBeenCalledWith(10);
		});

		it('users — sets correct value from totalUsers', async () => {
			service.init();
			const collectFn = extractGaugeCollect('n8n_users');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.set).toHaveBeenCalledWith(12);
		});

		it('workflows — sets correct value from totalWorkflows', async () => {
			service.init();
			const collectFn = extractGaugeCollect('n8n_workflows');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.set).toHaveBeenCalledWith(25);
		});

		it('credentials — sets correct value from totalCredentials', async () => {
			service.init();
			const collectFn = extractGaugeCollect('credentials');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.set).toHaveBeenCalledWith(8);
		});

		it('should store result in external cache with configured TTL', async () => {
			service.init();
			const collectFn = extractGaugeCollect('production_executions');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.set.mock.calls[0]).toEqual([
				'metrics:workflow-statistics:shared',
				expect.any(String),
				30 * 1000,
			]);
		});
	});

	describe('collect callbacks — external cache hit', () => {
		it('should use cached value and not call DB', async () => {
			const cachedMetrics = {
				...MOCK_METRICS,
				productionExecutions: 999,
				productionRootExecutions: 888,
				manualExecutions: 777,
				enabledUsers: 666,
				totalUsers: 555,
				totalWorkflows: 444,
				totalCredentials: 333,
			};
			cacheService.get.mockResolvedValue(JSON.stringify(cachedMetrics));

			service.init();
			const collectFn = extractGaugeCollect('production_executions');
			const mockGauge = { set: vi.fn() };
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(licenseMetricsRepository.getLicenseRenewalMetrics.mock.calls).toHaveLength(0);
			expect(mockGauge.set).toHaveBeenCalledWith(999);
		});
	});

	describe('collect callbacks — in-memory cache deduplication', () => {
		it('should call DB only once within 1 second for multiple collect calls', async () => {
			vi.useFakeTimers();
			service.init();
			const collectFn = extractGaugeCollect('production_executions');
			const mockGauge = { set: vi.fn() };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);
			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			// DB should only be called once; second call uses in-memory cache
			expect(licenseMetricsRepository.getLicenseRenewalMetrics.mock.calls).toHaveLength(1);
		});

		it('should call DB again after in-memory cache TTL (1 second) expires', async () => {
			vi.useFakeTimers();
			service.init();
			const collectFn = extractGaugeCollect('production_executions');
			const mockGauge = { set: vi.fn() };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			// Advance past the 1 second in-memory TTL
			vi.advanceTimersByTime(1100);

			// Also need to reset external cache mock to undefined to trigger DB again
			cacheService.get.mockResolvedValue(undefined);

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(licenseMetricsRepository.getLicenseRenewalMetrics.mock.calls).toHaveLength(2);
		});
	});
});
