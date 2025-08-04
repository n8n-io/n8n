'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const performance_monitoring_controller_1 = require('../performance-monitoring.controller');
const response_errors_1 = require('@/errors/response-errors');
describe('PerformanceMonitoringController', () => {
	let controller;
	let performanceService;
	let systemResourcesService;
	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		role: 'global:owner',
	};
	const mockRequest = {
		user: mockUser,
	};
	const mockResponse = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
	};
	beforeEach(() => {
		performanceService = {
			getExecutionProfile: jest.fn(),
			getPerformanceMetrics: jest.fn(),
		};
		systemResourcesService = {
			getCurrentResources: jest.fn(),
			checkSystemHealth: jest.fn(),
		};
		controller = new performance_monitoring_controller_1.PerformanceMonitoringController(
			performanceService,
			systemResourcesService,
		);
	});
	describe('getExecutionProfile', () => {
		const mockExecutionId = 'exec-123';
		const mockProfile = {
			executionId: mockExecutionId,
			workflowId: 'workflow-456',
			status: 'success',
			timing: {
				startedAt: '2024-01-01T10:00:00.000Z',
				finishedAt: '2024-01-01T10:05:00.000Z',
				duration: 300000,
				queueTime: 1000,
			},
			performance: {
				nodeExecutions: [
					{
						nodeId: 'node-1',
						nodeType: 'n8n-nodes-base.httpRequest',
						duration: 150000,
						memoryUsage: 1024000,
						inputItems: 1,
						outputItems: 1,
						status: 'success',
					},
				],
				totalMemoryPeak: 2048000,
				resourceUtilization: {
					cpuPercent: 25.5,
					memoryMB: 128.5,
					ioOperations: 10,
				},
			},
			bottlenecks: [
				{
					nodeId: 'node-1',
					issue: 'slow_execution',
					severity: 'medium',
					suggestion: 'Consider optimizing the HTTP request',
				},
			],
		};
		it('should return execution profile with default options', async () => {
			performanceService.getExecutionProfile.mockResolvedValue(mockProfile);
			const result = await controller.getExecutionProfile(
				mockRequest,
				mockResponse,
				mockExecutionId,
				{},
			);
			expect(result).toEqual(mockProfile);
			expect(performanceService.getExecutionProfile).toHaveBeenCalledWith(mockExecutionId, {
				includeBottlenecks: true,
				includeResourceMetrics: true,
			});
		});
		it('should return execution profile with custom options', async () => {
			performanceService.getExecutionProfile.mockResolvedValue(mockProfile);
			const result = await controller.getExecutionProfile(
				mockRequest,
				mockResponse,
				mockExecutionId,
				{
					includeBottlenecks: 'false',
					includeResourceMetrics: 'false',
				},
			);
			expect(result).toEqual(mockProfile);
			expect(performanceService.getExecutionProfile).toHaveBeenCalledWith(mockExecutionId, {
				includeBottlenecks: false,
				includeResourceMetrics: false,
			});
		});
		it('should throw BadRequestError for empty execution ID', async () => {
			await expect(
				controller.getExecutionProfile(mockRequest, mockResponse, '', {}),
			).rejects.toThrow(response_errors_1.BadRequestError);
		});
		it('should throw NotFoundError when execution not found', async () => {
			const error = new Error('Execution not found');
			error.name = 'ApplicationError';
			performanceService.getExecutionProfile.mockRejectedValue(error);
			await expect(
				controller.getExecutionProfile(mockRequest, mockResponse, mockExecutionId, {}),
			).rejects.toThrow(response_errors_1.NotFoundError);
		});
		it('should log error and rethrow for service failures', async () => {
			const error = new Error('Service failure');
			performanceService.getExecutionProfile.mockRejectedValue(error);
			const loggerErrorSpy = jest.spyOn(require('n8n-workflow').LoggerProxy, 'error');
			await expect(
				controller.getExecutionProfile(mockRequest, mockResponse, mockExecutionId, {}),
			).rejects.toThrow(error);
			expect(loggerErrorSpy).toHaveBeenCalledWith(
				'Failed to get execution profile',
				expect.objectContaining({
					executionId: mockExecutionId,
					userId: mockUser.id,
					error: 'Service failure',
				}),
			);
			loggerErrorSpy.mockRestore();
		});
	});
	describe('getSystemResources', () => {
		const mockResources = {
			timestamp: '2024-01-01T10:00:00.000Z',
			system: {
				cpu: {
					usage: 45.2,
					cores: 8,
					load: [1.2, 1.5, 1.8],
				},
				memory: {
					total: 16777216000,
					used: 8388608000,
					free: 8388608000,
					usagePercent: 50.0,
				},
				disk: {
					total: 1000000000000,
					used: 500000000000,
					free: 500000000000,
					usagePercent: 50.0,
				},
			},
			processes: {
				main: {
					pid: 12345,
					memory: 134217728,
					cpu: 15.5,
					uptime: 3600000,
				},
			},
		};
		it('should return system resources with default options', async () => {
			systemResourcesService.getCurrentResources.mockResolvedValue(mockResources);
			const result = await controller.getSystemResources(mockRequest, mockResponse, {});
			expect(result).toEqual(mockResources);
			expect(systemResourcesService.getCurrentResources).toHaveBeenCalledWith({
				includeWorkers: false,
				includeQueue: false,
			});
		});
		it('should return system resources with custom options', async () => {
			const mockResourcesWithWorkers = {
				...mockResources,
				system: {
					...mockResources.system,
					cpu: {
						...mockResources.system.cpu,
						load: [1.2, 1.5, 1.8],
					},
				},
				processes: {
					...mockResources.processes,
					workers: [
						{
							pid: 12346,
							memory: 67108864,
							cpu: 8.2,
							type: 'worker',
						},
					],
				},
				queue: {
					waiting: 5,
					active: 2,
					completed: 100,
					failed: 3,
				},
			};
			systemResourcesService.getCurrentResources.mockResolvedValue(mockResourcesWithWorkers);
			const result = await controller.getSystemResources(mockRequest, mockResponse, {
				includeWorkers: 'true',
				includeQueue: 'true',
			});
			expect(result).toEqual(mockResourcesWithWorkers);
			expect(systemResourcesService.getCurrentResources).toHaveBeenCalledWith({
				includeWorkers: true,
				includeQueue: true,
			});
		});
	});
	describe('getPerformanceMetrics', () => {
		const mockMetrics = {
			timeRange: {
				start: '2024-01-01T00:00:00.000Z',
				end: '2024-01-01T23:59:59.999Z',
			},
			filters: {
				workflowId: 'workflow-123',
			},
			metrics: {
				executionCounts: {
					total: 100,
					success: 85,
					failed: 10,
					running: 5,
				},
				timing: {
					averageDuration: 45000,
					medianDuration: 38000,
					p95Duration: 120000,
					p99Duration: 180000,
				},
				resourceUsage: {
					averageMemory: 128.5,
					peakMemory: 256.0,
					averageCpu: 25.2,
				},
				trends: [
					{
						timestamp: '2024-01-01T10:00:00.000Z',
						executionCount: 10,
						averageDuration: 42000,
						errorRate: 8.5,
					},
				],
			},
		};
		it('should return performance metrics with valid request', async () => {
			performanceService.getPerformanceMetrics.mockResolvedValue(mockMetrics);
			const query = {
				timeRange: '24h',
				workflowId: 'workflow-123',
			};
			const result = await controller.getPerformanceMetrics(mockRequest, mockResponse, query);
			expect(result).toEqual(mockMetrics);
			expect(performanceService.getPerformanceMetrics).toHaveBeenCalledWith(query);
		});
		it('should validate custom date range', async () => {
			const query = {
				startDate: '2024-01-01T00:00:00.000Z',
				endDate: '2024-01-02T00:00:00.000Z',
			};
			performanceService.getPerformanceMetrics.mockResolvedValue(mockMetrics);
			await controller.getPerformanceMetrics(mockRequest, mockResponse, query);
			expect(performanceService.getPerformanceMetrics).toHaveBeenCalledWith(query);
		});
		it('should throw BadRequestError for invalid date format', async () => {
			const query = {
				startDate: 'invalid-date',
				endDate: '2024-01-02T00:00:00.000Z',
			};
			await expect(
				controller.getPerformanceMetrics(mockRequest, mockResponse, query),
			).rejects.toThrow(response_errors_1.BadRequestError);
		});
		it('should throw BadRequestError when startDate is after endDate', async () => {
			const query = {
				startDate: '2024-01-02T00:00:00.000Z',
				endDate: '2024-01-01T00:00:00.000Z',
			};
			await expect(
				controller.getPerformanceMetrics(mockRequest, mockResponse, query),
			).rejects.toThrow(response_errors_1.BadRequestError);
		});
		it('should throw BadRequestError for time range exceeding 90 days', async () => {
			const query = {
				startDate: '2024-01-01T00:00:00.000Z',
				endDate: '2024-04-01T00:00:00.000Z',
			};
			await expect(
				controller.getPerformanceMetrics(mockRequest, mockResponse, query),
			).rejects.toThrow(response_errors_1.BadRequestError);
		});
		it('should throw BadRequestError for invalid status values', async () => {
			const query = {
				status: 'invalid-status,success',
			};
			await expect(
				controller.getPerformanceMetrics(mockRequest, mockResponse, query),
			).rejects.toThrow(response_errors_1.BadRequestError);
		});
		it('should accept valid status values', async () => {
			const query = {
				status: 'success,error,running',
			};
			performanceService.getPerformanceMetrics.mockResolvedValue(mockMetrics);
			await controller.getPerformanceMetrics(mockRequest, mockResponse, query);
			expect(performanceService.getPerformanceMetrics).toHaveBeenCalledWith(query);
		});
	});
	describe('getSystemHealth', () => {
		const mockHealthy = {
			healthy: true,
			issues: [],
			recommendations: [],
		};
		const mockUnhealthy = {
			healthy: false,
			issues: ['High CPU usage: 85.2%', 'High memory usage: 92.1%'],
			recommendations: [
				'Consider scaling horizontally or optimizing CPU-intensive workflows',
				'Consider increasing system memory or optimizing memory-intensive workflows',
			],
		};
		it('should return healthy system status', async () => {
			systemResourcesService.checkSystemHealth.mockResolvedValue(mockHealthy);
			const result = await controller.getSystemHealth(mockRequest, mockResponse);
			expect(result).toEqual(mockHealthy);
		});
		it('should return unhealthy system status with issues', async () => {
			systemResourcesService.checkSystemHealth.mockResolvedValue(mockUnhealthy);
			const result = await controller.getSystemHealth(mockRequest, mockResponse);
			expect(result).toEqual(mockUnhealthy);
		});
	});
	describe('getExecutionBottlenecks', () => {
		const mockExecutionId = 'exec-123';
		const mockProfile = {
			executionId: mockExecutionId,
			workflowId: 'workflow-456',
			status: 'success',
			timing: {
				startedAt: '2024-01-01T10:00:00.000Z',
				finishedAt: '2024-01-01T10:05:00.000Z',
				duration: 300000,
			},
			performance: {
				nodeExecutions: [],
				resourceUtilization: {},
			},
			bottlenecks: [
				{
					nodeId: 'node-1',
					issue: 'slow_execution',
					severity: 'medium',
					suggestion: 'Consider optimizing the HTTP request',
				},
			],
		};
		it('should return execution bottlenecks', async () => {
			performanceService.getExecutionProfile.mockResolvedValue(mockProfile);
			const result = await controller.getExecutionBottlenecks(
				mockRequest,
				mockResponse,
				mockExecutionId,
			);
			expect(result).toEqual({
				executionId: mockExecutionId,
				workflowId: 'workflow-456',
				bottlenecks: mockProfile.bottlenecks,
				timestamp: expect.any(String),
			});
			expect(performanceService.getExecutionProfile).toHaveBeenCalledWith(mockExecutionId, {
				includeBottlenecks: true,
				includeResourceMetrics: false,
			});
		});
		it('should throw BadRequestError for empty execution ID', async () => {
			await expect(
				controller.getExecutionBottlenecks(mockRequest, mockResponse, ''),
			).rejects.toThrow(response_errors_1.BadRequestError);
		});
		it('should throw NotFoundError when execution not found', async () => {
			const error = new Error('Execution not found');
			error.name = 'ApplicationError';
			performanceService.getExecutionProfile.mockRejectedValue(error);
			await expect(
				controller.getExecutionBottlenecks(mockRequest, mockResponse, mockExecutionId),
			).rejects.toThrow(response_errors_1.NotFoundError);
		});
	});
	describe('parseBoolean helper', () => {
		it('should parse boolean values correctly', () => {
			const controllerAny = controller;
			expect(controllerAny.parseBoolean('true', false)).toBe(true);
			expect(controllerAny.parseBoolean('false', true)).toBe(false);
			expect(controllerAny.parseBoolean('TRUE', false)).toBe(true);
			expect(controllerAny.parseBoolean('FALSE', true)).toBe(false);
			expect(controllerAny.parseBoolean(undefined, true)).toBe(true);
			expect(controllerAny.parseBoolean(undefined, false)).toBe(false);
			expect(controllerAny.parseBoolean('invalid', true)).toBe(true);
		});
	});
});
//# sourceMappingURL=performance-monitoring.controller.test.js.map
