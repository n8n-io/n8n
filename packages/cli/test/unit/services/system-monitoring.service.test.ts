import { SystemMonitoringService } from '@/services/system-monitoring.service';
import { SystemResourcesService } from '@/services/system-resources.service';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { CacheService } from '@/services/cache/cache.service';
import { mock } from 'jest-mock-extended';
import type { IExecutionResponse, IWorkflowExecutionDataProcess } from '@/interfaces';

describe('SystemMonitoringService', () => {
	let service: SystemMonitoringService;
	let systemResourcesService: jest.Mocked<SystemResourcesService>;
	let executionRepository: jest.Mocked<ExecutionRepository>;
	let workflowRepository: jest.Mocked<WorkflowRepository>;
	let cacheService: jest.Mocked<CacheService>;

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

	const mockWorkflowExecutionData: IWorkflowExecutionDataProcess = {
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
	} as any;

	const mockExecutionResult: IExecutionResponse = {
		finished: true,
		data: {
			resultData: {},
			executionData: undefined,
		},
	};

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

		systemResourcesService.getCurrentResources.mockResolvedValue(mockSystemResources as any);
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
				.spyOn(service as any, 'startMonitoring')
				.mockResolvedValue(undefined);

			await service.initialize();

			expect(startMonitoringSpy).toHaveBeenCalled();
		});

		it('should handle initialization errors gracefully', async () => {
			systemResourcesService.getCurrentResources.mockRejectedValue(new Error('System error'));
			const loadConfigSpy = jest
				.spyOn(service as any, 'loadConfiguration')
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
			// Add a workflow execution to track
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
			// Add some critical alerts to trigger unhealthy status
			const alerts = (service as any).alerts;
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
			} as any);

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

			const executions = (service as any).workflowExecutions;
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

			expect(() => service.trackWorkflowExecutionStart(invalidData as any)).not.toThrow();

			const executions = (service as any).workflowExecutions;
			expect(executions.size).toBe(0);
		});

		it('should track workflow execution end and cleanup', async () => {
			// Start tracking
			service.trackWorkflowExecutionStart(mockWorkflowExecutionData);

			// Mock some time passing
			jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);

			await service.trackWorkflowExecutionEnd('exec-123', mockExecutionResult);

			const executions = (service as any).workflowExecutions;
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

			// Mock high resource usage
			const highResourcesResult = {
				...mockExecutionResult,
			};

			// Start tracking with high memory usage
			service.trackWorkflowExecutionStart(mockWorkflowExecutionData);

			// Mock process memory usage
			const originalMemoryUsage = process.memoryUsage;
			process.memoryUsage = jest.fn().mockReturnValue({
				rss: 1000000000, // High memory usage
				heapTotal: 500000000,
				heapUsed: 400000000,
				external: 50000000,
				arrayBuffers: 10000000,
			});

			// Mock long execution time
			jest
				.spyOn(Date, 'now')
				.mockReturnValueOnce(1000000) // Start time
				.mockReturnValueOnce(1600000); // End time (10 minutes later)

			await service.trackWorkflowExecutionEnd('exec-123', highResourcesResult);

			// Restore original function
			process.memoryUsage = originalMemoryUsage;
		});
	});

	describe('alert management', () => {
		it('should filter and paginate alerts correctly', () => {
			// Add some test alerts
			const alerts = (service as any).alerts;
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
			const alerts = (service as any).alerts;
			const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
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
				type: 'cpu' as const,
				metric: 'usage',
				operator: '>' as const,
				threshold: 85,
				severity: 'warning' as const,
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
			// First create a rule
			const ruleData = {
				name: 'Test Rule',
				type: 'memory' as const,
				metric: 'usagePercent',
				operator: '>' as const,
				threshold: 80,
				severity: 'info' as const,
				enabled: true,
				notifications: { email: false, webhook: false },
			};

			const created = await service.createAlertRule(ruleData);

			// Then update it
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
				type: 'disk' as const,
				metric: 'usagePercent',
				operator: '>' as const,
				threshold: 90,
				severity: 'critical' as const,
				enabled: true,
				notifications: { email: false, webhook: false },
			};

			const created = await service.createAlertRule(ruleData);

			await expect(service.deleteAlertRule(created.id)).resolves.not.toThrow();

			// Verify it's deleted
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
			const rules = (service as any).alertRules;
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

			expect(result.rules).toHaveLength(4); // 2 default + 2 test rules
			expect(result.total).toBe(4);
			expect(result.enabled).toBe(3); // 2 default enabled + 1 test enabled
		});
	});

	describe('metrics history', () => {
		it('should return metrics history for different time ranges', () => {
			const metricsHistory = (service as any).metricsHistory;
			const now = Date.now();

			// Add metrics from different time periods
			metricsHistory.push(
				{
					timestamps: [new Date(now - 30 * 60 * 1000).toISOString()], // 30 minutes ago
					cpu: [25],
					memory: [50],
					disk: [60],
					activeWorkflows: [2],
					queueSize: [5],
				},
				{
					timestamps: [new Date(now - 2 * 60 * 60 * 1000).toISOString()], // 2 hours ago
					cpu: [30],
					memory: [55],
					disk: [65],
					activeWorkflows: [3],
					queueSize: [8],
				},
				{
					timestamps: [new Date(now - 25 * 60 * 60 * 1000).toISOString()], // 25 hours ago
					cpu: [20],
					memory: [45],
					disk: [55],
					activeWorkflows: [1],
					queueSize: [3],
				},
			);

			// Test 1 hour range
			const oneHour = service.getMetricsHistory('1h');
			expect(oneHour).toHaveLength(1);

			// Test 24 hour range
			const twentyFourHours = service.getMetricsHistory('24h');
			expect(twentyFourHours).toHaveLength(2);

			// Test 7 day range
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

			await (service as any).startMonitoring();

			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				30000, // Default interval
			);
		});

		it('should stop monitoring and clear intervals', () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			// Set an interval first
			(service as any).monitoringInterval = setInterval(() => {}, 1000);

			service.stopMonitoring();

			expect(clearIntervalSpy).toHaveBeenCalled();
			expect((service as any).monitoringInterval).toBeUndefined();
		});

		it('should handle monitoring cycle errors gracefully', async () => {
			const collectMetricsSpy = jest
				.spyOn(service as any, 'collectMetrics')
				.mockRejectedValue(new Error('Collection failed'));

			// Start monitoring
			await (service as any).startMonitoring();

			// Trigger the monitoring cycle manually
			const monitoringCallback = jest.mocked(setInterval).mock.calls[0][0] as Function;

			// Should not throw despite the error
			await expect(monitoringCallback()).resolves.not.toThrow();
		});
	});

	describe('health analysis', () => {
		it('should analyze CPU health correctly', () => {
			const cpuData = { usage: 85, cores: 8, load: [2.0, 1.8, 1.5] };
			const health = (service as any).analyzeCpuHealth(cpuData);

			expect(health.healthy).toBe(false);
			expect(health.score).toBeLessThan(100);
			expect(health.issues).toContain('High CPU usage');
		});

		it('should analyze memory health correctly', () => {
			const memoryData = { usagePercent: 92, total: 16000000000, used: 14720000000 };
			const health = (service as any).analyzeMemoryHealth(memoryData);

			expect(health.healthy).toBe(false);
			expect(health.score).toBeLessThan(100);
			expect(health.issues).toContain('High memory usage');
		});

		it('should analyze disk health correctly', () => {
			const diskData = { usagePercent: 98, total: 1000000000000, used: 980000000000 };
			const health = (service as any).analyzeDiskHealth(diskData);

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

			const recommendations = (service as any).generateHealthRecommendations(healthData);

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
			// Mock the retention period to be 7 days
			const config = (service as any).config;
			config.retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days

			const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago (older than retention)
			const recentTimestamp = new Date().toISOString();

			// Clear existing alerts and metrics
			const alerts = (service as any).alerts;
			const metricsHistory = (service as any).metricsHistory;
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

			await (service as any).cleanupOldData();

			expect(alerts).toHaveLength(1);
			expect(alerts[0].id).toBe('recent-alert');
			expect(metricsHistory).toHaveLength(1);
			expect(metricsHistory[0].timestamps[0]).toBe(recentTimestamp);
		});
	});
});
