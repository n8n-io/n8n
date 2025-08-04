import type { Response } from 'express';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SystemMonitoringController } from '@/controllers/system-monitoring.controller';
import { SystemMonitoringService } from '@/services/system-monitoring.service';
import { mock } from 'jest-mock-extended';
import type { AuthenticatedRequest } from '@n8n/db';
import type { IUser } from 'n8n-workflow';
import type {
	NodePerformanceMetricsDto,
	WorkflowNodeBreakdownDto,
	NodeTypePerformanceResponseDto,
	LiveNodeExecutionDto,
	NodePerformanceHistoryDto,
} from '@n8n/api-types';

// Mock the Licensed decorator
jest.mock('@n8n/decorators', () => ({
	Licensed: jest.fn(() => jest.fn()),
	Get: jest.fn(() => jest.fn()),
	Post: jest.fn(() => jest.fn()),
	Put: jest.fn(() => jest.fn()),
	Delete: jest.fn(() => jest.fn()),
	RestController: jest.fn(() => jest.fn()),
	Param: jest.fn(() => jest.fn()),
	Query: jest.fn(() => jest.fn()),
	Body: jest.fn(() => jest.fn()),
}));

describe('SystemMonitoringController - Node Performance', () => {
	let controller: SystemMonitoringController;
	let systemMonitoringService: jest.Mocked<SystemMonitoringService>;
	let req: AuthenticatedRequest<any, any, any>;
	let res: Response;
	let user: IUser;

	const mockWorkflowId = 'workflow-123';
	const mockNodeId = 'node-456';
	const mockExecutionId = 'execution-789';

	const mockNodePerformanceMetrics: NodePerformanceMetricsDto = {
		nodeId: mockNodeId,
		nodeType: 'webhook',
		nodeName: 'Webhook Node',
		totalExecutions: 100,
		successfulExecutions: 95,
		failedExecutions: 5,
		averageExecutionTime: 1500,
		medianExecutionTime: 1200,
		p95ExecutionTime: 3000,
		maxExecutionTime: 5000,
		minExecutionTime: 100,
		averageMemoryUsage: 50000000,
		peakMemoryUsage: 75000000,
		averageCpuUsage: 15.5,
		peakCpuUsage: 45.2,
		averageInputItems: 10,
		averageOutputItems: 8,
		totalDataProcessed: 1024000,
		averageDataTransformation: 0.8,
		errorRate: 5.0,
		commonErrorTypes: [
			{ error: 'Network Error', count: 3 },
			{ error: 'Timeout', count: 2 },
		],
		timeRange: '24h',
		trendData: [
			{
				timestamp: '2024-01-01T00:00:00.000Z',
				executionTime: 1500,
				memoryUsage: 50000000,
				itemsProcessed: 18,
				errorCount: 0,
			},
		],
	};

	const mockWorkflowNodeBreakdown: WorkflowNodeBreakdownDto = {
		workflowId: mockWorkflowId,
		workflowName: 'Test Workflow',
		timeRange: '24h',
		nodeMetrics: [
			{
				nodeId: mockNodeId,
				nodeName: 'Webhook Node',
				nodeType: 'webhook',
				executionTimePercent: 45.2,
				memoryUsagePercent: 32.1,
				errorContribution: 60.0,
				bottleneckScore: 75,
			},
		],
		criticalPath: [mockNodeId],
		bottleneckNodes: [mockNodeId],
		recommendations: [
			{
				nodeId: mockNodeId,
				issue: 'High execution time contribution',
				suggestion: 'Consider optimizing webhook response handling',
				priority: 'medium',
			},
		],
	};

	const mockNodeTypePerformance: NodeTypePerformanceResponseDto = {
		nodeTypes: [
			{
				nodeType: 'webhook',
				instances: 5,
				performanceStats: {
					averageExecutionTime: 1500,
					memoryEfficiency: 0.8,
					errorRate: 5.0,
					throughput: 12.5,
				},
				benchmarkComparison: {
					vsAverage: -15.2,
					ranking: 3,
				},
				topPerformingWorkflows: ['workflow-fast'],
				problematicWorkflows: ['workflow-slow'],
			},
		],
		total: 1,
		timeRange: '24h',
		generatedAt: '2024-01-01T00:00:00.000Z',
	};

	const mockLiveNodeExecution: LiveNodeExecutionDto = {
		executionId: mockExecutionId,
		currentNode: mockNodeId,
		nodeStatuses: [
			{
				nodeId: mockNodeId,
				status: 'running',
				startTime: '2024-01-01T00:00:00.000Z',
				duration: 1500,
				memoryUsage: 50000000,
				itemsProcessed: 10,
				progress: 75,
			},
		],
		executionPath: [],
		estimatedCompletion: '2024-01-01T00:05:00.000Z',
	};

	const mockNodePerformanceHistory: NodePerformanceHistoryDto = {
		nodeId: mockNodeId,
		timeRange: '24h',
		metrics: {
			timestamps: ['2024-01-01T00:00:00.000Z'],
			executionTimes: [1500],
			memoryUsages: [50000000],
			inputCounts: [10],
			outputCounts: [8],
			errorCounts: [0],
		},
		patterns: {
			timeOfDayPerformance: [{ hour: 9, avgTime: 1200 }],
			dayOfWeekPerformance: [{ day: 'Monday', avgTime: 1400 }],
			correlations: {
				inputSizeImpact: 0.75,
				timeOfDayImpact: 0.25,
			},
		},
	};

	beforeEach(() => {
		systemMonitoringService = mock<SystemMonitoringService>();
		controller = new SystemMonitoringController(systemMonitoringService);

		user = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		} as IUser;

		req = {
			user,
			body: {},
			query: {},
		} as AuthenticatedRequest<any, any, any>;

		res = mock<Response>();
	});

	describe('getNodePerformanceMetrics', () => {
		beforeEach(() => {
			req.query = { timeRange: '24h' };
		});

		it('should return node performance metrics successfully', async () => {
			systemMonitoringService.getNodePerformanceMetrics.mockResolvedValue(
				mockNodePerformanceMetrics,
			);

			const result = await controller.getNodePerformanceMetrics(
				req,
				res,
				mockWorkflowId,
				mockNodeId,
				req.query as any,
			);

			expect(result).toEqual(mockNodePerformanceMetrics);
			expect(systemMonitoringService.getNodePerformanceMetrics).toHaveBeenCalledWith(
				mockWorkflowId,
				mockNodeId,
				req.query,
			);
		});

		it('should throw BadRequestError for empty workflow ID', async () => {
			await expect(
				controller.getNodePerformanceMetrics(req, res, '', mockNodeId, req.query as any),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw BadRequestError for empty node ID', async () => {
			await expect(
				controller.getNodePerformanceMetrics(req, res, mockWorkflowId, '', req.query as any),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Service unavailable');
			systemMonitoringService.getNodePerformanceMetrics.mockRejectedValue(serviceError);

			await expect(
				controller.getNodePerformanceMetrics(
					req,
					res,
					mockWorkflowId,
					mockNodeId,
					req.query as any,
				),
			).rejects.toThrow(InternalServerError);
		});
	});

	describe('getWorkflowNodeBreakdown', () => {
		beforeEach(() => {
			req.query = { timeRange: '24h', includeRecommendations: 'true' };
		});

		it('should return workflow node breakdown successfully', async () => {
			systemMonitoringService.getWorkflowNodeBreakdown.mockResolvedValue(mockWorkflowNodeBreakdown);

			const result = await controller.getWorkflowNodeBreakdown(
				req,
				res,
				mockWorkflowId,
				req.query as any,
			);

			expect(result).toEqual(mockWorkflowNodeBreakdown);
			expect(systemMonitoringService.getWorkflowNodeBreakdown).toHaveBeenCalledWith(
				mockWorkflowId,
				req.query,
			);
		});

		it('should throw BadRequestError for empty workflow ID', async () => {
			await expect(
				controller.getWorkflowNodeBreakdown(req, res, '', req.query as any),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Service unavailable');
			systemMonitoringService.getWorkflowNodeBreakdown.mockRejectedValue(serviceError);

			await expect(
				controller.getWorkflowNodeBreakdown(req, res, mockWorkflowId, req.query as any),
			).rejects.toThrow(InternalServerError);
		});
	});

	describe('getNodeTypePerformance', () => {
		beforeEach(() => {
			req.query = { timeRange: '24h', sortBy: 'executionTime', limit: '50' };
		});

		it('should return node type performance successfully', async () => {
			systemMonitoringService.getNodeTypePerformance.mockResolvedValue(
				mockNodeTypePerformance.nodeTypes,
			);

			const result = await controller.getNodeTypePerformance(req, res, req.query as any);

			expect(result.nodeTypes).toEqual(mockNodeTypePerformance.nodeTypes);
			expect(result.total).toBe(mockNodeTypePerformance.nodeTypes.length);
			expect(systemMonitoringService.getNodeTypePerformance).toHaveBeenCalledWith(req.query);
		});

		it('should validate limit parameter', async () => {
			req.query = { limit: '250' }; // Exceeds maximum

			await expect(controller.getNodeTypePerformance(req, res, req.query as any)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Service unavailable');
			systemMonitoringService.getNodeTypePerformance.mockRejectedValue(serviceError);

			await expect(controller.getNodeTypePerformance(req, res, req.query as any)).rejects.toThrow(
				InternalServerError,
			);
		});
	});

	describe('getLiveNodeExecution', () => {
		it('should return live node execution successfully', async () => {
			systemMonitoringService.getLiveNodeExecution.mockResolvedValue(mockLiveNodeExecution);

			const result = await controller.getLiveNodeExecution(req, res, mockExecutionId);

			expect(result).toEqual(mockLiveNodeExecution);
			expect(systemMonitoringService.getLiveNodeExecution).toHaveBeenCalledWith(mockExecutionId);
		});

		it('should throw BadRequestError for empty execution ID', async () => {
			await expect(controller.getLiveNodeExecution(req, res, '')).rejects.toThrow(BadRequestError);
		});

		it('should throw NotFoundError when execution not found', async () => {
			const serviceError = new Error("Execution 'test-id' not found or not active");
			systemMonitoringService.getLiveNodeExecution.mockRejectedValue(serviceError);

			await expect(controller.getLiveNodeExecution(req, res, 'test-id')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('should throw InternalServerError for other service errors', async () => {
			const serviceError = new Error('Service unavailable');
			systemMonitoringService.getLiveNodeExecution.mockRejectedValue(serviceError);

			await expect(controller.getLiveNodeExecution(req, res, mockExecutionId)).rejects.toThrow(
				InternalServerError,
			);
		});
	});

	describe('getNodePerformanceHistory', () => {
		beforeEach(() => {
			req.query = { timeRange: '24h' };
		});

		it('should return node performance history successfully', async () => {
			systemMonitoringService.getNodePerformanceHistory.mockResolvedValue(
				mockNodePerformanceHistory,
			);

			const result = await controller.getNodePerformanceHistory(
				req,
				res,
				mockWorkflowId,
				mockNodeId,
				req.query,
			);

			expect(result).toEqual(mockNodePerformanceHistory);
			expect(systemMonitoringService.getNodePerformanceHistory).toHaveBeenCalledWith(
				mockWorkflowId,
				mockNodeId,
				'24h',
			);
		});

		it('should use default time range', async () => {
			req.query = {};
			systemMonitoringService.getNodePerformanceHistory.mockResolvedValue(
				mockNodePerformanceHistory,
			);

			await controller.getNodePerformanceHistory(req, res, mockWorkflowId, mockNodeId, req.query);

			expect(systemMonitoringService.getNodePerformanceHistory).toHaveBeenCalledWith(
				mockWorkflowId,
				mockNodeId,
				'24h',
			);
		});

		it('should validate time range parameter', async () => {
			req.query = { timeRange: 'invalid' };

			await expect(
				controller.getNodePerformanceHistory(req, res, mockWorkflowId, mockNodeId, req.query),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw BadRequestError for empty workflow ID', async () => {
			await expect(
				controller.getNodePerformanceHistory(req, res, '', mockNodeId, req.query),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw BadRequestError for empty node ID', async () => {
			await expect(
				controller.getNodePerformanceHistory(req, res, mockWorkflowId, '', req.query),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Service unavailable');
			systemMonitoringService.getNodePerformanceHistory.mockRejectedValue(serviceError);

			await expect(
				controller.getNodePerformanceHistory(req, res, mockWorkflowId, mockNodeId, req.query),
			).rejects.toThrow(InternalServerError);
		});
	});
});
