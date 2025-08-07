'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const system_monitoring_service_1 = require('../system-monitoring.service');
describe('SystemMonitoringService - Workflow Resource Monitoring', () => {
	let service;
	let mockSystemResourcesService;
	let mockExecutionRepository;
	let mockWorkflowRepository;
	let mockCacheService;
	let mockLogger;
	beforeEach(() => {
		mockSystemResourcesService = {
			getCurrentResources: jest.fn(),
		};
		mockExecutionRepository = {};
		mockWorkflowRepository = {};
		mockCacheService = {
			set: jest.fn(),
			get: jest.fn(),
		};
		mockLogger = {
			info: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		service = new system_monitoring_service_1.SystemMonitoringService(
			mockSystemResourcesService,
			mockExecutionRepository,
			mockWorkflowRepository,
			mockCacheService,
		);
	});
	afterEach(async () => {
		service.stopMonitoring();
		jest.clearAllMocks();
	});
	describe('Workflow Execution Tracking', () => {
		it('should track workflow execution start', () => {
			const workflowData = {
				executionId: 'exec-123',
				workflowData: {
					id: 'workflow-456',
					name: 'Test Workflow',
				},
			};
			service.trackWorkflowExecutionStart(workflowData);
			expect(service['workflowExecutions'].has('exec-123')).toBe(true);
			expect(service['workflowResourceMetrics'].has('workflow-456')).toBe(true);
		});
		it('should track workflow execution end and update metrics', async () => {
			const workflowData = {
				executionId: 'exec-123',
				workflowData: {
					id: 'workflow-456',
					name: 'Test Workflow',
				},
			};
			service.trackWorkflowExecutionStart(workflowData);
			await new Promise((resolve) => setTimeout(resolve, 10));
			const result = { finished: true, data: {} };
			await service.trackWorkflowExecutionEnd('exec-123', result);
			const metrics = await service.getWorkflowResourceMetrics('workflow-456');
			expect(metrics).toBeDefined();
			expect(metrics.totalExecutions).toBe(1);
			expect(metrics.averageExecutionTime).toBeGreaterThan(0);
		});
		it('should handle missing execution data gracefully', async () => {
			const result = { finished: true, data: {} };
			await expect(
				service.trackWorkflowExecutionEnd('non-existent-exec', result),
			).resolves.not.toThrow();
		});
	});
	describe('Workflow Resource Metrics', () => {
		beforeEach(async () => {
			const workflowData = {
				executionId: 'exec-123',
				workflowData: {
					id: 'workflow-456',
					name: 'Test Workflow',
				},
			};
			service.trackWorkflowExecutionStart(workflowData);
			await new Promise((resolve) => setTimeout(resolve, 50));
			await service.trackWorkflowExecutionEnd('exec-123', { finished: true, data: {} });
		});
		it('should get workflow resource metrics', async () => {
			const metrics = await service.getWorkflowResourceMetrics('workflow-456');
			expect(metrics).toBeDefined();
			expect(metrics.workflowId).toBe('workflow-456');
			expect(metrics.workflowName).toBe('Test Workflow');
			expect(metrics.totalExecutions).toBe(1);
			expect(metrics.averageExecutionTime).toBeGreaterThan(0);
		});
		it('should return null for non-existent workflow', async () => {
			const metrics = await service.getWorkflowResourceMetrics('non-existent');
			expect(metrics).toBeNull();
		});
		it('should get all workflow resource metrics', async () => {
			const allMetrics = await service.getAllWorkflowResourceMetrics();
			expect(allMetrics.size).toBe(1);
			expect(allMetrics.has('workflow-456')).toBe(true);
		});
		it('should filter metrics by time range', async () => {
			const metricsAll = await service.getWorkflowResourceMetrics('workflow-456');
			const metricsFiltered = await service.getWorkflowResourceMetrics('workflow-456', '1h');
			expect(metricsAll).toBeDefined();
			expect(metricsFiltered).toBeDefined();
			expect(metricsFiltered.samples.length).toBeLessThanOrEqual(metricsAll.samples.length);
		});
	});
	describe('Workflow Resource Comparison', () => {
		beforeEach(async () => {
			const workflows = [
				{ executionId: 'exec-1', workflowData: { id: 'workflow-1', name: 'Workflow 1' } },
				{ executionId: 'exec-2', workflowData: { id: 'workflow-2', name: 'Workflow 2' } },
			];
			for (const workflow of workflows) {
				service.trackWorkflowExecutionStart(workflow);
				await new Promise((resolve) => setTimeout(resolve, 25));
				await service.trackWorkflowExecutionEnd(workflow.executionId, {
					finished: true,
					data: {},
				});
			}
		});
		it('should compare multiple workflows', async () => {
			const comparison = await service.getWorkflowResourceComparison(['workflow-1', 'workflow-2']);
			expect(comparison).toHaveLength(2);
			expect(comparison[0].workflowId).toBeDefined();
			expect(comparison[1].workflowId).toBeDefined();
		});
		it('should handle empty workflow list', async () => {
			const comparison = await service.getWorkflowResourceComparison([]);
			expect(comparison).toHaveLength(0);
		});
		it('should handle non-existent workflows', async () => {
			const comparison = await service.getWorkflowResourceComparison(['non-existent']);
			expect(comparison).toHaveLength(0);
		});
	});
	describe('Workflow Resource Alerts', () => {
		it('should get workflow-specific alerts', () => {
			const alerts = service.getWorkflowResourceAlerts('workflow-456');
			expect(Array.isArray(alerts)).toBe(true);
		});
		it('should get all workflow alerts', () => {
			const alerts = service.getWorkflowResourceAlerts();
			expect(Array.isArray(alerts)).toBe(true);
		});
	});
	describe('Resource Sampling', () => {
		it('should initialize workflow resource monitoring', async () => {
			await service.initialize();
			expect(service['monitoringInterval']).toBeDefined();
			expect(service['workflowSamplingInterval']).toBeDefined();
		});
	});
	describe('Resource Cleanup', () => {
		it('should clean up old workflow resource data', async () => {
			await expect(service['cleanupOldData']()).resolves.not.toThrow();
		});
	});
});
//# sourceMappingURL=workflow-monitoring.service.test.js.map
