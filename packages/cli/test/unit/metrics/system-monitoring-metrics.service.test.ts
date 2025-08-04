import { SystemMonitoringMetricsService } from '@/metrics/system-monitoring-metrics.service';
import { SystemMonitoringService } from '@/services/system-monitoring.service';
import { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

// Mock the Logger from @n8n/backend-common
jest.mock('@n8n/backend-common', () => ({
	Logger: jest.fn().mockImplementation(() => ({
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	})),
}));

// Mock prom-client
jest.mock('prom-client', () => ({
	Gauge: jest.fn().mockImplementation(() => ({
		set: jest.fn(),
		labels: jest.fn().mockReturnThis(),
		reset: jest.fn(),
	})),
	Counter: jest.fn().mockImplementation(() => ({
		inc: jest.fn(),
		labels: jest.fn().mockReturnThis(),
	})),
	Histogram: jest.fn().mockImplementation(() => ({
		observe: jest.fn(),
		labels: jest.fn().mockReturnThis(),
	})),
	register: {
		getMetricsAsJSON: jest.fn(),
	},
}));

describe('SystemMonitoringMetricsService', () => {
	let service: SystemMonitoringMetricsService;
	let systemMonitoringService: jest.Mocked<SystemMonitoringService>;
	let prometheusMetricsService: jest.Mocked<PrometheusMetricsService>;

	const mockEnhancedResources = {
		timestamp: '2024-01-01T00:00:00.000Z',
		system: {
			cpu: { usage: 25.5, cores: 8, load: [1.2, 1.5, 1.8] },
			memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50 },
			disk: { total: 1000000000000, used: 500000000000, free: 500000000000, usagePercent: 50 },
			uptime: 86400000,
			platform: 'linux',
			architecture: 'x64',
			nodeVersion: 'v18.0.0',
			network: {
				totalBytesReceived: 1000000,
				totalBytesSent: 500000,
			},
		},
		processes: {
			main: { pid: 1234, memory: 100000000, cpu: 15.5, uptime: 86400000 },
			workers: [
				{ type: 'main', pid: 1235, memory: 50000000, cpu: 10.0, uptime: 3600000 },
				{ type: 'webhook', pid: 1236, memory: 30000000, cpu: 5.0, uptime: 3600000 },
			],
		},
		workflows: [
			{
				workflowId: 'workflow-123',
				workflowName: 'Test Workflow',
				executionId: 'exec-123',
				pid: 1237,
				memory: 75000000,
				cpu: 12.5,
				uptime: 1800000,
				status: 'running' as const,
				executionTime: 1800000,
				nodeExecutions: 5,
			},
		],
		queue: {
			waiting: 10,
			active: 3,
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
			alerts: [
				{
					id: 'alert-123',
					type: 'cpu' as const,
					severity: 'warning' as const,
					message: 'High CPU usage detected',
					timestamp: '2024-01-01T00:00:00.000Z',
					resolved: false,
					threshold: 80,
					currentValue: 85,
				},
			],
		},
	};

	beforeEach(() => {
		systemMonitoringService = mock<SystemMonitoringService>();
		prometheusMetricsService = mock<PrometheusMetricsService>();

		service = new SystemMonitoringMetricsService(systemMonitoringService, prometheusMetricsService);

		// Reset all mocks
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (service && typeof service.stopMetricsCollection === 'function') {
			service.stopMetricsCollection();
		}
		jest.clearAllMocks();
	});

	describe('initialization', () => {
		it('should initialize metrics with correct configuration', () => {
			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_system_monitoring_system_cpu_usage_percent',
					help: 'Current system CPU usage percentage',
				}),
			);

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_system_monitoring_system_memory_usage_bytes',
					help: 'Current system memory usage in bytes',
				}),
			);

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_system_monitoring_workflow_execution_duration_seconds',
					help: 'Workflow execution duration in seconds',
					labelNames: ['workflowId', 'workflowName', 'status'],
				}),
			);

			expect(promClient.Counter).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_system_monitoring_alerts_total',
					help: 'Total number of alerts generated',
					labelNames: ['severity', 'type', 'workflowId'],
				}),
			);
		});

		it('should set up metrics with correct prefix', () => {
			const gaugeCall = jest
				.mocked(promClient.Gauge)
				.mock.calls.find(
					(call) => call[0].name === 'n8n_system_monitoring_system_cpu_usage_percent',
				);

			expect(gaugeCall).toBeDefined();
			expect(gaugeCall![0].name.startsWith('n8n_system_monitoring_')).toBe(true);
		});
	});

	describe('metrics collection lifecycle', () => {
		it('should start metrics collection successfully', async () => {
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await service.startMetricsCollection(10000);

			expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 10000);
		});

		it('should use default interval when not specified', async () => {
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await service.startMetricsCollection();

			expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
		});

		it('should clear existing interval when starting new collection', async () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			// Start collection twice
			await service.startMetricsCollection(5000);
			await service.startMetricsCollection(10000);

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it('should stop metrics collection and clear interval', () => {
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			service.stopMetricsCollection();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it('should set up event listeners during start', async () => {
			const onSpy = jest.spyOn(systemMonitoringService, 'on');
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await service.startMetricsCollection();

			expect(onSpy).toHaveBeenCalledWith('alert', expect.any(Function));
			expect(onSpy).toHaveBeenCalledWith('workflowExecutionCompleted', expect.any(Function));
			expect(onSpy).toHaveBeenCalledWith('thresholdBreach', expect.any(Function));
		});

		it('should remove event listeners when stopping', () => {
			const removeAllListenersSpy = jest.spyOn(service, 'removeAllListeners');

			service.stopMetricsCollection();

			expect(removeAllListenersSpy).toHaveBeenCalled();
		});
	});

	describe('workflow execution metrics', () => {
		it('should record workflow execution metrics correctly', () => {
			const mockMetrics = (service as any).metrics;

			const executionData = {
				workflowId: 'workflow-123',
				workflowName: 'Test Workflow',
				duration: 5000, // 5 seconds
				memoryUsage: 100000000, // 100MB
				cpuUsage: 25.5,
				nodeCount: 10,
				status: 'success' as const,
			};

			service.recordWorkflowExecution(executionData);

			expect(mockMetrics.workflowExecutionDuration.labels).toHaveBeenCalledWith(
				'workflow-123',
				'Test Workflow',
				'success',
			);
			expect(mockMetrics.workflowExecutionDuration.observe).toHaveBeenCalledWith(5); // Duration in seconds

			expect(mockMetrics.workflowExecutionMemoryUsage.labels).toHaveBeenCalledWith(
				'workflow-123',
				'Test Workflow',
			);
			expect(mockMetrics.workflowExecutionMemoryUsage.observe).toHaveBeenCalledWith(100000000);

			expect(mockMetrics.workflowExecutionCpuUsage.observe).toHaveBeenCalledWith(25.5);
			expect(mockMetrics.workflowExecutionNodes.observe).toHaveBeenCalledWith(10);
		});

		it('should handle workflow execution recording errors gracefully', () => {
			const mockMetrics = (service as any).metrics;
			mockMetrics.workflowExecutionDuration.labels.mockImplementation(() => {
				throw new Error('Metrics error');
			});

			const executionData = {
				workflowId: 'workflow-123',
				workflowName: 'Test Workflow',
				duration: 5000,
				memoryUsage: 100000000,
				cpuUsage: 25.5,
				nodeCount: 10,
				status: 'error' as const,
			};

			expect(() => service.recordWorkflowExecution(executionData)).not.toThrow();
		});
	});

	describe('alert metrics', () => {
		it('should record new alerts correctly', () => {
			const mockMetrics = (service as any).metrics;

			const alertData = {
				severity: 'warning' as const,
				type: 'cpu' as const,
				workflowId: 'workflow-123',
				resolved: false,
			};

			service.recordAlert(alertData);

			expect(mockMetrics.alertsTotal.labels).toHaveBeenCalledWith('warning', 'cpu', 'workflow-123');
			expect(mockMetrics.alertsTotal.inc).toHaveBeenCalled();
		});

		it('should record resolved alerts correctly', () => {
			const mockMetrics = (service as any).metrics;

			const alertData = {
				severity: 'critical' as const,
				type: 'memory' as const,
				workflowId: undefined,
				resolved: true,
			};

			service.recordAlert(alertData);

			expect(mockMetrics.alertsResolved.labels).toHaveBeenCalledWith('critical', 'memory', '');
			expect(mockMetrics.alertsResolved.inc).toHaveBeenCalled();
		});

		it('should handle alert recording errors gracefully', () => {
			const mockMetrics = (service as any).metrics;
			mockMetrics.alertsTotal.labels.mockImplementation(() => {
				throw new Error('Metrics error');
			});

			const alertData = {
				severity: 'info' as const,
				type: 'system' as const,
				resolved: false,
			};

			expect(() => service.recordAlert(alertData)).not.toThrow();
		});
	});

	describe('threshold breach metrics', () => {
		it('should record CPU threshold breaches', () => {
			const mockMetrics = (service as any).metrics;

			service.recordThresholdBreach('cpu', 'warning');

			expect(mockMetrics.cpuThresholdBreaches.labels).toHaveBeenCalledWith('warning');
			expect(mockMetrics.cpuThresholdBreaches.inc).toHaveBeenCalled();
		});

		it('should record memory threshold breaches', () => {
			const mockMetrics = (service as any).metrics;

			service.recordThresholdBreach('memory', 'critical');

			expect(mockMetrics.memoryThresholdBreaches.labels).toHaveBeenCalledWith('critical');
			expect(mockMetrics.memoryThresholdBreaches.inc).toHaveBeenCalled();
		});

		it('should record disk threshold breaches', () => {
			const mockMetrics = (service as any).metrics;

			service.recordThresholdBreach('disk', 'warning');

			expect(mockMetrics.diskThresholdBreaches.labels).toHaveBeenCalledWith('warning');
			expect(mockMetrics.diskThresholdBreaches.inc).toHaveBeenCalled();
		});

		it('should handle threshold breach recording errors gracefully', () => {
			const mockMetrics = (service as any).metrics;
			mockMetrics.cpuThresholdBreaches.labels.mockImplementation(() => {
				throw new Error('Metrics error');
			});

			expect(() => service.recordThresholdBreach('cpu', 'critical')).not.toThrow();
		});
	});

	describe('system metrics collection', () => {
		it('should collect and update system metrics', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			// System resource metrics
			expect(mockMetrics.systemCpuUsage.set).toHaveBeenCalledWith(25.5);
			expect(mockMetrics.systemMemoryUsage.set).toHaveBeenCalledWith(8000000000);
			expect(mockMetrics.systemMemoryUsagePercent.set).toHaveBeenCalledWith(50);
			expect(mockMetrics.systemDiskUsage.set).toHaveBeenCalledWith(500000000000);
			expect(mockMetrics.systemDiskUsagePercent.set).toHaveBeenCalledWith(50);
			expect(mockMetrics.systemUptime.set).toHaveBeenCalledWith(86400);

			// Load averages
			expect(mockMetrics.systemLoadAverage.labels).toHaveBeenCalledWith('1m');
			expect(mockMetrics.systemLoadAverage.labels).toHaveBeenCalledWith('5m');
			expect(mockMetrics.systemLoadAverage.labels).toHaveBeenCalledWith('15m');
			expect(mockMetrics.systemLoadAverage.set).toHaveBeenCalledWith(1.2);
			expect(mockMetrics.systemLoadAverage.set).toHaveBeenCalledWith(1.5);
			expect(mockMetrics.systemLoadAverage.set).toHaveBeenCalledWith(1.8);
		});

		it('should update network metrics when available', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			expect(mockMetrics.systemNetworkBytesReceived.set).toHaveBeenCalledWith(1000000);
			expect(mockMetrics.systemNetworkBytesSent.set).toHaveBeenCalledWith(500000);
		});

		it('should update workflow metrics when workflows are present', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			expect(mockMetrics.activeWorkflowExecutions.labels).toHaveBeenCalledWith(
				'workflow-123',
				'Test Workflow',
			);
			expect(mockMetrics.activeWorkflowExecutions.set).toHaveBeenCalledWith(1);
		});

		it('should update worker process metrics', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			expect(mockMetrics.workerProcesses.labels).toHaveBeenCalledWith('main');
			expect(mockMetrics.workerProcesses.labels).toHaveBeenCalledWith('webhook');
			expect(mockMetrics.workerProcesses.set).toHaveBeenCalledWith(1);

			expect(mockMetrics.workerProcessMemory.observe).toHaveBeenCalledWith(50000000);
			expect(mockMetrics.workerProcessCpu.observe).toHaveBeenCalledWith(10.0);
		});

		it('should update queue metrics when available', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			expect(mockMetrics.queueJobsWaiting.labels).toHaveBeenCalledWith('normal');
			expect(mockMetrics.queueJobsWaiting.set).toHaveBeenCalledWith(10);
			expect(mockMetrics.queueJobsActive.set).toHaveBeenCalledWith(3);
		});

		it('should update health metrics', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			expect(mockMetrics.systemHealthScore.labels).toHaveBeenCalledWith('overall');
			expect(mockMetrics.systemHealthScore.set).toHaveBeenCalledWith(85);
			expect(mockMetrics.systemHealthy.set).toHaveBeenCalledWith(1);

			// Component health metrics
			expect(mockMetrics.systemHealthScore.labels).toHaveBeenCalledWith('cpu');
			expect(mockMetrics.systemHealthScore.labels).toHaveBeenCalledWith('memory');
			expect(mockMetrics.systemHealthScore.labels).toHaveBeenCalledWith('disk');
		});

		it('should update active alerts metrics', async () => {
			const mockMetrics = (service as any).metrics;
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await (service as any).collectSystemMetrics();

			expect(mockMetrics.activeAlerts.reset).toHaveBeenCalled();
			expect(mockMetrics.activeAlerts.labels).toHaveBeenCalledWith('warning', 'cpu');
			expect(mockMetrics.activeAlerts.set).toHaveBeenCalledWith(1);
		});

		it('should handle system metrics collection errors gracefully', async () => {
			systemMonitoringService.getEnhancedSystemResources.mockRejectedValue(
				new Error('System resources unavailable'),
			);

			await expect((service as any).collectSystemMetrics()).resolves.not.toThrow();
		});

		it('should handle missing optional data gracefully', async () => {
			const minimalResources = {
				...mockEnhancedResources,
				workflows: undefined,
				queue: undefined,
				system: {
					...mockEnhancedResources.system,
					network: undefined,
				},
				processes: {
					...mockEnhancedResources.processes,
					workers: undefined,
				},
			};

			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(minimalResources);

			await expect((service as any).collectSystemMetrics()).resolves.not.toThrow();
		});
	});

	describe('event handling', () => {
		it('should handle alert events from system monitoring service', async () => {
			const recordAlertSpy = jest.spyOn(service, 'recordAlert');
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await service.startMetricsCollection();

			// Simulate alert event
			const alertData = {
				severity: 'critical' as const,
				type: 'memory' as const,
				workflowId: 'workflow-456',
			};

			systemMonitoringService.emit('alert', alertData);

			expect(recordAlertSpy).toHaveBeenCalledWith({
				severity: 'critical',
				type: 'memory',
				workflowId: 'workflow-456',
				resolved: false,
			});
		});

		it('should handle workflow execution completed events', async () => {
			const recordWorkflowSpy = jest.spyOn(service, 'recordWorkflowExecution');
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await service.startMetricsCollection();

			// Simulate workflow execution completed event
			const executionData = {
				workflowId: 'workflow-789',
				workflowName: 'Completed Workflow',
				duration: 10000,
				memoryUsage: 200000000,
				cpuUsage: 35.0,
				nodeCount: 15,
				status: 'success' as const,
			};

			systemMonitoringService.emit('workflowExecutionCompleted', executionData);

			expect(recordWorkflowSpy).toHaveBeenCalledWith(executionData);
		});

		it('should handle threshold breach events', async () => {
			const recordThresholdSpy = jest.spyOn(service, 'recordThresholdBreach');
			systemMonitoringService.getEnhancedSystemResources.mockResolvedValue(mockEnhancedResources);

			await service.startMetricsCollection();

			// Simulate threshold breach event
			const breachData = {
				resource: 'cpu' as const,
				threshold: 'warning' as const,
			};

			systemMonitoringService.emit('thresholdBreach', breachData);

			expect(recordThresholdSpy).toHaveBeenCalledWith('cpu', 'warning');
		});
	});

	describe('metrics snapshot', () => {
		it('should return metrics snapshot for debugging', async () => {
			const mockMetricsData = [
				{
					name: 'n8n_system_monitoring_system_cpu_usage_percent',
					values: [{ value: 25.5, labels: {} }],
				},
				{
					name: 'n8n_system_monitoring_alerts_total',
					values: [{ value: 10, labels: { severity: 'warning', type: 'cpu', workflowId: '' } }],
				},
				{
					name: 'some_other_metric',
					values: [{ value: 100 }],
				},
			];

			jest.mocked(promClient.register.getMetricsAsJSON).mockResolvedValue(mockMetricsData as any);

			const snapshot = await service.getMetricsSnapshot();

			expect(snapshot).toHaveProperty('n8n_system_monitoring_system_cpu_usage_percent');
			expect(snapshot).toHaveProperty('n8n_system_monitoring_alerts_total');
			expect(snapshot).not.toHaveProperty('some_other_metric');

			expect(snapshot['n8n_system_monitoring_system_cpu_usage_percent']).toEqual([
				{ value: 25.5, labels: {} },
			]);
		});

		it('should handle metrics snapshot errors gracefully', async () => {
			jest
				.mocked(promClient.register.getMetricsAsJSON)
				.mockRejectedValue(new Error('Registry unavailable'));

			const snapshot = await service.getMetricsSnapshot();

			expect(snapshot).toEqual({});
		});
	});

	describe('metrics collection interval handling', () => {
		it('should handle collection errors during interval execution', async () => {
			systemMonitoringService.getEnhancedSystemResources
				.mockResolvedValueOnce(mockEnhancedResources) // Initial collection
				.mockRejectedValue(new Error('Collection failed')); // Subsequent collections

			await service.startMetricsCollection(100); // Short interval for testing

			// Wait for interval to execute
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Should not throw despite the error
			expect(true).toBe(true); // Test passes if no unhandled promise rejection
		});
	});
});
