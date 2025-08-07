'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const system_monitoring_service_1 = require('@/services/system-monitoring.service');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
describe('SystemMonitoringService - Node Performance', () => {
	let service;
	let systemResourcesService;
	let executionRepository;
	let workflowRepository;
	let cacheService;
	const mockWorkflowId = 'workflow-123';
	const mockNodeId = 'node-456';
	const mockExecutionId = 'execution-789';
	beforeEach(() => {
		systemResourcesService = (0, jest_mock_extended_1.mock)();
		executionRepository = (0, jest_mock_extended_1.mock)();
		workflowRepository = (0, jest_mock_extended_1.mock)();
		cacheService = (0, jest_mock_extended_1.mock)();
		service = new system_monitoring_service_1.SystemMonitoringService(
			systemResourcesService,
			executionRepository,
			workflowRepository,
			cacheService,
		);
	});
	describe('trackNodeExecutionStart', () => {
		it('should start tracking node execution', () => {
			const nodeType = 'webhook';
			const nodeName = 'Webhook Node';
			const emitSpy = jest.spyOn(service, 'emit');
			service.trackNodeExecutionStart(
				mockExecutionId,
				mockNodeId,
				nodeType,
				nodeName,
				mockWorkflowId,
			);
			expect(emitSpy).toHaveBeenCalledWith('nodeExecutionStart', {
				workflowId: mockWorkflowId,
				nodeId: mockNodeId,
				nodeType,
				executionId: mockExecutionId,
			});
		});
	});
	describe('trackNodeExecutionEnd', () => {
		beforeEach(() => {
			service.trackNodeExecutionStart(
				mockExecutionId,
				mockNodeId,
				'webhook',
				'Webhook Node',
				mockWorkflowId,
			);
		});
		it('should track successful node execution end', () => {
			const result = {
				success: true,
				inputItems: 10,
				outputItems: 8,
			};
			const emitSpy = jest.spyOn(service, 'emit');
			service.trackNodeExecutionEnd(mockExecutionId, mockNodeId, result);
			expect(emitSpy).toHaveBeenCalledWith(
				'nodeExecutionCompleted',
				expect.objectContaining({
					workflowId: mockWorkflowId,
					nodeId: mockNodeId,
					nodeType: 'webhook',
					inputItems: 10,
					outputItems: 8,
					status: 'success',
					errorType: undefined,
				}),
			);
		});
		it('should track failed node execution end', () => {
			const result = {
				success: false,
				error: 'Network timeout occurred',
				inputItems: 5,
				outputItems: 0,
			};
			const emitSpy = jest.spyOn(service, 'emit');
			service.trackNodeExecutionEnd(mockExecutionId, mockNodeId, result);
			expect(emitSpy).toHaveBeenCalledWith(
				'nodeExecutionCompleted',
				expect.objectContaining({
					workflowId: mockWorkflowId,
					nodeId: mockNodeId,
					nodeType: 'webhook',
					inputItems: 5,
					outputItems: 0,
					status: 'error',
					errorType: 'Timeout',
				}),
			);
		});
		it('should handle missing node execution gracefully', () => {
			const result = { success: true };
			expect(() => {
				service.trackNodeExecutionEnd('non-existent', 'non-existent-node', result);
			}).not.toThrow();
		});
	});
	describe('getNodePerformanceMetrics', () => {
		beforeEach(() => {
			const mockExecutions = [
				{
					nodeId: mockNodeId,
					nodeType: 'webhook',
					nodeName: 'Webhook Node',
					executionId: 'exec-1',
					workflowId: mockWorkflowId,
					startTime: Date.now() - 2 * 60 * 60 * 1000,
					endTime: Date.now() - 2 * 60 * 60 * 1000 + 1500,
					duration: 1500,
					memoryUsage: 50000000,
					cpuUsage: 15.5,
					inputItems: 10,
					outputItems: 8,
					status: 'completed',
					dataSize: 1024,
				},
				{
					nodeId: mockNodeId,
					nodeType: 'webhook',
					nodeName: 'Webhook Node',
					executionId: 'exec-2',
					workflowId: mockWorkflowId,
					startTime: Date.now() - 1 * 60 * 60 * 1000,
					endTime: Date.now() - 1 * 60 * 60 * 1000 + 2000,
					duration: 2000,
					memoryUsage: 60000000,
					cpuUsage: 20.0,
					inputItems: 15,
					outputItems: 12,
					status: 'error',
					error: 'Network timeout',
					dataSize: 2048,
				},
			];
			service.nodeExecutionHistory.set(`${mockWorkflowId}:${mockNodeId}`, mockExecutions);
		});
		it('should return node performance metrics for existing data', async () => {
			const options = {
				timeRange: '24h',
				includeHistory: false,
				includeErrorAnalysis: true,
			};
			const result = await service.getNodePerformanceMetrics(mockWorkflowId, mockNodeId, options);
			expect(result).toEqual(
				expect.objectContaining({
					nodeId: mockNodeId,
					nodeType: 'webhook',
					nodeName: 'Webhook Node',
					totalExecutions: 2,
					successfulExecutions: 1,
					failedExecutions: 1,
					errorRate: 50,
					timeRange: '24h',
				}),
			);
			expect(result.averageExecutionTime).toBe(1750);
			expect(result.averageMemoryUsage).toBe(55000000);
			expect(result.commonErrorTypes).toEqual([{ error: 'Timeout', count: 1 }]);
		});
		it('should return empty metrics for non-existent node', async () => {
			const options = {
				timeRange: '24h',
				includeHistory: false,
				includeErrorAnalysis: false,
			};
			const result = await service.getNodePerformanceMetrics(
				mockWorkflowId,
				'non-existent',
				options,
			);
			expect(result).toEqual(
				expect.objectContaining({
					nodeId: 'non-existent',
					nodeType: 'unknown',
					totalExecutions: 0,
					successfulExecutions: 0,
					failedExecutions: 0,
					errorRate: 0,
				}),
			);
		});
	});
	describe('getWorkflowNodeBreakdown', () => {
		beforeEach(() => {
			const node1Executions = [
				{
					nodeId: 'node-1',
					nodeType: 'webhook',
					nodeName: 'Webhook',
					executionId: 'exec-1',
					workflowId: mockWorkflowId,
					startTime: Date.now() - 60 * 60 * 1000,
					duration: 1000,
					memoryUsage: 30000000,
					inputItems: 5,
					outputItems: 5,
					status: 'completed',
				},
			];
			const node2Executions = [
				{
					nodeId: 'node-2',
					nodeType: 'http',
					nodeName: 'HTTP Request',
					executionId: 'exec-1',
					workflowId: mockWorkflowId,
					startTime: Date.now() - 60 * 60 * 1000,
					duration: 3000,
					memoryUsage: 70000000,
					inputItems: 5,
					outputItems: 3,
					status: 'error',
					error: 'Connection failed',
				},
			];
			service.nodeExecutionHistory.set(`${mockWorkflowId}:node-1`, node1Executions);
			service.nodeExecutionHistory.set(`${mockWorkflowId}:node-2`, node2Executions);
		});
		it('should return workflow node breakdown', async () => {
			const options = { timeRange: '24h', includeRecommendations: true, minExecutions: 1 };
			const result = await service.getWorkflowNodeBreakdown(mockWorkflowId, options);
			expect(result).toEqual(
				expect.objectContaining({
					workflowId: mockWorkflowId,
					timeRange: '24h',
					nodeMetrics: expect.arrayContaining([
						expect.objectContaining({
							nodeId: 'node-1',
							nodeType: 'webhook',
							executionTimePercent: 25,
						}),
						expect.objectContaining({
							nodeId: 'node-2',
							nodeType: 'http',
							executionTimePercent: 75,
						}),
					]),
				}),
			);
			expect(result.bottleneckNodes).toContain('node-2');
			expect(result.recommendations).toHaveLength(1);
		});
	});
	describe('getNodeTypePerformance', () => {
		beforeEach(() => {
			const webhookExecutions = [
				{
					nodeId: 'node-1',
					nodeType: 'webhook',
					executionId: 'exec-1',
					workflowId: 'wf-1',
					startTime: Date.now() - 60 * 60 * 1000,
					duration: 1000,
					memoryUsage: 30000000,
					inputItems: 5,
					outputItems: 5,
					status: 'completed',
				},
				{
					nodeId: 'node-2',
					nodeType: 'webhook',
					executionId: 'exec-2',
					workflowId: 'wf-2',
					startTime: Date.now() - 60 * 60 * 1000,
					duration: 2000,
					memoryUsage: 40000000,
					inputItems: 10,
					outputItems: 8,
					status: 'completed',
				},
			];
			const httpExecutions = [
				{
					nodeId: 'node-3',
					nodeType: 'http',
					executionId: 'exec-3',
					workflowId: 'wf-1',
					startTime: Date.now() - 60 * 60 * 1000,
					duration: 5000,
					memoryUsage: 60000000,
					inputItems: 3,
					outputItems: 2,
					status: 'error',
					error: 'Network error',
				},
			];
			service.nodeExecutionHistory.set('wf-1:node-1', [webhookExecutions[0]]);
			service.nodeExecutionHistory.set('wf-2:node-2', [webhookExecutions[1]]);
			service.nodeExecutionHistory.set('wf-1:node-3', httpExecutions);
		});
		it('should return node type performance comparison', async () => {
			const options = { timeRange: '24h', sortBy: 'executionTime', limit: 10 };
			const result = await service.getNodeTypePerformance(options);
			expect(result).toHaveLength(2);
			expect(result[0].nodeType).toBe('webhook');
			expect(result[1].nodeType).toBe('http');
			expect(result[0].performanceStats.averageExecutionTime).toBe(1500);
			expect(result[1].performanceStats.averageExecutionTime).toBe(5000);
			expect(result[1].performanceStats.errorRate).toBe(100);
		});
	});
	describe('getLiveNodeExecution', () => {
		beforeEach(() => {
			const liveNodes = new Map();
			liveNodes.set(mockNodeId, {
				nodeId: mockNodeId,
				nodeType: 'webhook',
				nodeName: 'Webhook Node',
				executionId: mockExecutionId,
				workflowId: mockWorkflowId,
				startTime: Date.now() - 5000,
				status: 'running',
				inputItems: 10,
				outputItems: 0,
			});
			service.liveExecutions.set(mockExecutionId, liveNodes);
		});
		it('should return live node execution data', async () => {
			const result = await service.getLiveNodeExecution(mockExecutionId);
			expect(result).toEqual(
				expect.objectContaining({
					executionId: mockExecutionId,
					currentNode: mockNodeId,
					nodeStatuses: expect.arrayContaining([
						expect.objectContaining({
							nodeId: mockNodeId,
							status: 'running',
							itemsProcessed: 10,
						}),
					]),
				}),
			);
		});
		it('should throw error for non-existent execution', async () => {
			await expect(service.getLiveNodeExecution('non-existent')).rejects.toThrow(
				n8n_workflow_1.ApplicationError,
			);
		});
	});
	describe('getNodePerformanceHistory', () => {
		beforeEach(() => {
			const mockExecutions = Array.from({ length: 24 }, (_, i) => ({
				nodeId: mockNodeId,
				nodeType: 'webhook',
				nodeName: 'Webhook Node',
				executionId: `exec-${i}`,
				workflowId: mockWorkflowId,
				startTime: Date.now() - (24 - i) * 60 * 60 * 1000,
				duration: 1000 + Math.random() * 1000,
				memoryUsage: 50000000 + Math.random() * 10000000,
				inputItems: Math.floor(Math.random() * 10) + 1,
				outputItems: Math.floor(Math.random() * 8) + 1,
				status: Math.random() > 0.1 ? 'completed' : 'error',
			}));
			service.nodeExecutionHistory.set(`${mockWorkflowId}:${mockNodeId}`, mockExecutions);
		});
		it('should return node performance history with patterns', async () => {
			const result = await service.getNodePerformanceHistory(mockWorkflowId, mockNodeId, '24h');
			expect(result).toEqual(
				expect.objectContaining({
					nodeId: mockNodeId,
					timeRange: '24h',
					metrics: expect.objectContaining({
						timestamps: expect.any(Array),
						executionTimes: expect.any(Array),
						memoryUsages: expect.any(Array),
						inputCounts: expect.any(Array),
						outputCounts: expect.any(Array),
						errorCounts: expect.any(Array),
					}),
					patterns: expect.objectContaining({
						timeOfDayPerformance: expect.any(Array),
						dayOfWeekPerformance: expect.any(Array),
						correlations: expect.objectContaining({
							inputSizeImpact: expect.any(Number),
							timeOfDayImpact: expect.any(Number),
						}),
					}),
				}),
			);
			expect(result.metrics.timestamps.length).toBeGreaterThan(0);
			expect(result.patterns.timeOfDayPerformance).toHaveLength(24);
			expect(result.patterns.dayOfWeekPerformance).toHaveLength(7);
		});
	});
});
//# sourceMappingURL=system-monitoring-node-performance.service.test.js.map
