import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

import type { CacheService } from '@/services/cache/cache.service';

import { PrometheusActiveWorkflowMetricsService } from '../active-workflow-metrics.service';

jest.mock('prom-client');

describe('PrometheusActiveWorkflowMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		activeWorkflowCountInterval: 30,
	});
	const workflowRepository = mock<WorkflowRepository>();
	const cacheService = mock<CacheService>();
	let service: PrometheusActiveWorkflowMetricsService;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', activeWorkflowCountInterval: 30 });
		service = new PrometheusActiveWorkflowMetricsService(config, workflowRepository, cacheService);
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('enabled', () => {
		it('should always be true', () => {
			expect(service.enabled).toBe(true);
		});
	});

	describe('init', () => {
		it('should create active_workflow_count gauge with correct config', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_active_workflow_count',
				help: 'Total number of active workflows.',
				collect: expect.any(Function) as unknown,
			});
		});

		it('should apply custom prefix to metric name', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_active_workflow_count' }),
			);
		});
	});

	describe('collect callback', () => {
		const extractCollectFn = () => {
			service.init();
			return jest.mocked(promClient.Gauge).mock.calls[0][0].collect!;
		};

		it('should use cached value when cache returns a valid number string', async () => {
			cacheService.get.mockResolvedValue('42');
			const collectFn = extractCollectFn();
			const mockGauge = { set: jest.fn() };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.get.mock.calls[0]).toEqual(['metrics:active-workflow-count']);
			expect(workflowRepository.getActiveCount.mock.calls).toHaveLength(0);
			expect(mockGauge.set).toHaveBeenCalledWith(42);
		});

		it('should call DB and cache result when cache misses (returns undefined)', async () => {
			cacheService.get.mockResolvedValue(undefined);
			workflowRepository.getActiveCount.mockResolvedValue(15);
			const collectFn = extractCollectFn();
			const mockGauge = { set: jest.fn() };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(workflowRepository.getActiveCount.mock.calls).toHaveLength(1);
			expect(cacheService.set.mock.calls[0]).toEqual([
				'metrics:active-workflow-count',
				'15',
				30 * 1000,
			]);
			expect(mockGauge.set).toHaveBeenCalledWith(15);
		});

		it('should call DB when cached value is not a finite number', async () => {
			cacheService.get.mockResolvedValue('not-a-number');
			workflowRepository.getActiveCount.mockResolvedValue(7);
			const collectFn = extractCollectFn();
			const mockGauge = { set: jest.fn() };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(workflowRepository.getActiveCount.mock.calls).toHaveLength(1);
			expect(mockGauge.set).toHaveBeenCalledWith(7);
		});

		it('should use the configured interval for the cache TTL', async () => {
			config.activeWorkflowCountInterval = 120;
			cacheService.get.mockResolvedValue(undefined);
			workflowRepository.getActiveCount.mockResolvedValue(5);
			const collectFn = extractCollectFn();
			const mockGauge = { set: jest.fn() };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.set.mock.calls[0]).toEqual([
				'metrics:active-workflow-count',
				'5',
				120 * 1000,
			]);
		});
	});
});
