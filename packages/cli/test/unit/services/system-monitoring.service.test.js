'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const system_monitoring_service_1 = require('@/services/system-monitoring.service');
const jest_mock_extended_1 = require('jest-mock-extended');
describe('SystemMonitoringService', () => {
	let service;
	let systemResourcesService;
	let executionRepository;
	let workflowRepository;
	let cacheService;
	const mockSystemResources = {
		system: {
			cpu: { usage: 25.5, cores: 8, load: [1.2, 1.5, 1.8] },
			memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50 },
			disk: { total: 1000000000000, used: 500000000000, free: 500000000000, usagePercent: 50 },
		},
		processes: {
			main: { pid: 1234, memory: 100000000, cpu: 15.5, uptime: 86400000 },
		},
		queue: {
			waiting: 5,
			active: 2,
		},
	};
	const mockWorkflowExecutionData = {
		executionId: 'exec-123',
		workflowData: {
			id: 'workflow-123',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	};
	const mockExecutionResult = {
		finished: true,
		data: {
			resultData: {},
			executionData: undefined,
		},
	};
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
		systemResourcesService.getCurrentResources.mockResolvedValue(mockSystemResources);
	});
	afterEach(() => {
		service.stopMonitoring();
		jest.clearAllMocks();
	});
	describe('initialize', () => {
		it('should initialize the monitoring service successfully', async () => {
			await expect(service.initialize()).resolves.not.toThrow();
		});
		it('should start monitoring when enabled in config', async () => {
			const startMonitoringSpy = jest
				.spyOn(service, 'startMonitoring')
				.mockResolvedValue(undefined);
			await service.initialize();
			expect(startMonitoringSpy).toHaveBeenCalled();
		});
		it('should handle initialization errors gracefully', async () => {
			systemResourcesService.getCurrentResources.mockRejectedValue(new Error('System error'));
			const loadConfigSpy = jest
				.spyOn(service, 'loadConfiguration')
				.mockRejectedValue(new Error('Config error'));
			await expect(service.initialize()).rejects.toThrow(
				'Failed to initialize system monitoring service',
			);
		});
	});
	describe('getEnhancedSystemResources', () => {
		it('should return enhanced system resources with default options', async () => {
			const result = await service.getEnhancedSystemResources();
			expect(result).toHaveProperty('timestamp');
			expect(result).toHaveProperty('system');
			expect(result).toHaveProperty('processes');
			expect(result).toHaveProperty('health');
			expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});
		it('should include workflows when requested', async () => {
			service.trackWorkflowExecutionStart(mockWorkflowExecutionData);
			const result = await service.getEnhancedSystemResources({
				includeWorkflows: true,
			});
			expect(result.workflows).toBeDefined();
			expect(Array.isArray(result.workflows)).toBe(true);
		});
		it('should include all optional components when requested', async () => {
			const result = await service.getEnhancedSystemResources({
				includeWorkers: true,
				includeQueue: true,
				includeWorkflows: true,
				includeNetworking: true,
				includeDetailed: true,
			});
			expect(result).toHaveProperty('system');
			expect(result).toHaveProperty('processes');
			expect(result).toHaveProperty('queue');
			expect(result).toHaveProperty('health');
		});
		it('should handle service errors gracefully', async () => {
			systemResourcesService.getCurrentResources.mockRejectedValue(
				new Error('Service unavailable'),
			);
			await expect(service.getEnhancedSystemResources()).rejects.toThrow(
				'Failed to get enhanced system resources',
			);
		});
	});
	describe('checkSystemHealth', () => {
		it('should return comprehensive system health status', async () => {
			const health = await service.checkSystemHealth();
			expect(health).toHaveProperty('healthy');
			expect(health).toHaveProperty('overallScore');
			expect(health).toHaveProperty('components');
			expect(health).toHaveProperty('recommendations');
			expect(health).toHaveProperty('alerts');
			expect(health.components).toHaveProperty('cpu');
			expect(health.components).toHaveProperty('memory');
			expect(health.components).toHaveProperty('disk');
			expect(health.components).toHaveProperty('network');
			expect(health.components).toHaveProperty('workflows');
			expect(typeof health.overallScore).toBe('number');
			expect(health.overallScore).toBeGreaterThanOrEqual(0);
			expect(health.overallScore).toBeLessThanOrEqual(100);
		});
		it('should return unhealthy status when system resources are high', async () => {
			const alerts = service.alerts;
			alerts.push({
				id: 'critical-alert',
				type: 'cpu',
				severity: 'critical',
				message: 'Critical CPU usage',
				timestamp: new Date().toISOString(),
				resolved: false,
				threshold: 90,
				currentValue: 95,
			});
			systemResourcesService.getCurrentResources.mockResolvedValue({
				...mockSystemResources,
				system: {
					...mockSystemResources.system,
					cpu: { usage: 95, cores: 8, load: [3.0, 2.8, 2.5] },
					memory: { ...mockSystemResources.system.memory, usagePercent: 98 },
				},
			});
			const health = await service.checkSystemHealth();
			expect(health.healthy).toBe(false);
			expect(health.overallScore).toBeLessThan(70);
			expect(health.components.cpu.healthy).toBe(false);
			expect(health.components.memory.healthy).toBe(false);
		});
		it('should handle health check errors and return fallback status', async () => {
			systemResourcesService.getCurrentResources.mockRejectedValue(
				new Error('Health check failed'),
			);
			const health = await service.checkSystemHealth();
			expect(health.healthy).toBe(false);
			expect(health.overallScore).toBe(0);
			expect(health.recommendations).toContain('Check system monitoring configuration');
		});
	});
	describe('workflow execution tracking', () => {
		it('should track workflow execution start', () => {
			service.trackWorkflowExecutionStart(mockWorkflowExecutionData);
			const executions = service.workflowExecutions;
			expect(executions.has('exec-123')).toBe(true);
			const execution = executions.get('exec-123');
			expect(execution.workflowId).toBe('workflow-123');
			expect(execution.executionId).toBe('exec-123');
			expect(execution.startTime).toBeLessThanOrEqual(Date.now());
		});
		it('should handle missing executionId gracefully', () => {
			const invalidData = {
				...mockWorkflowExecutionData,
				executionId: undefined,
			};
			expect(() => service.trackWorkflowExecutionStart(invalidData)).not.toThrow();
			const executions = service.workflowExecutions;
			expect(executions.size).toBe(0);
		});
		it('should track workflow execution end and cleanup', async () => {
			service.trackWorkflowExecutionStart(mockWorkflowExecutionData);
			jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
			await service.trackWorkflowExecutionEnd('exec-123', mockExecutionResult);
			const executions = service.workflowExecutions;
			expect(executions.has('exec-123')).toBe(false);
		});
		it('should handle execution end for non-tracked executions', async () => {
			await expect(
				service.trackWorkflowExecutionEnd('unknown-exec', mockExecutionResult),
			).resolves.not.toThrow();
		});
		it('should emit events for workflow execution tracking', async () => {
			const alertSpy = jest.fn();
			service.on('alert', alertSpy);
			const highResourcesResult = {
				...mockExecutionResult,
			};
			service.trackWorkflowExecutionStart(mockWorkflowExecutionData);
			const originalMemoryUsage = process.memoryUsage;
			process.memoryUsage = jest.fn().mockReturnValue({
				rss: 1000000000,
				heapTotal: 500000000,
				heapUsed: 400000000,
				external: 50000000,
				arrayBuffers: 10000000,
			});
			jest.spyOn(Date, 'now').mockReturnValueOnce(1000000).mockReturnValueOnce(1600000);
			await service.trackWorkflowExecutionEnd('exec-123', highResourcesResult);
			process.memoryUsage = originalMemoryUsage;
		});
	});
	describe('alert management', () => {
		it('should filter and paginate alerts correctly', () => {
			const alerts = service.alerts;
			alerts.push(
				{
					id: 'alert-1',
					type: 'cpu',
					severity: 'warning',
					message: 'High CPU usage',
					timestamp: new Date().toISOString(),
					resolved: false,
				},
				{
					id: 'alert-2',
					type: 'memory',
					severity: 'critical',
					message: 'High memory usage',
					timestamp: new Date().toISOString(),
					resolved: true,
				},
			);
			const result = service.getAlerts({
				severity: 'warning',
				limit: 10,
				offset: 0,
			});
			expect(result.alerts).toHaveLength(1);
			expect(result.alerts[0].severity).toBe('warning');
			expect(result.total).toBe(1);
			expect(result.unresolved).toBe(1);
			expect(result.bySeverity.warning).toBe(1);
			expect(result.bySeverity.critical).toBe(1);
		});
		it('should filter alerts by date range', () => {
			const alerts = service.alerts;
			const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
			const recentDate = new Date();
			alerts.push(
				{
					id: 'alert-old',
					type: 'cpu',
					severity: 'info',
					timestamp: oldDate.toISOString(),
					resolved: false,
				},
				{
					id: 'alert-recent',
					type: 'memory',
					severity: 'info',
					timestamp: recentDate.toISOString(),
					resolved: false,
				},
			);
			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const result = service.getAlerts({
				startDate: yesterday,
				endDate: new Date(),
			});
			expect(result.alerts).toHaveLength(1);
			expect(result.alerts[0].id).toBe('alert-recent');
		});
		it('should return empty results for no matching alerts', () => {
			const result = service.getAlerts({
				severity: 'critical',
				type: 'disk',
			});
			expect(result.alerts).toHaveLength(0);
			expect(result.total).toBe(0);
			expect(result.unresolved).toBe(0);
		});
	});
	describe('alert rules management', () => {
		it('should create alert rules successfully', async () => {
			const ruleData = {
				name: 'High CPU Alert',
				description: 'Alert when CPU usage is high',
				type: 'cpu',
				metric: 'usage',
				operator: '>',
				threshold: 85,
				severity: 'warning',
				enabled: true,
				notifications: { email: false, webhook: false },
			};
			const result = await service.createAlertRule(ruleData);
			expect(result).toHaveProperty('id');
			expect(result.name).toBe(ruleData.name);
			expect(result.threshold).toBe(ruleData.threshold);
			expect(result.enabled).toBe(true);
			expect(result.triggerCount).toBe(0);
		});
		it('should update alert rules successfully', async () => {
			const ruleData = {
				name: 'Test Rule',
				type: 'memory',
				metric: 'usagePercent',
				operator: '>',
				threshold: 80,
				severity: 'info',
				enabled: true,
				notifications: { email: false, webhook: false },
			};
			const created = await service.createAlertRule(ruleData);
			const updateData = {
				name: 'Updated Test Rule',
				threshold: 90,
			};
			const updated = await service.updateAlertRule(created.id, updateData);
			expect(updated.name).toBe('Updated Test Rule');
			expect(updated.threshold).toBe(90);
			expect(updated.id).toBe(created.id);
		});
		it('should throw error when updating non-existent rule', async () => {
			await expect(service.updateAlertRule('non-existent-id', { name: 'Test' })).rejects.toThrow(
				"Alert rule with ID 'non-existent-id' not found",
			);
		});
		it('should delete alert rules successfully', async () => {
			const ruleData = {
				name: 'To Delete',
				type: 'disk',
				metric: 'usagePercent',
				operator: '>',
				threshold: 90,
				severity: 'critical',
				enabled: true,
				notifications: { email: false, webhook: false },
			};
			const created = await service.createAlertRule(ruleData);
			await expect(service.deleteAlertRule(created.id)).resolves.not.toThrow();
			await expect(service.updateAlertRule(created.id, { name: 'Test' })).rejects.toThrow(
				"Alert rule with ID '" + created.id + "' not found",
			);
		});
		it('should throw error when deleting non-existent rule', async () => {
			await expect(service.deleteAlertRule('non-existent-id')).rejects.toThrow(
				"Alert rule with ID 'non-existent-id' not found",
			);
		});
		it('should get all alert rules with statistics', () => {
			const rules = service.alertRules;
			rules.push(
				{
					id: 'rule-1',
					name: 'Enabled Rule',
					enabled: true,
					createdAt: new Date(),
					updatedAt: new Date(),
					type: 'cpu',
					metric: 'usage',
					operator: '>',
					threshold: 80,
					severity: 'warning',
					notifications: { email: false, webhook: false },
					triggerCount: 0,
				},
				{
					id: 'rule-2',
					name: 'Disabled Rule',
					enabled: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					type: 'memory',
					metric: 'usagePercent',
					operator: '>',
					threshold: 85,
					severity: 'info',
					notifications: { email: false, webhook: false },
					triggerCount: 0,
				},
			);
			const result = service.getAlertRules();
			expect(result.rules).toHaveLength(4);
			expect(result.total).toBe(4);
			expect(result.enabled).toBe(3);
		});
	});
	describe('metrics history', () => {
		it('should return metrics history for different time ranges', () => {
			const metricsHistory = service.metricsHistory;
			const now = Date.now();
			metricsHistory.push(
				{
					timestamps: [new Date(now - 30 * 60 * 1000).toISOString()],
					cpu: [25],
					memory: [50],
					disk: [60],
					activeWorkflows: [2],
					queueSize: [5],
				},
				{
					timestamps: [new Date(now - 2 * 60 * 60 * 1000).toISOString()],
					cpu: [30],
					memory: [55],
					disk: [65],
					activeWorkflows: [3],
					queueSize: [8],
				},
				{
					timestamps: [new Date(now - 25 * 60 * 60 * 1000).toISOString()],
					cpu: [20],
					memory: [45],
					disk: [55],
					activeWorkflows: [1],
					queueSize: [3],
				},
			);
			const oneHour = service.getMetricsHistory('1h');
			expect(oneHour).toHaveLength(1);
			const twentyFourHours = service.getMetricsHistory('24h');
			expect(twentyFourHours).toHaveLength(2);
			const sevenDays = service.getMetricsHistory('7d');
			expect(sevenDays).toHaveLength(3);
		});
		it('should handle invalid time ranges with default', () => {
			const result = service.getMetricsHistory('invalid-range');
			expect(Array.isArray(result)).toBe(true);
		});
	});
	describe('monitoring lifecycle', () => {
		it('should start monitoring with correct interval', async () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');
			await service.startMonitoring();
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
		});
		it('should stop monitoring and clear intervals', () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			service.monitoringInterval = setInterval(() => {}, 1000);
			service.stopMonitoring();
			expect(clearIntervalSpy).toHaveBeenCalled();
			expect(service.monitoringInterval).toBeUndefined();
		});
		it('should handle monitoring cycle errors gracefully', async () => {
			const collectMetricsSpy = jest
				.spyOn(service, 'collectMetrics')
				.mockRejectedValue(new Error('Collection failed'));
			await service.startMonitoring();
			const monitoringCallback = jest.mocked(setInterval).mock.calls[0][0];
			await expect(monitoringCallback()).resolves.not.toThrow();
		});
	});
	describe('health analysis', () => {
		it('should analyze CPU health correctly', () => {
			const cpuData = { usage: 85, cores: 8, load: [2.0, 1.8, 1.5] };
			const health = service.analyzeCpuHealth(cpuData);
			expect(health.healthy).toBe(false);
			expect(health.score).toBeLessThan(100);
			expect(health.issues).toContain('High CPU usage');
		});
		it('should analyze memory health correctly', () => {
			const memoryData = { usagePercent: 92, total: 16000000000, used: 14720000000 };
			const health = service.analyzeMemoryHealth(memoryData);
			expect(health.healthy).toBe(false);
			expect(health.score).toBeLessThan(100);
			expect(health.issues).toContain('High memory usage');
		});
		it('should analyze disk health correctly', () => {
			const diskData = { usagePercent: 98, total: 1000000000000, used: 980000000000 };
			const health = service.analyzeDiskHealth(diskData);
			expect(health.healthy).toBe(false);
			expect(health.score).toBeLessThan(100);
			expect(health.issues).toContain('Very high disk usage');
		});
		it('should generate appropriate health recommendations', () => {
			const healthData = {
				cpu: { healthy: false, score: 60, issues: ['High CPU usage'] },
				memory: { healthy: false, score: 50, issues: ['High memory usage'] },
				disk: { healthy: true, score: 90, issues: [] },
				workflows: { healthy: true, score: 85, issues: [] },
			};
			const recommendations = service.generateHealthRecommendations(healthData);
			expect(recommendations).toContain(
				'Consider reducing CPU-intensive workflows or scaling horizontally',
			);
			expect(recommendations).toContain(
				'Consider increasing system memory or optimizing memory usage',
			);
			expect(recommendations).not.toContain(
				'Clean up old execution data or increase storage capacity',
			);
		});
	});
	describe('data cleanup', () => {
		it('should clean up old alerts and metrics', async () => {
			const config = service.config;
			config.retentionPeriod = 7 * 24 * 60 * 60 * 1000;
			const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
			const recentTimestamp = new Date().toISOString();
			const alerts = service.alerts;
			const metricsHistory = service.metricsHistory;
			alerts.length = 0;
			metricsHistory.length = 0;
			alerts.push(
				{ id: 'old-alert', timestamp: oldTimestamp, resolved: false },
				{ id: 'recent-alert', timestamp: recentTimestamp, resolved: false },
			);
			metricsHistory.push(
				{
					timestamps: [oldTimestamp],
					cpu: [25],
					memory: [50],
					disk: [60],
					activeWorkflows: [1],
					queueSize: [2],
				},
				{
					timestamps: [recentTimestamp],
					cpu: [30],
					memory: [55],
					disk: [65],
					activeWorkflows: [2],
					queueSize: [3],
				},
			);
			await service.cleanupOldData();
			expect(alerts).toHaveLength(1);
			expect(alerts[0].id).toBe('recent-alert');
			expect(metricsHistory).toHaveLength(1);
			expect(metricsHistory[0].timestamps[0]).toBe(recentTimestamp);
		});
	});
});
//# sourceMappingURL=system-monitoring.service.test.js.map
