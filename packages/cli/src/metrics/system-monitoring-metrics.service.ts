import { Service } from '@n8n/di';
import { LoggerProxy } from 'n8n-workflow';
import promClient, { Gauge, Counter, Histogram } from 'prom-client';
import { SystemMonitoringService } from '@/services/system-monitoring.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';
import { EventEmitter } from 'events';

interface SystemMonitoringMetrics {
	// System resource gauges
	systemCpuUsage: Gauge<string>;
	systemMemoryUsage: Gauge<string>;
	systemMemoryUsagePercent: Gauge<string>;
	systemDiskUsage: Gauge<string>;
	systemDiskUsagePercent: Gauge<string>;
	systemNetworkBytesReceived: Gauge<string>;
	systemNetworkBytesSent: Gauge<string>;
	systemUptime: Gauge<string>;
	systemLoadAverage: Gauge<'period'>;

	// Workflow monitoring metrics
	workflowExecutionDuration: Histogram<'workflowId' | 'workflowName' | 'status'>;
	workflowExecutionMemoryUsage: Histogram<'workflowId' | 'workflowName'>;
	workflowExecutionCpuUsage: Histogram<'workflowId' | 'workflowName'>;
	activeWorkflowExecutions: Gauge<'workflowId' | 'workflowName'>;
	workflowExecutionNodes: Histogram<'workflowId' | 'workflowName'>;

	// Alert metrics
	activeAlerts: Gauge<'severity' | 'type'>;
	alertsTotal: Counter<'severity' | 'type' | 'workflowId'>;
	alertsResolved: Counter<'severity' | 'type' | 'workflowId'>;

	// System health metrics
	systemHealthScore: Gauge<'component'>;
	systemHealthy: Gauge<'component'>;

	// Resource threshold metrics
	cpuThresholdBreaches: Counter<'threshold'>;
	memoryThresholdBreaches: Counter<'threshold'>;
	diskThresholdBreaches: Counter<'threshold'>;

	// Process metrics
	workerProcesses: Gauge<'type'>;
	workerProcessMemory: Histogram<'type'>;
	workerProcessCpu: Histogram<'type'>;

	// Queue metrics (enhanced)
	queueJobsWaiting: Gauge<'priority'>;
	queueJobsActive: Gauge<'priority'>;
	queueJobProcessingTime: Histogram<'priority'>;
	queueJobsCompleted: Counter<'priority' | 'status'>;
	queueJobsFailed: Counter<'priority' | 'reason'>;

	// Network interface metrics
	networkInterfaceStats: Gauge<'interface' | 'direction' | 'metric'>;

	// Disk I/O metrics
	diskIOOperations: Counter<'device' | 'operation'>;
	diskIOBytes: Counter<'device' | 'operation'>;
	diskIOTime: Histogram<'device' | 'operation'>;

	// Node-level performance metrics
	nodeExecutionDuration: Histogram<'workflowId' | 'nodeId' | 'nodeType' | 'status'>;
	nodeExecutionMemoryUsage: Histogram<'workflowId' | 'nodeId' | 'nodeType'>;
	nodeExecutionCpuUsage: Histogram<'workflowId' | 'nodeId' | 'nodeType'>;
	nodeExecutionDataItems: Histogram<'workflowId' | 'nodeId' | 'nodeType' | 'direction'>;
	nodeExecutionErrors: Counter<'workflowId' | 'nodeId' | 'nodeType' | 'errorType'>;
	nodeExecutionBottlenecks: Gauge<'workflowId' | 'nodeId' | 'nodeType'>;
	nodeExecutionActive: Gauge<'workflowId' | 'nodeId' | 'nodeType'>;
}

@Service()
export class SystemMonitoringMetricsService extends EventEmitter {
	private readonly logger = LoggerProxy;
	private metrics: SystemMonitoringMetrics;
	private metricsCollectionInterval?: NodeJS.Timeout;
	private readonly prefix: string;

	constructor(
		private readonly systemMonitoringService: SystemMonitoringService,
		private readonly _prometheusMetricsService: PrometheusMetricsService,
	) {
		super();
		this.prefix = 'n8n_system_monitoring_';
		this.initializeMetrics();
	}

	/**
	 * Initialize all system monitoring metrics
	 */
	private initializeMetrics(): void {
		this.metrics = {
			// System resource gauges
			systemCpuUsage: new promClient.Gauge({
				name: this.prefix + 'system_cpu_usage_percent',
				help: 'Current system CPU usage percentage',
			}),

			systemMemoryUsage: new promClient.Gauge({
				name: this.prefix + 'system_memory_usage_bytes',
				help: 'Current system memory usage in bytes',
			}),

			systemMemoryUsagePercent: new promClient.Gauge({
				name: this.prefix + 'system_memory_usage_percent',
				help: 'Current system memory usage percentage',
			}),

			systemDiskUsage: new promClient.Gauge({
				name: this.prefix + 'system_disk_usage_bytes',
				help: 'Current system disk usage in bytes',
			}),

			systemDiskUsagePercent: new promClient.Gauge({
				name: this.prefix + 'system_disk_usage_percent',
				help: 'Current system disk usage percentage',
			}),

			systemNetworkBytesReceived: new promClient.Gauge({
				name: this.prefix + 'system_network_bytes_received_total',
				help: 'Total network bytes received',
			}),

			systemNetworkBytesSent: new promClient.Gauge({
				name: this.prefix + 'system_network_bytes_sent_total',
				help: 'Total network bytes sent',
			}),

			systemUptime: new promClient.Gauge({
				name: this.prefix + 'system_uptime_seconds',
				help: 'System uptime in seconds',
			}),

			systemLoadAverage: new promClient.Gauge({
				name: this.prefix + 'system_load_average',
				help: 'System load average',
				labelNames: ['period'],
			}),

			// Workflow monitoring metrics
			workflowExecutionDuration: new promClient.Histogram({
				name: this.prefix + 'workflow_execution_duration_seconds',
				help: 'Workflow execution duration in seconds',
				labelNames: ['workflowId', 'workflowName', 'status'],
				buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600, 1800, 3600],
			}),

			workflowExecutionMemoryUsage: new promClient.Histogram({
				name: this.prefix + 'workflow_execution_memory_bytes',
				help: 'Workflow execution memory usage in bytes',
				labelNames: ['workflowId', 'workflowName'],
				buckets: [
					1024 * 1024,
					10 * 1024 * 1024,
					50 * 1024 * 1024,
					100 * 1024 * 1024,
					250 * 1024 * 1024,
					500 * 1024 * 1024,
					1024 * 1024 * 1024,
				],
			}),

			workflowExecutionCpuUsage: new promClient.Histogram({
				name: this.prefix + 'workflow_execution_cpu_percent',
				help: 'Workflow execution CPU usage percentage',
				labelNames: ['workflowId', 'workflowName'],
				buckets: [1, 5, 10, 25, 50, 75, 90, 100],
			}),

			activeWorkflowExecutions: new promClient.Gauge({
				name: this.prefix + 'active_workflow_executions',
				help: 'Number of currently active workflow executions',
				labelNames: ['workflowId', 'workflowName'],
			}),

			workflowExecutionNodes: new promClient.Histogram({
				name: this.prefix + 'workflow_execution_nodes_total',
				help: 'Number of nodes executed in a workflow',
				labelNames: ['workflowId', 'workflowName'],
				buckets: [1, 5, 10, 20, 50, 100, 200],
			}),

			// Alert metrics
			activeAlerts: new promClient.Gauge({
				name: this.prefix + 'active_alerts',
				help: 'Number of active alerts',
				labelNames: ['severity', 'type'],
			}),

			alertsTotal: new promClient.Counter({
				name: this.prefix + 'alerts_total',
				help: 'Total number of alerts generated',
				labelNames: ['severity', 'type', 'workflowId'],
			}),

			alertsResolved: new promClient.Counter({
				name: this.prefix + 'alerts_resolved_total',
				help: 'Total number of alerts resolved',
				labelNames: ['severity', 'type', 'workflowId'],
			}),

			// System health metrics
			systemHealthScore: new promClient.Gauge({
				name: this.prefix + 'system_health_score',
				help: 'System health score (0-100)',
				labelNames: ['component'],
			}),

			systemHealthy: new promClient.Gauge({
				name: this.prefix + 'system_healthy',
				help: 'System health status (1 = healthy, 0 = unhealthy)',
				labelNames: ['component'],
			}),

			// Resource threshold metrics
			cpuThresholdBreaches: new promClient.Counter({
				name: this.prefix + 'cpu_threshold_breaches_total',
				help: 'Total number of CPU threshold breaches',
				labelNames: ['threshold'],
			}),

			memoryThresholdBreaches: new promClient.Counter({
				name: this.prefix + 'memory_threshold_breaches_total',
				help: 'Total number of memory threshold breaches',
				labelNames: ['threshold'],
			}),

			diskThresholdBreaches: new promClient.Counter({
				name: this.prefix + 'disk_threshold_breaches_total',
				help: 'Total number of disk threshold breaches',
				labelNames: ['threshold'],
			}),

			// Process metrics
			workerProcesses: new promClient.Gauge({
				name: this.prefix + 'worker_processes',
				help: 'Number of worker processes',
				labelNames: ['type'],
			}),

			workerProcessMemory: new promClient.Histogram({
				name: this.prefix + 'worker_process_memory_bytes',
				help: 'Worker process memory usage in bytes',
				labelNames: ['type'],
				buckets: [
					10 * 1024 * 1024,
					50 * 1024 * 1024,
					100 * 1024 * 1024,
					250 * 1024 * 1024,
					500 * 1024 * 1024,
				],
			}),

			workerProcessCpu: new promClient.Histogram({
				name: this.prefix + 'worker_process_cpu_percent',
				help: 'Worker process CPU usage percentage',
				labelNames: ['type'],
				buckets: [1, 5, 10, 25, 50, 75, 100],
			}),

			// Enhanced queue metrics
			queueJobsWaiting: new promClient.Gauge({
				name: this.prefix + 'queue_jobs_waiting',
				help: 'Number of jobs waiting in queue',
				labelNames: ['priority'],
			}),

			queueJobsActive: new promClient.Gauge({
				name: this.prefix + 'queue_jobs_active',
				help: 'Number of jobs currently being processed',
				labelNames: ['priority'],
			}),

			queueJobProcessingTime: new promClient.Histogram({
				name: this.prefix + 'queue_job_processing_time_seconds',
				help: 'Time taken to process queue jobs',
				labelNames: ['priority'],
				buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
			}),

			queueJobsCompleted: new promClient.Counter({
				name: this.prefix + 'queue_jobs_completed_total',
				help: 'Total number of completed queue jobs',
				labelNames: ['priority', 'status'],
			}),

			queueJobsFailed: new promClient.Counter({
				name: this.prefix + 'queue_jobs_failed_total',
				help: 'Total number of failed queue jobs',
				labelNames: ['priority', 'reason'],
			}),

			// Network interface metrics
			networkInterfaceStats: new promClient.Gauge({
				name: this.prefix + 'network_interface_stats',
				help: 'Network interface statistics',
				labelNames: ['interface', 'direction', 'metric'],
			}),

			// Disk I/O metrics
			diskIOOperations: new promClient.Counter({
				name: this.prefix + 'disk_io_operations_total',
				help: 'Total number of disk I/O operations',
				labelNames: ['device', 'operation'],
			}),

			diskIOBytes: new promClient.Counter({
				name: this.prefix + 'disk_io_bytes_total',
				help: 'Total bytes transferred in disk I/O operations',
				labelNames: ['device', 'operation'],
			}),

			diskIOTime: new promClient.Histogram({
				name: this.prefix + 'disk_io_time_seconds',
				help: 'Time spent on disk I/O operations',
				labelNames: ['device', 'operation'],
				buckets: [0.001, 0.01, 0.1, 1, 10],
			}),

			// Node-level performance metrics
			nodeExecutionDuration: new promClient.Histogram({
				name: this.prefix + 'node_execution_duration_seconds',
				help: 'Node execution duration in seconds',
				labelNames: ['workflowId', 'nodeId', 'nodeType', 'status'],
				buckets: [0.01, 0.1, 0.5, 1, 5, 10, 30, 60, 300, 600],
			}),

			nodeExecutionMemoryUsage: new promClient.Histogram({
				name: this.prefix + 'node_execution_memory_bytes',
				help: 'Node execution memory usage in bytes',
				labelNames: ['workflowId', 'nodeId', 'nodeType'],
				buckets: [
					1024 * 1024,
					10 * 1024 * 1024,
					50 * 1024 * 1024,
					100 * 1024 * 1024,
					250 * 1024 * 1024,
					500 * 1024 * 1024,
				],
			}),

			nodeExecutionCpuUsage: new promClient.Histogram({
				name: this.prefix + 'node_execution_cpu_percent',
				help: 'Node execution CPU usage percentage',
				labelNames: ['workflowId', 'nodeId', 'nodeType'],
				buckets: [1, 5, 10, 25, 50, 75, 90, 100],
			}),

			nodeExecutionDataItems: new promClient.Histogram({
				name: this.prefix + 'node_execution_data_items',
				help: 'Number of data items processed by node',
				labelNames: ['workflowId', 'nodeId', 'nodeType', 'direction'],
				buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000],
			}),

			nodeExecutionErrors: new promClient.Counter({
				name: this.prefix + 'node_execution_errors_total',
				help: 'Total number of node execution errors',
				labelNames: ['workflowId', 'nodeId', 'nodeType', 'errorType'],
			}),

			nodeExecutionBottlenecks: new promClient.Gauge({
				name: this.prefix + 'node_execution_bottleneck_score',
				help: 'Node bottleneck score (0-100)',
				labelNames: ['workflowId', 'nodeId', 'nodeType'],
			}),

			nodeExecutionActive: new promClient.Gauge({
				name: this.prefix + 'node_execution_active',
				help: 'Number of active node executions',
				labelNames: ['workflowId', 'nodeId', 'nodeType'],
			}),
		};

		this.logger.debug('System monitoring metrics initialized');
	}

	/**
	 * Start collecting metrics at regular intervals
	 */
	async startMetricsCollection(intervalMs: number = 30000): Promise<void> {
		try {
			if (this.metricsCollectionInterval) {
				clearInterval(this.metricsCollectionInterval);
			}

			// Set up event listeners for real-time metrics
			this.setupEventListeners();

			// Start periodic collection
			this.metricsCollectionInterval = setInterval(async () => {
				try {
					await this.collectSystemMetrics();
				} catch (error) {
					this.logger.error('Failed to collect system metrics', {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}, intervalMs);

			// Initial collection
			await this.collectSystemMetrics();

			this.logger.info('System monitoring metrics collection started', {
				interval: intervalMs,
			});
		} catch (error) {
			this.logger.error('Failed to start metrics collection', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Stop collecting metrics
	 */
	stopMetricsCollection(): void {
		if (this.metricsCollectionInterval) {
			clearInterval(this.metricsCollectionInterval);
			this.metricsCollectionInterval = undefined;
		}

		// Remove event listeners
		this.removeAllListeners();

		this.logger.info('System monitoring metrics collection stopped');
	}

	/**
	 * Record workflow execution metrics
	 */
	recordWorkflowExecution(data: {
		workflowId: string;
		workflowName: string;
		duration: number;
		memoryUsage: number;
		cpuUsage: number;
		nodeCount: number;
		status: 'success' | 'error' | 'canceled';
	}): void {
		const { workflowId, workflowName, duration, memoryUsage, cpuUsage, nodeCount, status } = data;

		try {
			this.metrics.workflowExecutionDuration
				.labels(workflowId, workflowName, status)
				.observe(duration / 1000); // Convert to seconds

			this.metrics.workflowExecutionMemoryUsage
				.labels(workflowId, workflowName)
				.observe(memoryUsage);

			this.metrics.workflowExecutionCpuUsage.labels(workflowId, workflowName).observe(cpuUsage);

			this.metrics.workflowExecutionNodes.labels(workflowId, workflowName).observe(nodeCount);

			this.logger.debug('Recorded workflow execution metrics', {
				workflowId,
				workflowName,
				duration,
				status,
			});
		} catch (error) {
			this.logger.error('Failed to record workflow execution metrics', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Record alert metrics
	 */
	recordAlert(data: {
		severity: 'info' | 'warning' | 'critical';
		type: 'cpu' | 'memory' | 'disk' | 'workflow' | 'system';
		workflowId?: string;
		resolved?: boolean;
	}): void {
		const { severity, type, workflowId, resolved } = data;

		try {
			if (resolved) {
				this.metrics.alertsResolved.labels(severity, type, workflowId || '').inc();
			} else {
				this.metrics.alertsTotal.labels(severity, type, workflowId || '').inc();
			}

			this.logger.debug('Recorded alert metrics', {
				severity,
				type,
				workflowId,
				resolved,
			});
		} catch (error) {
			this.logger.error('Failed to record alert metrics', {
				severity,
				type,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Record threshold breach
	 */
	recordThresholdBreach(
		resource: 'cpu' | 'memory' | 'disk',
		threshold: 'warning' | 'critical',
	): void {
		try {
			switch (resource) {
				case 'cpu':
					this.metrics.cpuThresholdBreaches.labels(threshold).inc();
					break;
				case 'memory':
					this.metrics.memoryThresholdBreaches.labels(threshold).inc();
					break;
				case 'disk':
					this.metrics.diskThresholdBreaches.labels(threshold).inc();
					break;
			}

			this.logger.debug('Recorded threshold breach', {
				resource,
				threshold,
			});
		} catch (error) {
			this.logger.error('Failed to record threshold breach', {
				resource,
				threshold,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Record node execution metrics
	 */
	recordNodeExecution(data: {
		workflowId: string;
		nodeId: string;
		nodeType: string;
		duration: number;
		memoryUsage?: number;
		cpuUsage?: number;
		inputItems: number;
		outputItems: number;
		status: 'success' | 'error' | 'timeout' | 'canceled';
		errorType?: string;
		bottleneckScore?: number;
	}): void {
		const {
			workflowId,
			nodeId,
			nodeType,
			duration,
			memoryUsage,
			cpuUsage,
			inputItems,
			outputItems,
			status,
			errorType,
			bottleneckScore,
		} = data;

		try {
			// Record execution duration
			this.metrics.nodeExecutionDuration
				.labels(workflowId, nodeId, nodeType, status)
				.observe(duration / 1000); // Convert to seconds

			// Record memory usage if available
			if (memoryUsage !== undefined) {
				this.metrics.nodeExecutionMemoryUsage
					.labels(workflowId, nodeId, nodeType)
					.observe(memoryUsage);
			}

			// Record CPU usage if available
			if (cpuUsage !== undefined) {
				this.metrics.nodeExecutionCpuUsage.labels(workflowId, nodeId, nodeType).observe(cpuUsage);
			}

			// Record data items processed
			this.metrics.nodeExecutionDataItems
				.labels(workflowId, nodeId, nodeType, 'input')
				.observe(inputItems);

			this.metrics.nodeExecutionDataItems
				.labels(workflowId, nodeId, nodeType, 'output')
				.observe(outputItems);

			// Record errors
			if (status === 'error' && errorType) {
				this.metrics.nodeExecutionErrors.labels(workflowId, nodeId, nodeType, errorType).inc();
			}

			// Record bottleneck score if available
			if (bottleneckScore !== undefined) {
				this.metrics.nodeExecutionBottlenecks
					.labels(workflowId, nodeId, nodeType)
					.set(bottleneckScore);
			}

			this.logger.debug('Recorded node execution metrics', {
				workflowId,
				nodeId,
				nodeType,
				duration,
				status,
			});
		} catch (error) {
			this.logger.error('Failed to record node execution metrics', {
				workflowId,
				nodeId,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Update active node execution count
	 */
	updateActiveNodeExecutions(data: {
		workflowId: string;
		nodeId: string;
		nodeType: string;
		active: boolean;
	}): void {
		const { workflowId, nodeId, nodeType, active } = data;

		try {
			this.metrics.nodeExecutionActive.labels(workflowId, nodeId, nodeType).set(active ? 1 : 0);

			this.logger.debug('Updated active node execution count', {
				workflowId,
				nodeId,
				nodeType,
				active,
			});
		} catch (error) {
			this.logger.error('Failed to update active node execution count', {
				workflowId,
				nodeId,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Set up event listeners for real-time metrics
	 */
	private setupEventListeners(): void {
		// Listen for system monitoring service events
		this.systemMonitoringService.on('alert', (alert) => {
			this.recordAlert({
				severity: alert.severity,
				type: alert.type,
				workflowId: alert.workflowId,
				resolved: false,
			});
		});

		// Listen for workflow execution events
		this.systemMonitoringService.on('workflowExecutionCompleted', (data) => {
			this.recordWorkflowExecution(data);
		});

		// Listen for node execution events
		this.systemMonitoringService.on('nodeExecutionStart', (data) => {
			this.updateActiveNodeExecutions({
				workflowId: data.workflowId,
				nodeId: data.nodeId,
				nodeType: data.nodeType,
				active: true,
			});
		});

		this.systemMonitoringService.on('nodeExecutionCompleted', (data) => {
			this.recordNodeExecution(data);
			this.updateActiveNodeExecutions({
				workflowId: data.workflowId,
				nodeId: data.nodeId,
				nodeType: data.nodeType,
				active: false,
			});
		});

		// Listen for threshold breaches
		this.systemMonitoringService.on('thresholdBreach', (data) => {
			this.recordThresholdBreach(data.resource, data.threshold);
		});

		this.logger.debug('Event listeners set up for real-time metrics');
	}

	/**
	 * Collect current system metrics
	 */
	private async collectSystemMetrics(): Promise<void> {
		try {
			// Get enhanced system resources
			const resources = await this.systemMonitoringService.getEnhancedSystemResources({
				includeWorkers: true,
				includeQueue: true,
				includeWorkflows: true,
				includeNetworking: true,
				includeDetailed: true,
			});

			// Update system resource metrics
			this.metrics.systemCpuUsage.set(resources.system.cpu.usage);
			this.metrics.systemMemoryUsage.set(resources.system.memory.used);
			this.metrics.systemMemoryUsagePercent.set(resources.system.memory.usagePercent);
			this.metrics.systemDiskUsage.set(resources.system.disk.used);
			this.metrics.systemDiskUsagePercent.set(resources.system.disk.usagePercent);
			this.metrics.systemUptime.set(resources.system.uptime / 1000);

			// Update load averages
			const [load1, load5, load15] = resources.system.cpu.load;
			this.metrics.systemLoadAverage.labels('1m').set(load1);
			this.metrics.systemLoadAverage.labels('5m').set(load5);
			this.metrics.systemLoadAverage.labels('15m').set(load15);

			// Update network metrics if available
			if (resources.system.network) {
				this.metrics.systemNetworkBytesReceived.set(resources.system.network.totalBytesReceived);
				this.metrics.systemNetworkBytesSent.set(resources.system.network.totalBytesSent);
			}

			// Update active workflow metrics
			if (resources.workflows) {
				for (const workflow of resources.workflows) {
					this.metrics.activeWorkflowExecutions
						.labels(workflow.workflowId, workflow.workflowName || 'unknown')
						.set(1);
				}
			}

			// Update worker process metrics
			if (resources.processes.workers) {
				const workersByType = resources.processes.workers.reduce(
					(acc, worker) => {
						acc[worker.type] = (acc[worker.type] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				);

				for (const [type, count] of Object.entries(workersByType)) {
					this.metrics.workerProcesses.labels(type).set(count);
				}

				// Update worker resource usage
				for (const worker of resources.processes.workers) {
					this.metrics.workerProcessMemory.labels(worker.type).observe(worker.memory);
					this.metrics.workerProcessCpu.labels(worker.type).observe(worker.cpu);
				}
			}

			// Update queue metrics
			if (resources.queue) {
				this.metrics.queueJobsWaiting.labels('normal').set(resources.queue.waiting);
				this.metrics.queueJobsActive.labels('normal').set(resources.queue.active);
			}

			// Update health metrics
			this.metrics.systemHealthScore.labels('overall').set(resources.health.overallScore);
			this.metrics.systemHealthy.labels('overall').set(resources.health.healthy ? 1 : 0);

			// Update component health metrics
			for (const [component, health] of Object.entries(resources.health.components)) {
				this.metrics.systemHealthScore.labels(component).set(health.score);
				this.metrics.systemHealthy.labels(component).set(health.healthy ? 1 : 0);
			}

			// Update active alerts metrics
			const alertCounts = resources.health.alerts.reduce(
				(acc, alert) => {
					const key = `${alert.severity}_${alert.type}`;
					acc[key] = (acc[key] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

			// Reset active alerts gauge
			this.metrics.activeAlerts.reset();
			for (const [key, count] of Object.entries(alertCounts)) {
				const [severity, type] = key.split('_');
				this.metrics.activeAlerts.labels(severity, type).set(count);
			}
		} catch (error) {
			this.logger.error('Failed to collect system metrics', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Get current metrics values for debugging
	 */
	async getMetricsSnapshot(): Promise<Record<string, any>> {
		try {
			const registry = promClient.register;
			const metrics = await registry.getMetricsAsJSON();

			return metrics
				.filter((metric) => metric.name.startsWith(this.prefix))
				.reduce(
					(acc, metric) => {
						acc[metric.name] = metric.values;
						return acc;
					},
					{} as Record<string, any>,
				);
		} catch (error) {
			this.logger.error('Failed to get metrics snapshot', {
				error: error instanceof Error ? error.message : String(error),
			});
			return {};
		}
	}
}
