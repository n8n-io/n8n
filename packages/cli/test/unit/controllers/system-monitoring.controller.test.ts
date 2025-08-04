import type { Response } from 'express';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SystemMonitoringController } from '@/controllers/system-monitoring.controller';
import { SystemMonitoringService } from '@/services/system-monitoring.service';
import { mock } from 'jest-mock-extended';
import type { AuthenticatedRequest } from '@n8n/db';
import type { IUser } from 'n8n-workflow';

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

describe('SystemMonitoringController', () => {
	let controller: SystemMonitoringController;
	let systemMonitoringService: jest.Mocked<SystemMonitoringService>;
	let req: AuthenticatedRequest<any, any, any>;
	let res: Response;
	let user: IUser;

	const mockSystemResources = {
		timestamp: '2024-01-01T00:00:00.000Z',
		system: {
			cpu: { usage: 25.5, cores: 8, load: [1.2, 1.5, 1.8] },
			memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50 },
			disk: { total: 1000000000000, used: 500000000000, free: 500000000000, usagePercent: 50 },
			uptime: 86400000,
			platform: 'linux',
			architecture: 'x64',
			nodeVersion: 'v18.0.0',
		},
		processes: {
			main: { pid: 1234, memory: 100000000, cpu: 15.5, uptime: 86400000 },
		},
		health: {
			healthy: true,
			overallScore: 85,
			components: {
				cpu: { healthy: true, score: 90, issues: [] },
				memory: { healthy: true, score: 85, issues: [] },
				disk: { healthy: true, score: 80, issues: [] },
				network: { healthy: true, score: 95, issues: [] },
				workflows: { healthy: true, score: 90, issues: [] },
			},
			recommendations: [],
			alerts: [],
		},
	};

	const mockHealthStatus = {
		healthy: true,
		overallScore: 85,
		components: {
			cpu: { healthy: true, score: 90, issues: [] },
			memory: { healthy: true, score: 85, issues: [] },
			disk: { healthy: true, score: 80, issues: [] },
			network: { healthy: true, score: 95, issues: [] },
			workflows: { healthy: true, score: 90, issues: [] },
		},
		recommendations: ['Consider monitoring workflow performance'],
		alerts: [],
	};

	const mockAlert = {
		id: 'alert-123',
		type: 'cpu' as const,
		severity: 'warning' as const,
		message: 'High CPU usage detected',
		threshold: 80,
		currentValue: 85,
		timestamp: '2024-01-01T00:00:00.000Z',
		resolved: false,
	};

	const mockAlertRule = {
		id: 'rule-123',
		name: 'High CPU Alert',
		description: 'Alert when CPU usage exceeds threshold',
		type: 'cpu' as const,
		metric: 'usage',
		operator: '>' as const,
		threshold: 80,
		severity: 'warning' as const,
		enabled: true,
		notifications: { email: false, webhook: false },
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		triggerCount: 5,
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

	describe('getSystemResources', () => {
		beforeEach(() => {
			req.query = {
				includeWorkers: 'true',
				includeQueue: 'true',
				includeWorkflows: 'true',
			};
		});

		it('should return enhanced system resources successfully', async () => {
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(
				mockSystemResources as any,
			);

			const result = await controller.getSystemResources(req, res, req.query as any);

			expect(result).toEqual(mockSystemResources);
			expect(systemMonitoringService.getEnhancedSystemResources).toHaveBeenCalledWith({
				includeWorkers: true,
				includeQueue: true,
				includeWorkflows: true,
				includeNetworking: false,
				includeDetailed: false,
			});
		});

		it('should handle default query parameters', async () => {
			req.query = {};
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(
				mockSystemResources as any,
			);

			await controller.getSystemResources(req, res, req.query as any);

			expect(systemMonitoringService.getEnhancedSystemResources).toHaveBeenCalledWith({
				includeWorkers: false,
				includeQueue: false,
				includeWorkflows: false,
				includeNetworking: false,
				includeDetailed: false,
			});
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Service unavailable');
			systemMonitoringService.getEnhancedSystemResources.mockRejectedValue(serviceError);

			await expect(controller.getSystemResources(req, res, req.query as any)).rejects.toThrow(
				InternalServerError,
			);
		});
	});

	describe('getSystemHealth', () => {
		it('should return system health status successfully', async () => {
			systemMonitoringService.checkSystemHealth.mockResolvedValue(mockHealthStatus as any);

			const result = await controller.getSystemHealth(req, res);

			expect(result).toEqual(mockHealthStatus);
			expect(systemMonitoringService.checkSystemHealth).toHaveBeenCalled();
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Health check failed');
			systemMonitoringService.checkSystemHealth.mockRejectedValue(serviceError);

			await expect(controller.getSystemHealth(req, res)).rejects.toThrow(InternalServerError);
		});
	});

	describe('getAlerts', () => {
		const mockAlertsResponse = {
			alerts: [mockAlert],
			total: 1,
			unresolved: 1,
			bySeverity: { info: 0, warning: 1, critical: 0 },
		};

		beforeEach(() => {
			req.query = {
				severity: 'warning',
				limit: '10',
				offset: '0',
			};
		});

		it('should return alerts successfully', async () => {
			systemMonitoringService.getAlerts.mockReturnValue(mockAlertsResponse as any);

			const result = await controller.getAlerts(req, res, req.query as any);

			expect(result).toEqual({
				alerts: mockAlertsResponse.alerts,
				total: mockAlertsResponse.total,
				unresolved: mockAlertsResponse.unresolved,
				bySeverity: mockAlertsResponse.bySeverity,
				pagination: {
					limit: 10,
					offset: 0,
					total: 1,
				},
			});
		});

		it('should validate date range', async () => {
			req.query = {
				startDate: '2024-01-02T00:00:00.000Z',
				endDate: '2024-01-01T00:00:00.000Z',
			};

			await expect(controller.getAlerts(req, res, req.query as any)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should limit date range to 90 days', async () => {
			const start = new Date('2024-01-01');
			const end = new Date('2024-04-01'); // More than 90 days
			req.query = {
				startDate: start.toISOString(),
				endDate: end.toISOString(),
			};

			await expect(controller.getAlerts(req, res, req.query as any)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should validate limit parameter', async () => {
			req.query = { limit: '1000' }; // Exceeds maximum

			await expect(controller.getAlerts(req, res, req.query as any)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should validate offset parameter', async () => {
			req.query = { offset: '-1' }; // Negative offset

			await expect(controller.getAlerts(req, res, req.query as any)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('getMetricsHistory', () => {
		const mockMetricsHistory = [
			{
				timestamps: ['2024-01-01T00:00:00.000Z'],
				cpu: [25.5],
				memory: [50.0],
				disk: [60.0],
				activeWorkflows: [5],
				queueSize: [10],
			},
		];

		it('should return metrics history successfully', async () => {
			req.query = { timeRange: '24h' };
			systemMonitoringService.getMetricsHistory.mockReturnValue(mockMetricsHistory as any);

			const result = await controller.getMetricsHistory(req, res, req.query);

			expect(result).toEqual(mockMetricsHistory);
			expect(systemMonitoringService.getMetricsHistory).toHaveBeenCalledWith('24h');
		});

		it('should use default time range', async () => {
			req.query = {};
			systemMonitoringService.getMetricsHistory.mockReturnValue(mockMetricsHistory as any);

			await controller.getMetricsHistory(req, res, req.query);

			expect(systemMonitoringService.getMetricsHistory).toHaveBeenCalledWith('24h');
		});

		it('should validate time range parameter', async () => {
			req.query = { timeRange: 'invalid' };

			await expect(controller.getMetricsHistory(req, res, req.query)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('getWorkflowMetrics', () => {
		const mockWorkflowMetrics = {
			workflowId: 'workflow-123',
			workflowName: 'Test Workflow',
			timeRange: '24h',
			executions: [],
			aggregates: {
				totalExecutions: 10,
				successRate: 90,
				averageDuration: 5000,
				averageMemoryUsage: 100000000,
				averageCpuUsage: 15.5,
				peakMemoryUsage: 150000000,
				peakCpuUsage: 25.0,
			},
		};

		it('should return workflow metrics successfully', async () => {
			req.query = { timeRange: '24h' };

			const result = await controller.getWorkflowMetrics(
				req,
				res,
				'workflow-123',
				req.query as any,
			);

			expect(result.workflowId).toBe('workflow-123');
			expect(result.timeRange).toBe('24h');
		});

		it('should throw BadRequestError for empty workflow ID', async () => {
			req.query = { timeRange: '24h' };

			await expect(controller.getWorkflowMetrics(req, res, '', req.query as any)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should validate limit parameter', async () => {
			req.query = { limit: '2000' }; // Exceeds maximum

			await expect(
				controller.getWorkflowMetrics(req, res, 'workflow-123', req.query as any),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getAlertRules', () => {
		const mockAlertRulesResponse = {
			rules: [mockAlertRule],
			total: 1,
			enabled: 1,
		};

		it('should return alert rules successfully', async () => {
			systemMonitoringService.getAlertRules.mockReturnValue(mockAlertRulesResponse as any);

			const result = await controller.getAlertRules(req, res);

			expect(result).toEqual(mockAlertRulesResponse);
			expect(systemMonitoringService.getAlertRules).toHaveBeenCalled();
		});

		it('should throw InternalServerError when service fails', async () => {
			const serviceError = new Error('Failed to get alert rules');
			systemMonitoringService.getAlertRules.mockImplementation(() => {
				throw serviceError;
			});

			await expect(controller.getAlertRules(req, res)).rejects.toThrow(InternalServerError);
		});
	});

	describe('createAlertRule', () => {
		const createAlertRuleData = {
			name: 'High Memory Alert',
			description: 'Alert when memory usage is high',
			type: 'memory' as const,
			metric: 'usagePercent',
			operator: '>' as const,
			threshold: 85,
			severity: 'warning' as const,
			enabled: true,
		};

		beforeEach(() => {
			req.body = createAlertRuleData;
		});

		it('should create alert rule successfully', async () => {
			systemMonitoringService.createAlertRule.mockResolvedValue(mockAlertRule as any);

			const result = await controller.createAlertRule(req, res);

			expect(result).toEqual(mockAlertRule);
			expect(systemMonitoringService.createAlertRule).toHaveBeenCalledWith(createAlertRuleData);
		});

		it('should validate required fields', async () => {
			req.body = { ...createAlertRuleData, name: '' };

			await expect(controller.createAlertRule(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should validate metric field', async () => {
			req.body = { ...createAlertRuleData, metric: '' };

			await expect(controller.createAlertRule(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should validate threshold field', async () => {
			req.body = { ...createAlertRuleData, threshold: undefined };

			await expect(controller.createAlertRule(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should validate webhook URL when webhook notifications enabled', async () => {
			req.body = {
				...createAlertRuleData,
				notifications: { webhook: true, email: false },
			};

			await expect(controller.createAlertRule(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should handle service errors', async () => {
			const serviceError = new Error('Failed to create alert rule');
			systemMonitoringService.createAlertRule.mockRejectedValue(serviceError);

			await expect(controller.createAlertRule(req, res)).rejects.toThrow(InternalServerError);
		});
	});

	describe('updateAlertRule', () => {
		const updateAlertRuleData = {
			name: 'Updated Alert Rule',
			threshold: 90,
		};

		beforeEach(() => {
			req.body = updateAlertRuleData;
		});

		it('should update alert rule successfully', async () => {
			systemMonitoringService.updateAlertRule.mockResolvedValue(mockAlertRule as any);

			const result = await controller.updateAlertRule(req, res, 'rule-123');

			expect(result).toEqual(mockAlertRule);
			expect(systemMonitoringService.updateAlertRule).toHaveBeenCalledWith(
				'rule-123',
				updateAlertRuleData,
			);
		});

		it('should throw BadRequestError for empty rule ID', async () => {
			await expect(controller.updateAlertRule(req, res, '')).rejects.toThrow(BadRequestError);
		});

		it('should validate name field', async () => {
			req.body = { ...updateAlertRuleData, name: '' };

			await expect(controller.updateAlertRule(req, res, 'rule-123')).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should throw NotFoundError when rule not found', async () => {
			const serviceError = new Error("Alert rule with ID 'rule-123' not found");
			systemMonitoringService.updateAlertRule.mockRejectedValue(serviceError);

			await expect(controller.updateAlertRule(req, res, 'rule-123')).rejects.toThrow(NotFoundError);
		});
	});

	describe('deleteAlertRule', () => {
		it('should delete alert rule successfully', async () => {
			systemMonitoringService.deleteAlertRule.mockResolvedValue();

			const result = await controller.deleteAlertRule(req, res, 'rule-123');

			expect(result).toEqual({
				success: true,
				message: 'Alert rule deleted successfully',
			});
			expect(systemMonitoringService.deleteAlertRule).toHaveBeenCalledWith('rule-123');
		});

		it('should throw BadRequestError for empty rule ID', async () => {
			await expect(controller.deleteAlertRule(req, res, '')).rejects.toThrow(BadRequestError);
		});

		it('should throw NotFoundError when rule not found', async () => {
			const serviceError = new Error("Alert rule with ID 'rule-123' not found");
			systemMonitoringService.deleteAlertRule.mockRejectedValue(serviceError);

			await expect(controller.deleteAlertRule(req, res, 'rule-123')).rejects.toThrow(NotFoundError);
		});
	});

	describe('resolveAlert', () => {
		it('should resolve alert successfully', async () => {
			const result = await controller.resolveAlert(req, res, 'alert-123');

			expect(result).toEqual({
				success: true,
				message: 'Alert resolved successfully',
			});
		});

		it('should throw BadRequestError for empty alert ID', async () => {
			await expect(controller.resolveAlert(req, res, '')).rejects.toThrow(BadRequestError);
		});
	});

	describe('getMonitoringConfig', () => {
		it('should return monitoring configuration successfully', async () => {
			const result = await controller.getMonitoringConfig(req, res);

			expect(result).toHaveProperty('enabled');
			expect(result).toHaveProperty('interval');
			expect(result).toHaveProperty('alerts');
			expect(result).toHaveProperty('metrics');
		});
	});

	describe('updateMonitoringConfig', () => {
		const configUpdate = {
			enabled: true,
			interval: 60000,
			alerts: {
				thresholds: {
					cpu: { warning: 75, critical: 90 },
				},
			},
		};

		beforeEach(() => {
			req.body = configUpdate;
		});

		it('should update monitoring configuration successfully', async () => {
			const result = await controller.updateMonitoringConfig(req, res);

			expect(result.enabled).toBe(true);
			expect(result.interval).toBe(60000);
		});

		it('should validate interval range', async () => {
			req.body = { interval: 1000 }; // Too low

			await expect(controller.updateMonitoringConfig(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should validate retention period', async () => {
			req.body = { retentionPeriod: 1000 }; // Too low

			await expect(controller.updateMonitoringConfig(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should validate CPU thresholds', async () => {
			req.body = {
				alerts: {
					thresholds: {
						cpu: { warning: 95, critical: 90 }, // Warning higher than critical
					},
				},
			};

			await expect(controller.updateMonitoringConfig(req, res)).rejects.toThrow(BadRequestError);
		});

		it('should validate threshold ranges', async () => {
			req.body = {
				alerts: {
					thresholds: {
						memory: { warning: 150, critical: 200 }, // Over 100%
					},
				},
			};

			await expect(controller.updateMonitoringConfig(req, res)).rejects.toThrow(BadRequestError);
		});
	});

	describe('testAlert', () => {
		beforeEach(() => {
			req.body = {
				type: 'cpu',
				severity: 'warning',
			};
		});

		it('should create test alert successfully', async () => {
			const result = await controller.testAlert(req, res);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Test alert created successfully');
			expect(result.alertId).toMatch(/^test_\d+$/);
		});

		it('should use default values for missing parameters', async () => {
			req.body = {};

			const result = await controller.testAlert(req, res);

			expect(result.success).toBe(true);
		});
	});
});
