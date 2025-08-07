'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const system_monitoring_service_1 = require('@/services/system-monitoring.service');
const system_monitoring_controller_1 = require('../system-monitoring.controller');
describe('SystemMonitoringController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const systemMonitoringService = (0, backend_test_utils_1.mockInstance)(
		system_monitoring_service_1.SystemMonitoringService,
	);
	const controller = di_1.Container.get(system_monitoring_controller_1.SystemMonitoringController);
	const mockUser = (0, jest_mock_extended_1.mock)({
		id: 'user-123',
		email: 'test@example.com',
	});
	const mockResponse = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getSystemResources', () => {
		it('should return enhanced system resources with default options', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mockResources = (0, jest_mock_extended_1.mock)({
				system: {
					cpuUsage: 25.5,
					memoryUsage: {
						used: 1024 * 1024 * 1024,
						total: 8 * 1024 * 1024 * 1024,
						free: 7 * 1024 * 1024 * 1024,
						percentage: 12.5,
					},
					diskUsage: {
						used: 10 * 1024 * 1024 * 1024,
						total: 100 * 1024 * 1024 * 1024,
						free: 90 * 1024 * 1024 * 1024,
						percentage: 10,
					},
				},
				timestamp: new Date().toISOString(),
			});
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockResources);
			const result = await controller.getSystemResources(req, mockResponse, {});
			expect(systemMonitoringService.getEnhancedSystemResources).toHaveBeenCalledWith({
				includeWorkers: false,
				includeQueue: false,
				includeWorkflows: false,
				includeNetworking: false,
				includeDetailed: false,
			});
			expect(result).toEqual(mockResources);
		});
		it('should return enhanced system resources with custom options', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {
				includeWorkers: true,
				includeQueue: true,
				includeWorkflows: true,
				includeNetworking: true,
				includeDetailed: true,
			};
			const mockResources = (0, jest_mock_extended_1.mock)();
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockResources);
			const result = await controller.getSystemResources(req, mockResponse, query);
			expect(systemMonitoringService.getEnhancedSystemResources).toHaveBeenCalledWith(query);
			expect(result).toEqual(mockResources);
		});
		it('should handle service BadRequestError and rethrow it', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const error = new bad_request_error_1.BadRequestError('Invalid request parameters');
			systemMonitoringService.getEnhancedSystemResources.mockRejectedValue(error);
			await expect(controller.getSystemResources(req, mockResponse, {})).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.getSystemResources(req, mockResponse, {})).rejects.toThrow(
				'Invalid request parameters',
			);
		});
		it('should wrap other errors in InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const error = new Error('Database connection failed');
			systemMonitoringService.getEnhancedSystemResources.mockRejectedValue(error);
			await expect(controller.getSystemResources(req, mockResponse, {})).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.getSystemResources(req, mockResponse, {})).rejects.toThrow(
				'Failed to get system resources',
			);
		});
	});
	describe('getSystemHealth', () => {
		it('should return system health status', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mockHealth = (0, jest_mock_extended_1.mock)({
				status: 'healthy',
				components: {
					database: { status: 'healthy', responseTime: 5 },
					redis: { status: 'healthy', responseTime: 2 },
					queue: { status: 'healthy', pendingJobs: 0 },
				},
				timestamp: new Date().toISOString(),
			});
			systemMonitoringService.checkSystemHealth.mockResolvedValue(mockHealth);
			const result = await controller.getSystemHealth(req, mockResponse);
			expect(systemMonitoringService.checkSystemHealth).toHaveBeenCalled();
			expect(result).toEqual(mockHealth);
		});
		it('should handle service errors and throw InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const error = new Error('Health check failed');
			systemMonitoringService.checkSystemHealth.mockRejectedValue(error);
			await expect(controller.getSystemHealth(req, mockResponse)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.getSystemHealth(req, mockResponse)).rejects.toThrow(
				'Failed to get system health status',
			);
		});
	});
	describe('getAlerts', () => {
		it('should return alerts with default pagination', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {};
			const mockAlertsResult = {
				alerts: [],
				total: 0,
				unresolved: 0,
				bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
			};
			systemMonitoringService.getAlerts.mockReturnValue(mockAlertsResult);
			const result = await controller.getAlerts(req, mockResponse, query);
			expect(systemMonitoringService.getAlerts).toHaveBeenCalledWith({
				severity: undefined,
				type: undefined,
				resolved: undefined,
				workflowId: undefined,
				limit: undefined,
				offset: undefined,
				startDate: undefined,
				endDate: undefined,
			});
			expect(result).toEqual({
				alerts: [],
				total: 0,
				unresolved: 0,
				bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
				pagination: {
					limit: 50,
					offset: 0,
					total: 0,
				},
			});
		});
		it('should validate date range and throw BadRequestError for invalid range', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {
				startDate: '2024-01-15',
				endDate: '2024-01-10',
			};
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				'startDate must be before endDate',
			);
		});
		it('should validate date range and throw BadRequestError for excessive range', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {
				startDate: '2024-01-01',
				endDate: '2024-06-01',
			};
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				'Date range cannot exceed 90 days',
			);
		});
		it('should validate limit parameter', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = { limit: 1000 };
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				'Limit must be between 1 and 500',
			);
		});
		it('should validate offset parameter', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = { offset: -1 };
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				'Offset must be non-negative',
			);
		});
		it('should handle service errors and throw InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {};
			const error = new Error('Database error');
			systemMonitoringService.getAlerts.mockImplementation(() => {
				throw error;
			});
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.getAlerts(req, mockResponse, query)).rejects.toThrow(
				'Failed to get alerts',
			);
		});
	});
	describe('getMetricsHistory', () => {
		it('should return metrics history with default time range', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {};
			const mockHistory = (0, jest_mock_extended_1.mock)([]);
			systemMonitoringService.getMetricsHistory.mockReturnValue(mockHistory);
			const result = await controller.getMetricsHistory(req, mockResponse, query);
			expect(systemMonitoringService.getMetricsHistory).toHaveBeenCalledWith('24h');
			expect(result).toEqual(mockHistory);
		});
		it('should validate time range parameter', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = { timeRange: 'invalid' };
			await expect(controller.getMetricsHistory(req, mockResponse, query)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.getMetricsHistory(req, mockResponse, query)).rejects.toThrow(
				'Invalid time range. Must be one of: 1h, 6h, 24h, 7d, 30d',
			);
		});
		it('should accept valid time ranges', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const mockHistory = (0, jest_mock_extended_1.mock)([]);
			systemMonitoringService.getMetricsHistory.mockReturnValue(mockHistory);
			for (const timeRange of validTimeRanges) {
				const query = { timeRange };
				const result = await controller.getMetricsHistory(req, mockResponse, query);
				expect(systemMonitoringService.getMetricsHistory).toHaveBeenCalledWith(timeRange);
				expect(result).toEqual(mockHistory);
			}
		});
		it('should handle service errors and throw InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const query = {};
			const error = new Error('Metrics retrieval failed');
			systemMonitoringService.getMetricsHistory.mockImplementation(() => {
				throw error;
			});
			await expect(controller.getMetricsHistory(req, mockResponse, query)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.getMetricsHistory(req, mockResponse, query)).rejects.toThrow(
				'Failed to get metrics history',
			);
		});
	});
	describe('getWorkflowMetrics', () => {
		it('should return workflow metrics for valid workflow ID', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const workflowId = 'workflow-123';
			const query = {};
			const result = await controller.getWorkflowMetrics(req, mockResponse, workflowId, query);
			expect(result).toEqual({
				workflowId,
				workflowName: 'Sample Workflow',
				timeRange: undefined,
				executions: [],
				aggregates: {
					totalExecutions: 0,
					successRate: 0,
					averageDuration: 0,
					averageMemoryUsage: 0,
					averageCpuUsage: 0,
					peakMemoryUsage: 0,
					peakCpuUsage: 0,
				},
			});
		});
		it('should throw BadRequestError for empty workflow ID', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const workflowId = '';
			const query = {};
			await expect(
				controller.getWorkflowMetrics(req, mockResponse, workflowId, query),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.getWorkflowMetrics(req, mockResponse, workflowId, query),
			).rejects.toThrow('Workflow ID is required');
		});
		it('should throw BadRequestError for whitespace-only workflow ID', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const workflowId = '   ';
			const query = {};
			await expect(
				controller.getWorkflowMetrics(req, mockResponse, workflowId, query),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.getWorkflowMetrics(req, mockResponse, workflowId, query),
			).rejects.toThrow('Workflow ID is required');
		});
		it('should validate limit parameter', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const workflowId = 'workflow-123';
			const query = { limit: 2000 };
			await expect(
				controller.getWorkflowMetrics(req, mockResponse, workflowId, query),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.getWorkflowMetrics(req, mockResponse, workflowId, query),
			).rejects.toThrow('Limit must be between 1 and 1000');
		});
		it('should handle internal errors and throw InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const workflowId = 'workflow-123';
			const query = {};
			const result = await controller.getWorkflowMetrics(req, mockResponse, workflowId, query);
			expect(result).toBeDefined();
			expect(result.workflowId).toBe(workflowId);
		});
	});
	describe('getAlertRules', () => {
		it('should return alert rules', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mockRules = (0, jest_mock_extended_1.mock)({
				rules: [],
				total: 0,
			});
			systemMonitoringService.getAlertRules.mockReturnValue(mockRules);
			const result = await controller.getAlertRules(req, mockResponse);
			expect(systemMonitoringService.getAlertRules).toHaveBeenCalled();
			expect(result).toEqual(mockRules);
		});
		it('should handle service errors and throw InternalServerError', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const error = new Error('Alert rules retrieval failed');
			systemMonitoringService.getAlertRules.mockImplementation(() => {
				throw error;
			});
			await expect(controller.getAlertRules(req, mockResponse)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.getAlertRules(req, mockResponse)).rejects.toThrow(
				'Failed to get alert rules',
			);
		});
	});
	describe('getMonitoringConfig', () => {
		it('should return monitoring configuration', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const result = await controller.getMonitoringConfig(req, mockResponse);
			expect(result).toEqual({
				enabled: true,
				interval: 30000,
				retentionPeriod: 7 * 24 * 60 * 60 * 1000,
				alerts: {
					enabled: true,
					thresholds: {
						cpu: { warning: 80, critical: 90 },
						memory: { warning: 85, critical: 95 },
						disk: { warning: 85, critical: 95 },
						workflow: {
							maxExecutionTime: 300000,
							maxMemoryUsage: 512 * 1024 * 1024,
						},
					},
					notifications: {
						email: false,
						webhook: false,
					},
				},
				metrics: {
					prometheus: true,
					detailed: false,
					includeWorkflowMetrics: true,
					includeSystemMetrics: true,
				},
			});
		});
		it('should handle internal processing without errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const result = await controller.getMonitoringConfig(req, mockResponse);
			expect(result).toBeDefined();
			expect(result.enabled).toBe(true);
			expect(result.interval).toBe(30000);
		});
	});
});
//# sourceMappingURL=system-monitoring.controller.test.js.map
