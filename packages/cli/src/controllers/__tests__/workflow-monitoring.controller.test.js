'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const system_monitoring_controller_1 = require('../system-monitoring.controller');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
describe('SystemMonitoringController - Workflow Resource Endpoints', () => {
	let controller;
	let mockSystemMonitoringService;
	let mockRequest;
	let mockResponse;
	beforeEach(() => {
		mockSystemMonitoringService = {
			getWorkflowResourceMetrics: jest.fn(),
			getAllWorkflowResourceMetrics: jest.fn(),
			getWorkflowResourceComparison: jest.fn(),
			getWorkflowResourceAlerts: jest.fn(),
		};
		controller = new system_monitoring_controller_1.SystemMonitoringController(
			mockSystemMonitoringService,
		);
		mockRequest = {
			user: { id: 'user-123' },
		};
		mockResponse = {};
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('GET /workflows/:workflowId/resources', () => {
		it('should get workflow resource metrics successfully', async () => {
			const mockMetrics = {
				workflowId: 'workflow-456',
				workflowName: 'Test Workflow',
				totalExecutions: 5,
				averageExecutionTime: 1500,
				averageMemoryUsage: 50000000,
				peakMemoryUsage: 75000000,
				averageCpuUsage: 25,
				peakCpuUsage: 60,
				totalResourceCost: 125.5,
				resourceEfficiency: 0.8,
				lastExecuted: new Date('2024-01-01T12:00:00Z'),
				samples: [
					{
						timestamp: Date.now(),
						memoryUsage: 45000000,
						cpuUsage: 20,
						activeNodes: 3,
					},
				],
			};
			mockSystemMonitoringService.getWorkflowResourceMetrics.mockResolvedValue(mockMetrics);
			const result = await controller.getWorkflowResourceMetrics(
				mockRequest,
				mockResponse,
				'workflow-456',
				{},
			);
			expect(result.success).toBe(true);
			expect(result.data.workflowId).toBe('workflow-456');
			expect(result.data.totalExecutions).toBe(5);
			expect(result.metadata.workflowId).toBe('workflow-456');
			expect(mockSystemMonitoringService.getWorkflowResourceMetrics).toHaveBeenCalledWith(
				'workflow-456',
				undefined,
			);
		});
		it('should handle workflow not found', async () => {
			mockSystemMonitoringService.getWorkflowResourceMetrics.mockResolvedValue(null);
			await expect(
				controller.getWorkflowResourceMetrics(mockRequest, mockResponse, 'non-existent', {}),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should validate workflow ID', async () => {
			await expect(
				controller.getWorkflowResourceMetrics(mockRequest, mockResponse, '', {}),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should validate time range parameter', async () => {
			await expect(
				controller.getWorkflowResourceMetrics(mockRequest, mockResponse, 'workflow-456', {
					timeRange: 'invalid',
				}),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should handle service errors', async () => {
			mockSystemMonitoringService.getWorkflowResourceMetrics.mockRejectedValue(
				new Error('Service error'),
			);
			await expect(
				controller.getWorkflowResourceMetrics(mockRequest, mockResponse, 'workflow-456', {}),
			).rejects.toThrow(internal_server_error_1.InternalServerError);
		});
	});
	describe('GET /workflows/resources', () => {
		it('should get all workflow resource metrics successfully', async () => {
			const mockMetricsMap = new Map([
				[
					'workflow-1',
					{
						workflowId: 'workflow-1',
						workflowName: 'Workflow 1',
						totalExecutions: 3,
						averageExecutionTime: 1000,
						averageMemoryUsage: 30000000,
						peakMemoryUsage: 40000000,
						averageCpuUsage: 15,
						peakCpuUsage: 30,
						totalResourceCost: 75.0,
						resourceEfficiency: 0.9,
						lastExecuted: new Date('2024-01-01T12:00:00Z'),
						samples: [],
					},
				],
				[
					'workflow-2',
					{
						workflowId: 'workflow-2',
						workflowName: 'Workflow 2',
						totalExecutions: 7,
						averageExecutionTime: 2000,
						averageMemoryUsage: 60000000,
						peakMemoryUsage: 80000000,
						averageCpuUsage: 35,
						peakCpuUsage: 70,
						totalResourceCost: 150.0,
						resourceEfficiency: 0.7,
						lastExecuted: new Date('2024-01-01T13:00:00Z'),
						samples: [],
					},
				],
			]);
			mockSystemMonitoringService.getAllWorkflowResourceMetrics.mockResolvedValue(mockMetricsMap);
			const result = await controller.getAllWorkflowResourceMetrics(mockRequest, mockResponse, {});
			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
			expect(result.data[0].totalResourceCost).toBeGreaterThanOrEqual(
				result.data[1].totalResourceCost,
			);
			expect(result.metadata.total).toBe(2);
			expect(result.metadata.returned).toBe(2);
		});
		it('should apply limit parameter', async () => {
			const mockMetricsMap = new Map([
				['workflow-1', { totalResourceCost: 100, samples: [] }],
				['workflow-2', { totalResourceCost: 200, samples: [] }],
				['workflow-3', { totalResourceCost: 150, samples: [] }],
			]);
			mockSystemMonitoringService.getAllWorkflowResourceMetrics.mockResolvedValue(mockMetricsMap);
			const result = await controller.getAllWorkflowResourceMetrics(mockRequest, mockResponse, {
				limit: 2,
			});
			expect(result.data).toHaveLength(2);
			expect(result.metadata.limit).toBe(2);
		});
		it('should validate time range parameter', async () => {
			await expect(
				controller.getAllWorkflowResourceMetrics(mockRequest, mockResponse, {
					timeRange: 'invalid',
				}),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('GET /workflows/resources/compare', () => {
		it('should compare workflow resources successfully', async () => {
			const mockComparisons = [
				{
					workflowId: 'workflow-1',
					workflowName: 'Workflow 1',
					totalExecutions: 5,
					averageExecutionTime: 1500,
					averageMemoryUsage: 50000000,
					peakMemoryUsage: 75000000,
					averageCpuUsage: 25,
					peakCpuUsage: 60,
					totalResourceCost: 200.0,
					resourceEfficiency: 0.8,
					lastExecuted: new Date('2024-01-01T12:00:00Z'),
					samples: [],
				},
				{
					workflowId: 'workflow-2',
					workflowName: 'Workflow 2',
					totalExecutions: 3,
					averageExecutionTime: 1000,
					averageMemoryUsage: 30000000,
					peakMemoryUsage: 40000000,
					averageCpuUsage: 15,
					peakCpuUsage: 30,
					totalResourceCost: 100.0,
					resourceEfficiency: 0.9,
					lastExecuted: new Date('2024-01-01T13:00:00Z'),
					samples: [],
				},
			];
			mockSystemMonitoringService.getWorkflowResourceComparison.mockResolvedValue(mockComparisons);
			const result = await controller.compareWorkflowResources(mockRequest, mockResponse, {
				workflowIds: 'workflow-1,workflow-2',
			});
			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
			expect(result.data[0].rank).toBe(1);
			expect(result.data[1].rank).toBe(2);
			expect(result.metadata.workflowIds).toEqual(['workflow-1', 'workflow-2']);
		});
		it('should validate required workflowIds parameter', async () => {
			await expect(
				controller.compareWorkflowResources(mockRequest, mockResponse, {}),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should validate workflow ID limit', async () => {
			const tooManyIds = Array.from({ length: 12 }, (_, i) => `workflow-${i}`).join(',');
			await expect(
				controller.compareWorkflowResources(mockRequest, mockResponse, {
					workflowIds: tooManyIds,
				}),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should handle empty workflow IDs list', async () => {
			await expect(
				controller.compareWorkflowResources(mockRequest, mockResponse, {
					workflowIds: ',,,',
				}),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('GET /workflows/alerts', () => {
		it('should get workflow alerts successfully', async () => {
			const mockAlerts = [
				{
					id: 'alert-1',
					type: 'workflow',
					severity: 'warning',
					message: 'High memory usage',
					workflowId: 'workflow-456',
					timestamp: '2024-01-01T12:00:00Z',
					resolved: false,
				},
			];
			mockSystemMonitoringService.getWorkflowResourceAlerts.mockReturnValue(mockAlerts);
			const result = await controller.getWorkflowAlerts(mockRequest, mockResponse, {});
			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(1);
			expect(result.metadata.total).toBe(1);
			expect(mockSystemMonitoringService.getWorkflowResourceAlerts).toHaveBeenCalledWith(undefined);
		});
		it('should filter alerts by workflow ID', async () => {
			const mockAlerts = [
				{
					id: 'alert-1',
					type: 'workflow',
					severity: 'warning',
					message: 'High memory usage',
					workflowId: 'workflow-456',
					timestamp: '2024-01-01T12:00:00Z',
					resolved: false,
				},
			];
			mockSystemMonitoringService.getWorkflowResourceAlerts.mockReturnValue(mockAlerts);
			await controller.getWorkflowAlerts(mockRequest, mockResponse, {
				workflowId: 'workflow-456',
			});
			expect(mockSystemMonitoringService.getWorkflowResourceAlerts).toHaveBeenCalledWith(
				'workflow-456',
			);
		});
		it('should handle service errors', async () => {
			mockSystemMonitoringService.getWorkflowResourceAlerts.mockImplementation(() => {
				throw new Error('Service error');
			});
			await expect(controller.getWorkflowAlerts(mockRequest, mockResponse, {})).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
});
//# sourceMappingURL=workflow-monitoring.controller.test.js.map
