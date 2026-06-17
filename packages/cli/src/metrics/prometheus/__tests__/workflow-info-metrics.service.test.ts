import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

import type { CacheService } from '@/services/cache/cache.service';

import { PrometheusWorkflowInfoMetricsService } from '../workflow-info-metrics.service';

jest.mock('prom-client');

describe('PrometheusWorkflowInfoMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeWorkflowInfoMetrics: true,
		workflowInfoMetricInterval: 60,
	});
	const workflowRepository = mock<WorkflowRepository>();
	const cacheService = mock<CacheService>();
	let service: PrometheusWorkflowInfoMetricsService;

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeWorkflowInfoMetrics: true,
			workflowInfoMetricInterval: 60,
		});
		service = new PrometheusWorkflowInfoMetricsService(config, workflowRepository, cacheService);
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('enabled', () => {
		it('should be true when includeWorkflowInfoMetrics is true', () => {
			config.includeWorkflowInfoMetrics = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeWorkflowInfoMetrics is false', () => {
			config.includeWorkflowInfoMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create workflow_info gauge with correct config', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_workflow_info',
				help: 'Map of workflow ID to name.',
				labelNames: ['workflow_id', 'workflow_name'],
				collect: expect.any(Function) as unknown,
			});
		});

		it('should apply custom prefix to metric name', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_workflow_info' }),
			);
		});
	});

	describe('collect callback', () => {
		const extractCollectFn = () => {
			service.init();
			return jest.mocked(promClient.Gauge).mock.calls[0][0].collect!;
		};

		const workflows = [
			{ id: 'wf_1', name: 'My First Workflow' },
			{ id: 'wf_2', name: 'Another Workflow' },
		];

		it('should use cached value when cache hits', async () => {
			cacheService.get.mockResolvedValue(JSON.stringify(workflows));
			const collectFn = extractCollectFn();
			const mockLabels = jest.fn().mockReturnValue({ set: jest.fn() });
			const mockGauge = { reset: jest.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.get.mock.calls[0]).toEqual(['metrics:workflow-info']);
			expect(workflowRepository.find.mock.calls).toHaveLength(0);
			expect(mockGauge.reset).toHaveBeenCalled();
			expect(mockLabels).toHaveBeenCalledWith({
				workflow_id: 'wf_1',
				workflow_name: 'My First Workflow',
			});
			expect(mockLabels).toHaveBeenCalledWith({
				workflow_id: 'wf_2',
				workflow_name: 'Another Workflow',
			});
		});

		it('should query DB, cache result, and set labels on cache miss', async () => {
			cacheService.get.mockResolvedValue(undefined);
			workflowRepository.find.mockResolvedValue(workflows as never);
			const collectFn = extractCollectFn();
			const mockLabels = jest.fn().mockReturnValue({ set: jest.fn() });
			const mockGauge = { reset: jest.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(workflowRepository.find).toHaveBeenCalledWith({ select: ['id', 'name'] });
			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:workflow-info',
				JSON.stringify(workflows),
				60 * 1000,
			);
			expect(mockLabels).toHaveBeenCalledWith({
				workflow_id: 'wf_1',
				workflow_name: 'My First Workflow',
			});
			expect(mockLabels).toHaveBeenCalledWith({
				workflow_id: 'wf_2',
				workflow_name: 'Another Workflow',
			});
		});

		it('should reset the gauge before setting new values', async () => {
			cacheService.get.mockResolvedValue(JSON.stringify(workflows));
			const collectFn = extractCollectFn();
			const mockLabels = jest.fn().mockReturnValue({ set: jest.fn() });
			const mockGauge = { reset: jest.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.reset).toHaveBeenCalledTimes(1);
		});

		it('should use the configured interval for the cache TTL', async () => {
			config.workflowInfoMetricInterval = 120;
			cacheService.get.mockResolvedValue(undefined);
			workflowRepository.find.mockResolvedValue(workflows as never);
			const collectFn = extractCollectFn();
			const mockLabels = jest.fn().mockReturnValue({ set: jest.fn() });
			const mockGauge = { reset: jest.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:workflow-info',
				expect.any(String),
				120 * 1000,
			);
		});

		it('should fall back to an empty array when cache contains invalid JSON', async () => {
			cacheService.get.mockResolvedValue('not-valid-json');
			const collectFn = extractCollectFn();
			const mockLabels = jest.fn().mockReturnValue({ set: jest.fn() });
			const mockGauge = { reset: jest.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockLabels).not.toHaveBeenCalled();
		});

		it('should set each workflow label entry to 1', async () => {
			cacheService.get.mockResolvedValue(JSON.stringify([{ id: 'wf_1', name: 'Test' }]));
			const collectFn = extractCollectFn();
			const mockSet = jest.fn();
			const mockGauge = { reset: jest.fn(), labels: jest.fn().mockReturnValue({ set: mockSet }) };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockSet).toHaveBeenCalledWith(1);
		});
	});
});
