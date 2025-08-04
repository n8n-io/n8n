import { SystemMonitoringService } from '@/services/system-monitoring.service';
import { SystemResourcesService } from '@/services/system-resources.service';
import { ExecutionRepository } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { CacheService } from '@/services/cache/cache.service';
import { mock } from 'jest-mock-extended';
import { ApplicationError } from 'n8n-workflow';

describe('SystemMonitoringService - Node Performance', () => {
	let service: SystemMonitoringService;
	let systemResourcesService: jest.Mocked<SystemResourcesService>;
	let executionRepository: jest.Mocked<ExecutionRepository>;
	let workflowRepository: jest.Mocked<WorkflowRepository>;
	let cacheService: jest.Mocked<CacheService>;

	const mockWorkflowId = 'workflow-123';
	const mockNodeId = 'node-456';
	const mockExecutionId = 'execution-789';

	beforeEach(() => {
		systemResourcesService = mock<SystemResourcesService>();
		executionRepository = mock<ExecutionRepository>();
		workflowRepository = mock<WorkflowRepository>();
		cacheService = mock<CacheService>();

		service = new SystemMonitoringService(
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
			// Start tracking first
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
			// Mock some historical data
			const mockExecutions = [
				{
					nodeId: mockNodeId,
					nodeType: 'webhook',
					nodeName: 'Webhook Node',
					executionId: 'exec-1',
					workflowId: mockWorkflowId,
					startTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
					endTime: Date.now() - 2 * 60 * 60 * 1000 + 1500,
					duration: 1500,
					memoryUsage: 50000000,
					cpuUsage: 15.5,
					inputItems: 10,
					outputItems: 8,
					status: 'completed' as const,
					dataSize: 1024,
				},
				{
					nodeId: mockNodeId,
					nodeType: 'webhook',
					nodeName: 'Webhook Node',
					executionId: 'exec-2',
					workflowId: mockWorkflowId,
					startTime: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
					endTime: Date.now() - 1 * 60 * 60 * 1000 + 2000,
					duration: 2000,
					memoryUsage: 60000000,
					cpuUsage: 20.0,
					inputItems: 15,
					outputItems: 12,
					status: 'error' as const,
					error: 'Network timeout',
					dataSize: 2048,
				},
			];

			// Inject mock data into service
			(service as any).nodeExecutionHistory.set(`${mockWorkflowId}:${mockNodeId}`, mockExecutions);
		});

		it('should return node performance metrics for existing data', async () => {
			const options = {
				timeRange: '24h' as const,
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

			expect(result.averageExecutionTime).toBe(1750); // (1500 + 2000) / 2
			expect(result.averageMemoryUsage).toBe(55000000); // (50M + 60M) / 2
			expect(result.commonErrorTypes).toEqual([{ error: 'Timeout', count: 1 }]);
		});

		it('should return empty metrics for non-existent node', async () => {
			const options = {
				timeRange: '24h' as const,
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
			// Mock data for multiple nodes
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
					status: 'completed' as const,
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
					status: 'error' as const,
					error: 'Connection failed',
				},
			];

			(service as any).nodeExecutionHistory.set(`${mockWorkflowId}:node-1`, node1Executions);
			(service as any).nodeExecutionHistory.set(`${mockWorkflowId}:node-2`, node2Executions);
		});

		it('should return workflow node breakdown', async () => {
			const options = { timeRange: '24h' as const, includeRecommendations: true, minExecutions: 1 };

			const result = await service.getWorkflowNodeBreakdown(mockWorkflowId, options);

			expect(result).toEqual(
				expect.objectContaining({
					workflowId: mockWorkflowId,
					timeRange: '24h',
					nodeMetrics: expect.arrayContaining([
						expect.objectContaining({
							nodeId: 'node-1',
							nodeType: 'webhook',
							executionTimePercent: 25, // 1000 / (1000 + 3000) * 100
						}),
						expect.objectContaining({
							nodeId: 'node-2',
							nodeType: 'http',
							executionTimePercent: 75, // 3000 / (1000 + 3000) * 100
						}),
					]),
				}),
			);

			expect(result.bottleneckNodes).toContain('node-2'); // Higher bottleneck score
			expect(result.recommendations).toHaveLength(1); // Should have recommendations
		});
	});

	describe('getNodeTypePerformance', () => {
		beforeEach(() => {
			// Mock data for different node types
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
					status: 'completed' as const,
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
					status: 'completed' as const,
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
					status: 'error' as const,
					error: 'Network error',
				},
			];

			(service as any).nodeExecutionHistory.set('wf-1:node-1', [webhookExecutions[0]]);
			(service as any).nodeExecutionHistory.set('wf-2:node-2', [webhookExecutions[1]]);
			(service as any).nodeExecutionHistory.set('wf-1:node-3', httpExecutions);
		});

		it('should return node type performance comparison', async () => {
			const options = { timeRange: '24h' as const, sortBy: 'executionTime' as const, limit: 10 };

			const result = await service.getNodeTypePerformance(options);

			expect(result).toHaveLength(2);
			expect(result[0].nodeType).toBe('webhook'); // Should be first (faster)
			expect(result[1].nodeType).toBe('http'); // Should be second (slower)

			expect(result[0].performanceStats.averageExecutionTime).toBe(1500); // (1000 + 2000) / 2
			expect(result[1].performanceStats.averageExecutionTime).toBe(5000);
			expect(result[1].performanceStats.errorRate).toBe(100); // 1 error out of 1 execution
		});
	});

	describe('getLiveNodeExecution', () => {
		beforeEach(() => {
			// Mock live execution data
			const liveNodes = new Map();
			liveNodes.set(mockNodeId, {
				nodeId: mockNodeId,
				nodeType: 'webhook',
				nodeName: 'Webhook Node',
				executionId: mockExecutionId,
				workflowId: mockWorkflowId,
				startTime: Date.now() - 5000,
				status: 'running' as const,
				inputItems: 10,
				outputItems: 0,
			});

			(service as any).liveExecutions.set(mockExecutionId, liveNodes);
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
			await expect(service.getLiveNodeExecution('non-existent')).rejects.toThrow(ApplicationError);
		});
	});

	describe('getNodePerformanceHistory', () => {
		beforeEach(() => {
			// Mock historical data with timestamps
			const mockExecutions = Array.from({ length: 24 }, (_, i) => ({
				nodeId: mockNodeId,
				nodeType: 'webhook',
				nodeName: 'Webhook Node',
				executionId: `exec-${i}`,
				workflowId: mockWorkflowId,
				startTime: Date.now() - (24 - i) * 60 * 60 * 1000, // Hourly intervals
				duration: 1000 + Math.random() * 1000,
				memoryUsage: 50000000 + Math.random() * 10000000,
				inputItems: Math.floor(Math.random() * 10) + 1,
				outputItems: Math.floor(Math.random() * 8) + 1,
				status: Math.random() > 0.1 ? ('completed' as const) : ('error' as const),
			}));

			(service as any).nodeExecutionHistory.set(`${mockWorkflowId}:${mockNodeId}`, mockExecutions);
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
