import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { PrometheusWorkflowInfoMetricsService } from '../workflow-info-metrics.service';

vi.mock('prom-client');

describe('PrometheusWorkflowInfoMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeWorkflowInfoMetrics: true,
		workflowInfoMetricInterval: 60,
	});
	const workflowRepository = mock<WorkflowRepository>();
	const cacheService = mock<CacheService>();
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	let service: PrometheusWorkflowInfoMetricsService;

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeWorkflowInfoMetrics: true,
			workflowInfoMetricInterval: 60,
		});
		Object.assign(instanceSettings, { isLeader: true });
		service = new PrometheusWorkflowInfoMetricsService(
			config,
			workflowRepository,
			cacheService,
			instanceSettings,
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
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
				help: 'Map of workflow ID to name. Reported by the leader main only.',
				labelNames: ['workflow_id', 'workflow_name'],
				collect: expect.any(Function) as unknown,
			});
		});

		it('should create `active_workflow_info` gauge with correct config', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_active_workflow_info',
				help: 'Map of active workflow ID to name. Reported by the leader main only.',
				labelNames: ['workflow_id', 'workflow_name'],
				collect: expect.any(Function) as unknown,
			});
		});

		it('should apply custom prefix to metric names', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_workflow_info' }),
			);
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_active_workflow_info' }),
			);
		});
	});

	describe('collect callback', () => {
		const extractCollectFn = () => {
			service.init();
			return vi.mocked(promClient.Gauge).mock.calls[0][0].collect!;
		};

		const workflows = [
			{ id: 'wf_1', name: 'My First Workflow' },
			{ id: 'wf_2', name: 'Another Workflow' },
		];

		it('should use cached value when cache hits', async () => {
			cacheService.get.mockResolvedValue(workflows);
			const collectFn = extractCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.get.mock.calls[0]).toEqual(['metrics:workflow-info:v2']);
			expect(workflowRepository.getWorkflowInfo.mock.calls).toHaveLength(0);
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
			workflowRepository.getWorkflowInfo.mockResolvedValue(workflows as never);
			const collectFn = extractCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(workflowRepository.getWorkflowInfo).toHaveBeenCalledWith({ activeOnly: false });
			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:workflow-info:v2',
				workflows,
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

		it('should reset and report nothing when not the leader', async () => {
			Object.assign(instanceSettings, { isLeader: false });
			cacheService.get.mockResolvedValue(workflows);
			const collectFn = extractCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.reset).toHaveBeenCalledTimes(1);
			expect(mockLabels).not.toHaveBeenCalled();
			expect(cacheService.get).not.toHaveBeenCalled();
			expect(workflowRepository.getWorkflowInfo).not.toHaveBeenCalled();
		});

		it('should reset the gauge before setting new values', async () => {
			cacheService.get.mockResolvedValue(workflows);
			const collectFn = extractCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.reset).toHaveBeenCalledTimes(1);
		});

		it('should use the configured interval for the cache TTL', async () => {
			config.workflowInfoMetricInterval = 120;
			cacheService.get.mockResolvedValue(undefined);
			workflowRepository.getWorkflowInfo.mockResolvedValue(workflows as never);
			const collectFn = extractCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:workflow-info:v2',
				expect.any(Array),
				120 * 1000,
			);
		});

		it('should set each workflow label entry to 1', async () => {
			cacheService.get.mockResolvedValue([{ id: 'wf_1', name: 'Test' }]);
			const collectFn = extractCollectFn();
			const mockSet = vi.fn();
			const mockGauge = { reset: vi.fn(), labels: vi.fn().mockReturnValue({ set: mockSet }) };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockSet).toHaveBeenCalledWith(1);
		});
	});

	describe('active_workflow_info collect callback', () => {
		const extractActiveCollectFn = () => {
			service.init();
			return vi.mocked(promClient.Gauge).mock.calls[1][0].collect!;
		};

		const workflows = [{ id: 'wf_1', name: 'My First Workflow' }];

		it('should query only active workflows and cache under its own key', async () => {
			cacheService.get.mockResolvedValue(undefined);
			workflowRepository.getWorkflowInfo.mockResolvedValue(workflows as never);
			const collectFn = extractActiveCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(cacheService.get.mock.calls[0]).toEqual(['metrics:active-workflow-info:v1']);
			expect(workflowRepository.getWorkflowInfo).toHaveBeenCalledWith({ activeOnly: true });
			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:active-workflow-info:v1',
				workflows,
				60 * 1000,
			);
			expect(mockLabels).toHaveBeenCalledWith({
				workflow_id: 'wf_1',
				workflow_name: 'My First Workflow',
			});
		});

		it('should reset and report nothing when not the leader', async () => {
			Object.assign(instanceSettings, { isLeader: false });
			cacheService.get.mockResolvedValue(workflows);
			const collectFn = extractActiveCollectFn();
			const mockLabels = vi.fn().mockReturnValue({ set: vi.fn() });
			const mockGauge = { reset: vi.fn(), labels: mockLabels };

			await collectFn.call(mockGauge as unknown as promClient.Gauge<string>);

			expect(mockGauge.reset).toHaveBeenCalledTimes(1);
			expect(mockLabels).not.toHaveBeenCalled();
			expect(workflowRepository.getWorkflowInfo).not.toHaveBeenCalled();
		});
	});
});
