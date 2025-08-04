import {
	EnhancedSystemResourcesDto,
	SystemHealthDto,
	ResourceAlertDto,
	WorkflowProcessMetricsDto,
	MonitoringConfigDto,
	SystemMetricsHistoryDto,
	WorkflowMetricsHistoryDto,
	AlertRuleDto,
	CreateAlertRuleDto,
	UpdateAlertRuleDto,
	NodePerformanceMetricsDto,
	WorkflowNodeBreakdownDto,
	NodeTypePerformanceDto,
	LiveNodeExecutionDto,
	NodePerformanceHistoryDto,
	NodePerformanceRequestDto,
	WorkflowNodeBreakdownRequestDto,
	NodeTypePerformanceRequestDto,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError, LoggerProxy } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
	cpus,
	freemem,
	totalmem,
	loadavg,
	platform,
	arch,
	uptime,
	networkInterfaces,
} from 'node:os';
import { SystemResourcesService } from './system-resources.service';
import { EventEmitter } from 'events';
// Remove the problematic import for now
// import type { IWorkflowExecutionDataProcess } from '@/interfaces';
import { ExecutionRepository } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { CacheService } from '@/services/cache/cache.service';

const execAsync = promisify(exec);

// Simple interface for workflow execution data
interface IWorkflowExecutionDataProcess {
	executionId: string;
	workflowData: {
		id: string;
		name?: string;
	};
}

// Interface for execution response
interface IExecutionResponse {
	finished: boolean;
	data?: any;
}

interface WorkflowExecution {
	workflowId: string;
	executionId: string;
	startTime: number;
	pid?: number;
	memoryStart?: number;
	cpuStart?: number;
}

interface NodeExecution {
	nodeId: string;
	nodeType: string;
	nodeName: string;
	executionId: string;
	workflowId: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	memoryUsage?: number;
	cpuUsage?: number;
	inputItems: number;
	outputItems: number;
	status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
	error?: string;
	dataSize?: number;
}

interface NodeExecutionMetrics {
	nodeId: string;
	nodeType: string;
	nodeName: string;
	executions: NodeExecution[];
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	executionTimes: number[];
	memoryUsages: number[];
	cpuUsages: number[];
	errorTypes: Map<string, number>;
}

interface AlertRule {
	id: string;
	name: string;
	description?: string;
	type: 'cpu' | 'memory' | 'disk' | 'workflow' | 'system';
	metric: string;
	operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
	threshold: number;
	severity: 'info' | 'warning' | 'critical';
	enabled: boolean;
	workflowId?: string;
	notifications: {
		email: boolean;
		webhook: boolean;
		webhookUrl?: string;
	};
	createdAt: Date;
	updatedAt: Date;
	lastTriggered?: Date;
	triggerCount: number;
}

@Service()
export class SystemMonitoringService extends EventEmitter {
	private logger = LoggerProxy;
	private monitoringInterval?: NodeJS.Timeout;
	private workflowExecutions = new Map<string, WorkflowExecution>();
	private nodeExecutions = new Map<string, NodeExecution>(); // key: executionId:nodeId
	private nodeExecutionHistory = new Map<string, NodeExecution[]>(); // key: workflowId:nodeId
	private liveExecutions = new Map<string, Map<string, NodeExecution>>(); // key: executionId, value: Map of nodeId -> NodeExecution
	private metricsHistory: SystemMetricsHistoryDto[] = [];
	private workflowMetricsHistory = new Map<string, WorkflowMetricsHistoryDto>();
	private alerts: ResourceAlertDto[] = [];
	private alertRules: AlertRule[] = [];
	private config: MonitoringConfigDto;

	constructor(
		private readonly systemResourcesService: SystemResourcesService,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly cacheService: CacheService,
	) {
		super();
		this.config = this.getDefaultConfig();
		this.initializeDefaultAlertRules();
	}

	/**
	 * Initialize the monitoring service
	 */
	async initialize(): Promise<void> {
		try {
			this.logger.info('Initializing System Monitoring Service');

			// Load configuration from cache or use defaults
			await this.loadConfiguration();

			// Start monitoring if enabled
			if (this.config.enabled) {
				await this.startMonitoring();
			}

			// Set up event listeners for workflow executions
			this.setupWorkflowTracking();

			this.logger.info('System Monitoring Service initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize System Monitoring Service', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to initialize system monitoring service', {
				cause: error,
			});
		}
	}

	/**
	 * Get enhanced system resources with detailed monitoring
	 */
	async getEnhancedSystemResources(
		options: {
			includeWorkers?: boolean;
			includeQueue?: boolean;
			includeWorkflows?: boolean;
			includeNetworking?: boolean;
			includeDetailed?: boolean;
		} = {},
	): Promise<EnhancedSystemResourcesDto> {
		try {
			// Get basic system resources
			const basicResources = await this.systemResourcesService.getCurrentResources({
				includeWorkers: options.includeWorkers,
				includeQueue: options.includeQueue,
			});

			// Get enhanced metrics
			const [enhancedSystem, workflowMetrics, healthStatus] = await Promise.all([
				this.getEnhancedSystemMetrics(options.includeDetailed, options.includeNetworking),
				options.includeWorkflows ? this.getActiveWorkflowMetrics() : Promise.resolve([]),
				this.checkSystemHealth(),
			]);

			return {
				timestamp: new Date().toISOString(),
				system: enhancedSystem,
				processes: {
					main: basicResources.processes.main,
					...(basicResources.processes.workers && {
						workers: basicResources.processes.workers.map((worker) => ({
							...worker,
							uptime: (worker as any).uptime || 0,
						})),
					}),
				},
				workflows: workflowMetrics,
				queue: basicResources.queue,
				health: healthStatus,
			};
		} catch (error) {
			this.logger.error('Failed to get enhanced system resources', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to get enhanced system resources', {
				cause: error,
			});
		}
	}

	/**
	 * Get system health status with detailed analysis
	 */
	async checkSystemHealth(): Promise<SystemHealthDto> {
		try {
			const resources = await this.systemResourcesService.getCurrentResources();
			const alerts = this.getActiveAlerts();

			// Analyze each component
			const cpuHealth = this.analyzeCpuHealth(resources.system.cpu);
			const memoryHealth = this.analyzeMemoryHealth(resources.system.memory);
			const diskHealth = this.analyzeDiskHealth(resources.system.disk);
			const workflowHealth = await this.analyzeWorkflowHealth();
			const networkHealth = await this.analyzeNetworkHealth();

			// Calculate overall health score
			const componentScores = [
				cpuHealth.score,
				memoryHealth.score,
				diskHealth.score,
				workflowHealth.score,
				networkHealth.score,
			];
			const overallScore =
				componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;
			const healthy =
				overallScore >= 70 && alerts.filter((a) => a.severity === 'critical').length === 0;

			// Generate recommendations
			const recommendations = this.generateHealthRecommendations({
				cpu: cpuHealth,
				memory: memoryHealth,
				disk: diskHealth,
				workflows: workflowHealth,
				network: networkHealth,
			});

			return {
				healthy,
				overallScore: Math.round(overallScore),
				components: {
					cpu: cpuHealth,
					memory: memoryHealth,
					disk: diskHealth,
					network: networkHealth,
					workflows: workflowHealth,
				},
				recommendations,
				alerts: alerts.slice(0, 10), // Last 10 active alerts
			};
		} catch (error) {
			this.logger.error('Failed to check system health', {
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				healthy: false,
				overallScore: 0,
				components: {
					cpu: { healthy: false, score: 0, issues: ['Health check failed'] },
					memory: { healthy: false, score: 0, issues: ['Health check failed'] },
					disk: { healthy: false, score: 0, issues: ['Health check failed'] },
					network: { healthy: false, score: 0, issues: ['Health check failed'] },
					workflows: { healthy: false, score: 0, issues: ['Health check failed'] },
				},
				recommendations: ['Check system monitoring configuration'],
				alerts: [],
			};
		}
	}

	/**
	 * Track workflow execution start
	 */
	trackWorkflowExecutionStart(data: IWorkflowExecutionDataProcess): void {
		const { executionId, workflowData } = data;
		const workflowId = workflowData.id;

		if (!executionId || !workflowId) return;

		const execution: WorkflowExecution = {
			workflowId,
			executionId,
			startTime: Date.now(),
			pid: process.pid,
			memoryStart: process.memoryUsage().rss,
		};

		this.workflowExecutions.set(executionId, execution);
		this.logger.debug('Started tracking workflow execution', {
			executionId,
			workflowId,
		});
	}

	/**
	 * Track workflow execution end
	 */
	async trackWorkflowExecutionEnd(executionId: string, result: IExecutionResponse): Promise<void> {
		const execution = this.workflowExecutions.get(executionId);
		if (!execution) return;

		try {
			const endTime = Date.now();
			const duration = endTime - execution.startTime;
			const memoryEnd = process.memoryUsage().rss;
			const memoryUsed = memoryEnd - (execution.memoryStart || 0);

			// Check for resource alerts
			await this.checkWorkflowResourceAlerts(execution, duration, memoryUsed, result);

			// Update workflow metrics history
			await this.updateWorkflowMetricsHistory(execution, duration, memoryUsed, result);

			this.workflowExecutions.delete(executionId);

			this.logger.debug('Finished tracking workflow execution', {
				executionId,
				workflowId: execution.workflowId,
				duration,
				memoryUsed,
				status: result.finished ? 'success' : 'error',
			});
		} catch (error) {
			this.logger.error('Failed to track workflow execution end', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Get alerts with filtering and pagination
	 */
	getAlerts(
		filter: {
			severity?: 'info' | 'warning' | 'critical';
			type?: 'cpu' | 'memory' | 'disk' | 'workflow' | 'system';
			resolved?: boolean;
			workflowId?: string;
			limit?: number;
			offset?: number;
			startDate?: Date;
			endDate?: Date;
		} = {},
	): {
		alerts: ResourceAlertDto[];
		total: number;
		unresolved: number;
		bySeverity: { info: number; warning: number; critical: number };
	} {
		let filteredAlerts = [...this.alerts];

		// Apply filters
		if (filter.severity) {
			filteredAlerts = filteredAlerts.filter((a) => a.severity === filter.severity);
		}
		if (filter.type) {
			filteredAlerts = filteredAlerts.filter((a) => a.type === filter.type);
		}
		if (filter.resolved !== undefined) {
			filteredAlerts = filteredAlerts.filter((a) => a.resolved === filter.resolved);
		}
		if (filter.workflowId) {
			filteredAlerts = filteredAlerts.filter((a) => a.workflowId === filter.workflowId);
		}
		if (filter.startDate) {
			filteredAlerts = filteredAlerts.filter((a) => new Date(a.timestamp) >= filter.startDate!);
		}
		if (filter.endDate) {
			filteredAlerts = filteredAlerts.filter((a) => new Date(a.timestamp) <= filter.endDate!);
		}

		// Sort by timestamp (newest first)
		filteredAlerts.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

		const total = filteredAlerts.length;
		const unresolved = this.alerts.filter((a) => !a.resolved).length;

		// Apply pagination
		const offset = filter.offset || 0;
		const limit = Math.min(filter.limit || 50, 500);
		const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);

		// Calculate severity counts
		const bySeverity = this.alerts.reduce(
			(acc, alert) => {
				acc[alert.severity]++;
				return acc;
			},
			{ info: 0, warning: 0, critical: 0 },
		);

		return {
			alerts: paginatedAlerts,
			total,
			unresolved,
			bySeverity,
		};
	}

	/**
	 * Create alert rule
	 */
	async createAlertRule(data: CreateAlertRuleDto): Promise<AlertRuleDto> {
		const rule: AlertRule = {
			id: this.generateId(),
			name: data.name,
			description: data.description,
			type: data.type,
			metric: data.metric,
			operator: data.operator,
			threshold: data.threshold,
			severity: data.severity,
			enabled: data.enabled,
			workflowId: data.workflowId,
			notifications: data.notifications || {
				email: false,
				webhook: false,
			},
			createdAt: new Date(),
			updatedAt: new Date(),
			triggerCount: 0,
		};

		this.alertRules.push(rule);
		await this.saveAlertRules();

		this.logger.info('Created alert rule', { ruleId: rule.id, name: rule.name });

		return this.alertRuleToDto(rule);
	}

	/**
	 * Update alert rule
	 */
	async updateAlertRule(id: string, data: UpdateAlertRuleDto): Promise<AlertRuleDto> {
		const rule = this.alertRules.find((r) => r.id === id);
		if (!rule) {
			throw new ApplicationError(`Alert rule with ID '${id}' not found`);
		}

		// Update fields
		Object.assign(rule, {
			...data,
			updatedAt: new Date(),
		});

		await this.saveAlertRules();

		this.logger.info('Updated alert rule', { ruleId: id, name: rule.name });

		return this.alertRuleToDto(rule);
	}

	/**
	 * Delete alert rule
	 */
	async deleteAlertRule(id: string): Promise<void> {
		const index = this.alertRules.findIndex((r) => r.id === id);
		if (index === -1) {
			throw new ApplicationError(`Alert rule with ID '${id}' not found`);
		}

		const rule = this.alertRules[index];
		this.alertRules.splice(index, 1);
		await this.saveAlertRules();

		this.logger.info('Deleted alert rule', { ruleId: id, name: rule.name });
	}

	/**
	 * Get alert rules
	 */
	getAlertRules(): { rules: AlertRuleDto[]; total: number; enabled: number } {
		const rules = this.alertRules.map((rule) => this.alertRuleToDto(rule));
		return {
			rules,
			total: rules.length,
			enabled: rules.filter((r) => r.enabled).length,
		};
	}

	/**
	 * Get metrics history
	 */
	getMetricsHistory(timeRange: string): SystemMetricsHistoryDto[] {
		const now = Date.now();
		let cutoffTime: number;

		switch (timeRange) {
			case '1h':
				cutoffTime = now - 60 * 60 * 1000;
				break;
			case '6h':
				cutoffTime = now - 6 * 60 * 60 * 1000;
				break;
			case '24h':
				cutoffTime = now - 24 * 60 * 60 * 1000;
				break;
			case '7d':
				cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
				break;
			case '30d':
				cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
				break;
			default:
				cutoffTime = now - 24 * 60 * 60 * 1000;
		}

		return this.metricsHistory.filter((metric) =>
			metric.timestamps.some((timestamp) => new Date(timestamp).getTime() >= cutoffTime),
		);
	}

	/**
	 * Get detailed performance metrics for a specific node
	 */
	async getNodePerformanceMetrics(
		workflowId: string,
		nodeId: string,
		options: NodePerformanceRequestDto,
	): Promise<NodePerformanceMetricsDto> {
		try {
			const historyKey = `${workflowId}:${nodeId}`;
			const nodeHistory = this.nodeExecutionHistory.get(historyKey) || [];

			// Filter by time range
			const cutoffTime = this.getTimeRangeCutoff(options.timeRange);
			const recentExecutions = nodeHistory.filter((execution) => execution.startTime >= cutoffTime);

			if (recentExecutions.length === 0) {
				// Return empty metrics if no executions found
				return {
					nodeId,
					nodeType: 'unknown',
					nodeName: nodeId,
					totalExecutions: 0,
					successfulExecutions: 0,
					failedExecutions: 0,
					averageExecutionTime: 0,
					medianExecutionTime: 0,
					p95ExecutionTime: 0,
					maxExecutionTime: 0,
					minExecutionTime: 0,
					averageMemoryUsage: 0,
					peakMemoryUsage: 0,
					averageCpuUsage: 0,
					peakCpuUsage: 0,
					averageInputItems: 0,
					averageOutputItems: 0,
					totalDataProcessed: 0,
					averageDataTransformation: 0,
					errorRate: 0,
					commonErrorTypes: [],
					timeRange: options.timeRange,
					trendData: [],
				};
			}

			const successfulExecutions = recentExecutions.filter((e) => e.status === 'completed');
			const failedExecutions = recentExecutions.filter((e) => e.status === 'error');

			// Calculate execution time statistics
			const executionTimes = recentExecutions
				.filter((e) => e.duration)
				.map((e) => e.duration!)
				.sort((a, b) => a - b);

			const memoryUsages = recentExecutions.filter((e) => e.memoryUsage).map((e) => e.memoryUsage!);

			const cpuUsages = recentExecutions.filter((e) => e.cpuUsage).map((e) => e.cpuUsage!);

			// Calculate error types
			const errorTypes = new Map<string, number>();
			failedExecutions.forEach((e) => {
				if (e.error) {
					const errorType = this.categorizeError(e.error);
					errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
				}
			});

			// Generate trend data
			const trendData = this.generateNodeTrendData(recentExecutions, options.timeRange);

			return {
				nodeId,
				nodeType: recentExecutions[0]?.nodeType || 'unknown',
				nodeName: recentExecutions[0]?.nodeName || nodeId,
				totalExecutions: recentExecutions.length,
				successfulExecutions: successfulExecutions.length,
				failedExecutions: failedExecutions.length,
				averageExecutionTime: this.average(executionTimes),
				medianExecutionTime: this.median(executionTimes),
				p95ExecutionTime: this.percentile(executionTimes, 95),
				maxExecutionTime: Math.max(...executionTimes, 0),
				minExecutionTime: Math.min(...executionTimes, 0),
				averageMemoryUsage: this.average(memoryUsages),
				peakMemoryUsage: Math.max(...memoryUsages, 0),
				averageCpuUsage: this.average(cpuUsages),
				peakCpuUsage: Math.max(...cpuUsages, 0),
				averageInputItems: this.average(recentExecutions.map((e) => e.inputItems)),
				averageOutputItems: this.average(recentExecutions.map((e) => e.outputItems)),
				totalDataProcessed: recentExecutions.reduce((sum, e) => sum + (e.dataSize || 0), 0),
				averageDataTransformation: this.calculateDataTransformationRatio(recentExecutions),
				errorRate: (failedExecutions.length / recentExecutions.length) * 100,
				commonErrorTypes: Array.from(errorTypes.entries())
					.map(([error, count]) => ({ error, count }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 5),
				timeRange: options.timeRange,
				trendData,
			};
		} catch (error) {
			this.logger.error('Failed to get node performance metrics', {
				workflowId,
				nodeId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to get node performance metrics', {
				cause: error,
			});
		}
	}

	/**
	 * Get performance breakdown for all nodes in a workflow
	 */
	async getWorkflowNodeBreakdown(
		workflowId: string,
		options: WorkflowNodeBreakdownRequestDto,
	): Promise<WorkflowNodeBreakdownDto> {
		try {
			// Get all node executions for this workflow
			const allNodeExecutions = new Map<string, NodeExecution[]>();
			const cutoffTime = this.getTimeRangeCutoff(options.timeRange);

			// Collect executions for all nodes in the workflow
			for (const [key, executions] of this.nodeExecutionHistory.entries()) {
				if (key.startsWith(`${workflowId}:`)) {
					const nodeId = key.substring(workflowId.length + 1);
					const recentExecutions = executions.filter(
						(e) => e.startTime >= cutoffTime && e.status !== 'skipped',
					);

					if (recentExecutions.length >= options.minExecutions) {
						allNodeExecutions.set(nodeId, recentExecutions);
					}
				}
			}

			// Calculate total workflow metrics
			const allExecutions = Array.from(allNodeExecutions.values()).flat();
			const totalWorkflowTime = allExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
			const totalWorkflowMemory = allExecutions.reduce((sum, e) => sum + (e.memoryUsage || 0), 0);
			const totalWorkflowErrors = allExecutions.filter((e) => e.status === 'error').length;

			// Calculate node metrics
			const nodeMetrics = Array.from(allNodeExecutions.entries()).map(([nodeId, executions]) => {
				const nodeTime = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
				const nodeMemory = executions.reduce((sum, e) => sum + (e.memoryUsage || 0), 0);
				const nodeErrors = executions.filter((e) => e.status === 'error').length;

				const bottleneckScore = this.calculateBottleneckScore(executions, allExecutions);

				return {
					nodeId,
					nodeName: executions[0]?.nodeName || nodeId,
					nodeType: executions[0]?.nodeType || 'unknown',
					executionTimePercent: totalWorkflowTime > 0 ? (nodeTime / totalWorkflowTime) * 100 : 0,
					memoryUsagePercent:
						totalWorkflowMemory > 0 ? (nodeMemory / totalWorkflowMemory) * 100 : 0,
					errorContribution: totalWorkflowErrors > 0 ? (nodeErrors / totalWorkflowErrors) * 100 : 0,
					bottleneckScore,
				};
			});

			// Sort by bottleneck score to identify critical path
			const sortedByBottleneck = [...nodeMetrics].sort(
				(a, b) => b.bottleneckScore - a.bottleneckScore,
			);
			const criticalPath = sortedByBottleneck.slice(0, 3).map((n) => n.nodeId);
			const bottleneckNodes = sortedByBottleneck
				.filter((n) => n.bottleneckScore > 70)
				.map((n) => n.nodeId);

			// Generate recommendations
			const recommendations = options.includeRecommendations
				? this.generateNodeRecommendations(nodeMetrics)
				: [];

			return {
				workflowId,
				workflowName: 'Workflow', // Would need to fetch from workflow repository
				timeRange: options.timeRange,
				nodeMetrics,
				criticalPath,
				bottleneckNodes,
				recommendations,
			};
		} catch (error) {
			this.logger.error('Failed to get workflow node breakdown', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to get workflow node breakdown', {
				cause: error,
			});
		}
	}

	/**
	 * Get performance comparison across different node types
	 */
	async getNodeTypePerformance(
		options: NodeTypePerformanceRequestDto,
	): Promise<NodeTypePerformanceDto[]> {
		try {
			const cutoffTime = this.getTimeRangeCutoff(options.timeRange);
			const nodeTypeMetrics = new Map<string, NodeExecution[]>();

			// Group executions by node type
			for (const executions of this.nodeExecutionHistory.values()) {
				const recentExecutions = executions.filter((e) => e.startTime >= cutoffTime);

				for (const execution of recentExecutions) {
					const nodeType = execution.nodeType;
					if (!nodeTypeMetrics.has(nodeType)) {
						nodeTypeMetrics.set(nodeType, []);
					}
					nodeTypeMetrics.get(nodeType)!.push(execution);
				}
			}

			// Calculate performance stats for each node type
			const nodeTypeStats = Array.from(nodeTypeMetrics.entries()).map(([nodeType, executions]) => {
				const executionTimes = executions
					.filter((e) => e.duration)
					.map((e) => e.duration!)
					.sort((a, b) => a - b);

				const memoryUsages = executions.filter((e) => e.memoryUsage).map((e) => e.memoryUsage!);

				const successfulExecutions = executions.filter((e) => e.status === 'completed');
				const totalItems = executions.reduce((sum, e) => sum + e.inputItems + e.outputItems, 0);
				const totalTime = executionTimes.reduce((sum, time) => sum + time, 0);

				return {
					nodeType,
					instances: new Set(executions.map((e) => `${e.workflowId}:${e.nodeId}`)).size,
					performanceStats: {
						averageExecutionTime: this.average(executionTimes),
						memoryEfficiency: totalItems > 0 ? this.average(memoryUsages) / totalItems : 0,
						errorRate:
							((executions.length - successfulExecutions.length) / executions.length) * 100,
						throughput: totalTime > 0 ? totalItems / (totalTime / 1000) : 0,
					},
					benchmarkComparison: {
						vsAverage: 0, // Will be calculated after all stats are computed
						ranking: 0, // Will be set after sorting
					},
					topPerformingWorkflows: [],
					problematicWorkflows: [],
				};
			});

			// Calculate benchmarks
			const overallAverageTime = this.average(
				nodeTypeStats.map((stat) => stat.performanceStats.averageExecutionTime),
			);

			nodeTypeStats.forEach((stat) => {
				stat.benchmarkComparison.vsAverage =
					overallAverageTime > 0
						? ((overallAverageTime - stat.performanceStats.averageExecutionTime) /
								overallAverageTime) *
							100
						: 0;
			});

			// Sort and assign rankings
			const sortedStats = nodeTypeStats.sort((a, b) => {
				switch (options.sortBy) {
					case 'executionTime':
						return (
							a.performanceStats.averageExecutionTime - b.performanceStats.averageExecutionTime
						);
					case 'memoryUsage':
						return a.performanceStats.memoryEfficiency - b.performanceStats.memoryEfficiency;
					case 'errorRate':
						return a.performanceStats.errorRate - b.performanceStats.errorRate;
					case 'throughput':
						return b.performanceStats.throughput - a.performanceStats.throughput;
					default:
						return (
							a.performanceStats.averageExecutionTime - b.performanceStats.averageExecutionTime
						);
				}
			});

			sortedStats.forEach((stat, index) => {
				stat.benchmarkComparison.ranking = index + 1;
			});

			return sortedStats.slice(0, options.limit);
		} catch (error) {
			this.logger.error('Failed to get node type performance', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to get node type performance', {
				cause: error,
			});
		}
	}

	/**
	 * Get real-time node execution status for a running execution
	 */
	async getLiveNodeExecution(executionId: string): Promise<LiveNodeExecutionDto> {
		try {
			const liveNodes = this.liveExecutions.get(executionId);
			if (!liveNodes) {
				throw new ApplicationError(`Execution '${executionId}' not found or not active`);
			}

			const nodeStatuses = Array.from(liveNodes.values()).map((node) => ({
				nodeId: node.nodeId,
				status: node.status,
				startTime: node.startTime ? new Date(node.startTime).toISOString() : undefined,
				duration: node.duration,
				memoryUsage: node.memoryUsage,
				itemsProcessed: node.inputItems + node.outputItems,
				progress: this.calculateNodeProgress(node),
			}));

			const completedNodes = nodeStatuses
				.filter((n) => n.status === 'completed')
				.map((n) => n.nodeId);

			const currentNode = nodeStatuses.find((n) => n.status === 'running')?.nodeId || null;

			return {
				executionId,
				currentNode,
				nodeStatuses,
				executionPath: completedNodes,
				estimatedCompletion: this.estimateCompletionTime(executionId, nodeStatuses),
			};
		} catch (error) {
			this.logger.error('Failed to get live node execution', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to get live node execution', {
				cause: error,
			});
		}
	}

	/**
	 * Get historical performance data for a specific node
	 */
	async getNodePerformanceHistory(
		workflowId: string,
		nodeId: string,
		timeRange: string,
	): Promise<NodePerformanceHistoryDto> {
		try {
			const historyKey = `${workflowId}:${nodeId}`;
			const nodeHistory = this.nodeExecutionHistory.get(historyKey) || [];

			const cutoffTime = this.getTimeRangeCutoff(timeRange);
			const recentExecutions = nodeHistory.filter((execution) => execution.startTime >= cutoffTime);

			// Group executions by time intervals for trend analysis
			const intervalMs = this.getIntervalMs(timeRange);
			const groupedData = this.groupExecutionsByInterval(recentExecutions, intervalMs);

			const timestamps: string[] = [];
			const executionTimes: number[] = [];
			const memoryUsages: number[] = [];
			const inputCounts: number[] = [];
			const outputCounts: number[] = [];
			const errorCounts: number[] = [];

			groupedData.forEach(([timestamp, executions]) => {
				timestamps.push(new Date(timestamp).toISOString());
				executionTimes.push(this.average(executions.map((e) => e.duration || 0)));
				memoryUsages.push(this.average(executions.map((e) => e.memoryUsage || 0)));
				inputCounts.push(this.average(executions.map((e) => e.inputItems)));
				outputCounts.push(this.average(executions.map((e) => e.outputItems)));
				errorCounts.push(executions.filter((e) => e.status === 'error').length);
			});

			// Calculate patterns
			const patterns = this.calculateExecutionPatterns(recentExecutions);

			return {
				nodeId,
				timeRange,
				metrics: {
					timestamps,
					executionTimes,
					memoryUsages,
					inputCounts,
					outputCounts,
					errorCounts,
				},
				patterns,
			};
		} catch (error) {
			this.logger.error('Failed to get node performance history', {
				workflowId,
				nodeId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to get node performance history', {
				cause: error,
			});
		}
	}

	/**
	 * Track node execution start
	 */
	trackNodeExecutionStart(
		executionId: string,
		nodeId: string,
		nodeType: string,
		nodeName: string,
		workflowId: string,
	): void {
		const nodeExecution: NodeExecution = {
			nodeId,
			nodeType,
			nodeName,
			executionId,
			workflowId,
			startTime: Date.now(),
			status: 'running',
			inputItems: 0,
			outputItems: 0,
		};

		// Store in live executions
		if (!this.liveExecutions.has(executionId)) {
			this.liveExecutions.set(executionId, new Map());
		}
		this.liveExecutions.get(executionId)!.set(nodeId, nodeExecution);

		// Store in node executions
		const key = `${executionId}:${nodeId}`;
		this.nodeExecutions.set(key, nodeExecution);

		// Emit event for metrics collection
		this.emit('nodeExecutionStart', {
			workflowId,
			nodeId,
			nodeType,
			executionId,
		});

		this.logger.debug('Started tracking node execution', {
			executionId,
			nodeId,
			nodeType,
			workflowId,
		});
	}

	/**
	 * Track node execution end
	 */
	trackNodeExecutionEnd(
		executionId: string,
		nodeId: string,
		result: { success: boolean; error?: string; inputItems?: number; outputItems?: number },
	): void {
		const key = `${executionId}:${nodeId}`;
		const nodeExecution = this.nodeExecutions.get(key);

		if (!nodeExecution) {
			this.logger.warn('Node execution not found for tracking end', { executionId, nodeId });
			return;
		}

		const endTime = Date.now();
		nodeExecution.endTime = endTime;
		nodeExecution.duration = endTime - nodeExecution.startTime;
		nodeExecution.status = result.success ? 'completed' : 'error';
		nodeExecution.error = result.error;
		nodeExecution.inputItems = result.inputItems || 0;
		nodeExecution.outputItems = result.outputItems || 0;
		nodeExecution.memoryUsage = process.memoryUsage().rss; // Approximate memory usage
		nodeExecution.cpuUsage = this.estimateNodeCpuUsage(nodeExecution.duration);

		// Update live execution
		const liveNodes = this.liveExecutions.get(executionId);
		if (liveNodes) {
			liveNodes.set(nodeId, nodeExecution);
		}

		// Move to history
		const historyKey = `${nodeExecution.workflowId}:${nodeId}`;
		if (!this.nodeExecutionHistory.has(historyKey)) {
			this.nodeExecutionHistory.set(historyKey, []);
		}
		this.nodeExecutionHistory.get(historyKey)!.push({ ...nodeExecution });

		// Cleanup
		this.nodeExecutions.delete(key);

		// Emit event for metrics collection
		this.emit('nodeExecutionCompleted', {
			workflowId: nodeExecution.workflowId,
			nodeId,
			nodeType: nodeExecution.nodeType,
			duration: nodeExecution.duration || 0,
			memoryUsage: nodeExecution.memoryUsage,
			cpuUsage: nodeExecution.cpuUsage,
			inputItems: nodeExecution.inputItems,
			outputItems: nodeExecution.outputItems,
			status: result.success ? 'success' : 'error',
			errorType: result.error ? this.categorizeError(result.error) : undefined,
		});

		this.logger.debug('Finished tracking node execution', {
			executionId,
			nodeId,
			duration: nodeExecution.duration,
			status: nodeExecution.status,
		});
	}

	/**
	 * Start monitoring service
	 */
	private async startMonitoring(): Promise<void> {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}

		this.monitoringInterval = setInterval(async () => {
			try {
				await this.collectMetrics();
				await this.checkAlertRules();
				await this.cleanupOldData();
			} catch (error) {
				this.logger.error('Error during monitoring cycle', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}, this.config.interval);

		this.logger.info('System monitoring started', {
			interval: this.config.interval,
		});
	}

	/**
	 * Stop monitoring service
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
		}
		this.logger.info('System monitoring stopped');
	}

	/**
	 * Collect system metrics for history
	 */
	private async collectMetrics(): Promise<void> {
		try {
			const resources = await this.systemResourcesService.getCurrentResources();
			const activeWorkflowCount = this.workflowExecutions.size;
			const queueSize = resources.queue?.waiting || 0;

			const metricsEntry: SystemMetricsHistoryDto = {
				timestamps: [new Date().toISOString()],
				cpu: [resources.system.cpu.usage],
				memory: [resources.system.memory.usagePercent],
				disk: [resources.system.disk.usagePercent],
				activeWorkflows: [activeWorkflowCount],
				queueSize: [queueSize],
			};

			this.metricsHistory.push(metricsEntry);

			// Keep only recent history
			const maxHistoryEntries = 24 * 60; // 24 hours at 1-minute intervals
			if (this.metricsHistory.length > maxHistoryEntries) {
				this.metricsHistory = this.metricsHistory.slice(-maxHistoryEntries);
			}
		} catch (error) {
			this.logger.error('Failed to collect metrics', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Check alert rules and trigger alerts
	 */
	private async checkAlertRules(): Promise<void> {
		const resources = await this.systemResourcesService.getCurrentResources();
		const enabledRules = this.alertRules.filter((rule) => rule.enabled);

		for (const rule of enabledRules) {
			try {
				const shouldTrigger = await this.evaluateAlertRule(rule, resources);
				if (shouldTrigger) {
					await this.triggerAlert(rule, resources);
				}
			} catch (error) {
				this.logger.error('Failed to evaluate alert rule', {
					ruleId: rule.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Setup workflow execution tracking
	 */
	private setupWorkflowTracking(): void {
		// This would integrate with the workflow execution system
		// For now, we'll add event listeners that can be called by the execution system
		this.logger.debug('Workflow tracking setup completed');
	}

	/**
	 * Get enhanced system metrics
	 */
	private async getEnhancedSystemMetrics(
		includeDetailed?: boolean,
		includeNetworking?: boolean,
	): Promise<any> {
		const totalMemory = totalmem();
		const freeMemory = freemem();
		const usedMemory = totalMemory - freeMemory;
		const loadAverages = loadavg();
		const cpuCount = cpus().length;

		// Enhanced CPU metrics
		const cpuMetrics = {
			usage: await this.getCpuUsage(),
			cores: cpuCount,
			load: [loadAverages[0], loadAverages[1], loadAverages[2]] as [number, number, number],
			...(includeDetailed && {
				perCore: await this.getPerCoreCpuUsage(),
				temperature: await this.getCpuTemperature(),
				throttling: await this.getCpuThrottling(),
			}),
		};

		// Enhanced memory metrics
		const memoryMetrics = {
			total: totalMemory,
			used: usedMemory,
			free: freeMemory,
			usagePercent: (usedMemory / totalMemory) * 100,
			available: freeMemory,
			...(includeDetailed && {
				cached: await this.getCachedMemory(),
				buffers: await this.getBufferMemory(),
				swap: await this.getSwapInfo(),
			}),
		};

		// Enhanced disk metrics
		const diskMetrics = {
			total: 100 * 1024 * 1024 * 1024, // Placeholder
			used: 50 * 1024 * 1024 * 1024,
			free: 50 * 1024 * 1024 * 1024,
			usagePercent: 50,
			...(includeDetailed && {
				volumes: await this.getDiskVolumes(),
				iops: await this.getDiskIOPS(),
			}),
		};

		return {
			cpu: cpuMetrics,
			memory: memoryMetrics,
			disk: diskMetrics,
			...(includeNetworking && {
				network: await this.getNetworkMetrics(),
			}),
			uptime: uptime() * 1000,
			platform: platform(),
			architecture: arch(),
			nodeVersion: process.version,
		};
	}

	/**
	 * Additional helper methods would be implemented here
	 * for getting detailed system metrics, analyzing health,
	 * managing alerts, etc.
	 */

	private getDefaultConfig(): MonitoringConfigDto {
		return {
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
		};
	}

	private async loadConfiguration(): Promise<void> {
		// Load from cache/database if available
		// For now, use defaults
	}

	private initializeDefaultAlertRules(): void {
		// Initialize with some default alert rules
		this.alertRules = [
			{
				id: 'cpu-high',
				name: 'High CPU Usage',
				type: 'cpu',
				metric: 'usage',
				operator: '>',
				threshold: 80,
				severity: 'warning',
				enabled: true,
				notifications: { email: false, webhook: false },
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
			},
			{
				id: 'memory-high',
				name: 'High Memory Usage',
				type: 'memory',
				metric: 'usagePercent',
				operator: '>',
				threshold: 85,
				severity: 'warning',
				enabled: true,
				notifications: { email: false, webhook: false },
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
			},
		];
	}

	// CPU usage calculation
	private async getCpuUsage(): Promise<number> {
		try {
			// Get CPU usage from the system resources service
			const resources = await this.systemResourcesService.getCurrentResources();
			return resources.system.cpu.usage;
		} catch (error) {
			this.logger.error('Failed to get CPU usage', {
				error: error instanceof Error ? error.message : String(error),
			});
			return 0;
		}
	}

	private async getPerCoreCpuUsage(): Promise<number[]> {
		try {
			// In a real implementation, you would get per-core CPU usage
			// For now, distribute total CPU usage across cores with some variation
			const totalUsage = await this.getCpuUsage();
			const coreCount = cpus().length;

			return cpus().map(() => {
				// Add some realistic variation around the average
				const variation = (Math.random() - 0.5) * 20; // ±10%
				return Math.max(0, Math.min(100, totalUsage + variation));
			});
		} catch (error) {
			return cpus().map(() => 0);
		}
	}

	private async getCpuTemperature(): Promise<number | undefined> {
		try {
			// Try to get CPU temperature on Linux systems
			if (process.platform === 'linux') {
				try {
					const tempData = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
					const tempCelsius = parseInt(tempData.trim()) / 1000;
					return tempCelsius;
				} catch (tempError) {
					// Temperature monitoring may not be available
					return undefined;
				}
			}
			// Temperature monitoring not implemented for other platforms
			return undefined;
		} catch (error) {
			return undefined;
		}
	}

	private async getCpuThrottling(): Promise<boolean | undefined> {
		try {
			// Check for CPU throttling indicators
			if (process.platform === 'linux') {
				try {
					// Check if CPU frequency scaling is active
					const cpuFreqData = await fs.readFile('/proc/cpuinfo', 'utf8');
					const currentFreq = await fs.readFile(
						'/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq',
						'utf8',
					);
					const maxFreq = await fs.readFile(
						'/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq',
						'utf8',
					);

					const current = parseInt(currentFreq.trim());
					const max = parseInt(maxFreq.trim());

					// Consider throttling if current frequency is significantly below max
					return current < max * 0.8;
				} catch (throttleError) {
					return undefined;
				}
			}
			return undefined;
		} catch (error) {
			return undefined;
		}
	}

	private async getCachedMemory(): Promise<number> {
		try {
			if (process.platform === 'linux') {
				const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
				const cachedMatch = meminfo.match(/^Cached:\s+(\d+)\s+kB/m);
				if (cachedMatch) {
					return parseInt(cachedMatch[1]) * 1024; // Convert from kB to bytes
				}
			}
			return 0;
		} catch (error) {
			return 0;
		}
	}

	private async getBufferMemory(): Promise<number> {
		try {
			if (process.platform === 'linux') {
				const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
				const buffersMatch = meminfo.match(/^Buffers:\s+(\d+)\s+kB/m);
				if (buffersMatch) {
					return parseInt(buffersMatch[1]) * 1024; // Convert from kB to bytes
				}
			}
			return 0;
		} catch (error) {
			return 0;
		}
	}

	private async getSwapInfo(): Promise<
		{ total: number; used: number; free: number; usagePercent: number } | undefined
	> {
		try {
			if (process.platform === 'linux') {
				const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
				const swapTotalMatch = meminfo.match(/^SwapTotal:\s+(\d+)\s+kB/m);
				const swapFreeMatch = meminfo.match(/^SwapFree:\s+(\d+)\s+kB/m);

				if (swapTotalMatch && swapFreeMatch) {
					const total = parseInt(swapTotalMatch[1]) * 1024; // Convert from kB to bytes
					const free = parseInt(swapFreeMatch[1]) * 1024;
					const used = total - free;
					const usagePercent = total > 0 ? (used / total) * 100 : 0;

					return { total, used, free, usagePercent };
				}
			}
			return undefined;
		} catch (error) {
			return undefined;
		}
	}

	private async getDiskVolumes(): Promise<any[]> {
		try {
			const volumes: any[] = [];

			if (process.platform === 'linux' || process.platform === 'darwin') {
				try {
					const { stdout } = await execAsync('df -h');
					const lines = stdout.trim().split('\n').slice(1); // Skip header

					for (const line of lines) {
						const parts = line.trim().split(/\s+/);
						if (parts.length >= 6 && !parts[0].startsWith('/dev/loop')) {
							volumes.push({
								filesystem: parts[0],
								mountPoint: parts[5],
								total: parts[1],
								used: parts[2],
								free: parts[3],
								usagePercent: parseFloat(parts[4].replace('%', '')),
							});
						}
					}
				} catch (error) {
					this.logger.debug('Failed to get disk volumes via df', { error: error.message });
				}
			} else if (process.platform === 'win32') {
				try {
					const { stdout } = await execAsync(
						'wmic logicaldisk get size,freespace,caption /format:csv',
					);
					const lines = stdout
						.trim()
						.split('\n')
						.filter((line) => line.includes(','));

					for (let i = 1; i < lines.length; i++) {
						const parts = lines[i].split(',');
						if (parts.length >= 4) {
							const total = parseInt(parts[3]);
							const free = parseInt(parts[2]);
							const used = total - free;
							const usagePercent = total > 0 ? (used / total) * 100 : 0;

							volumes.push({
								filesystem: parts[1],
								mountPoint: parts[1],
								total: `${(total / 1024 / 1024 / 1024).toFixed(1)}G`,
								used: `${(used / 1024 / 1024 / 1024).toFixed(1)}G`,
								free: `${(free / 1024 / 1024 / 1024).toFixed(1)}G`,
								usagePercent: usagePercent,
							});
						}
					}
				} catch (error) {
					this.logger.debug('Failed to get disk volumes via wmic', { error: error.message });
				}
			}

			return volumes;
		} catch (error) {
			this.logger.error('Failed to get disk volumes', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	private async getDiskIOPS(): Promise<{ read: number; write: number }> {
		try {
			if (process.platform === 'linux') {
				try {
					const { stdout } = await execAsync('iostat -d 1 2 | tail -n +4 | head -n -1');
					const lines = stdout.trim().split('\n');
					let totalRead = 0;
					let totalWrite = 0;

					for (const line of lines) {
						const parts = line.trim().split(/\s+/);
						if (parts.length >= 4 && !parts[0].includes('Device')) {
							totalRead += parseFloat(parts[3]) || 0; // Read IOPS
							totalWrite += parseFloat(parts[4]) || 0; // Write IOPS
						}
					}

					return { read: totalRead, write: totalWrite };
				} catch (error) {
					this.logger.debug('iostat not available, using default values', { error: error.message });
				}
			}

			return { read: 0, write: 0 };
		} catch (error) {
			return { read: 0, write: 0 };
		}
	}

	private async getNetworkMetrics(): Promise<{
		interfaces: any[];
		totalBytesReceived: number;
		totalBytesSent: number;
	}> {
		try {
			const interfaces = networkInterfaces();
			const networkStats: any[] = [];
			let totalBytesReceived = 0;
			let totalBytesSent = 0;

			// Get basic interface information
			for (const [name, iface] of Object.entries(interfaces)) {
				if (iface) {
					for (const config of iface) {
						if (config.family === 'IPv4' && !config.internal) {
							networkStats.push({
								name,
								address: config.address,
								netmask: config.netmask,
								family: config.family,
								bytesReceived: 0, // Would need system-specific implementation
								bytesSent: 0,
								packetsReceived: 0,
								packetsSent: 0,
								errors: 0,
								drops: 0,
							});
						}
					}
				}
			}

			// Try to get network statistics on Linux
			if (process.platform === 'linux') {
				try {
					const netdev = await fs.readFile('/proc/net/dev', 'utf8');
					const lines = netdev.trim().split('\n').slice(2); // Skip headers

					for (const line of lines) {
						const parts = line.trim().split(/\s+/);
						if (parts.length >= 17) {
							const interfaceName = parts[0].replace(':', '');
							const bytesReceived = parseInt(parts[1]);
							const packetsReceived = parseInt(parts[2]);
							const bytesSent = parseInt(parts[9]);
							const packetsSent = parseInt(parts[10]);

							// Update interface stats
							const ifaceStats = networkStats.find((stat) => stat.name === interfaceName);
							if (ifaceStats) {
								ifaceStats.bytesReceived = bytesReceived;
								ifaceStats.bytesSent = bytesSent;
								ifaceStats.packetsReceived = packetsReceived;
								ifaceStats.packetsSent = packetsSent;

								totalBytesReceived += bytesReceived;
								totalBytesSent += bytesSent;
							}
						}
					}
				} catch (error) {
					this.logger.debug('Failed to read /proc/net/dev', { error: error.message });
				}
			}

			return {
				interfaces: networkStats,
				totalBytesReceived,
				totalBytesSent,
			};
		} catch (error) {
			this.logger.error('Failed to get network metrics', {
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				interfaces: [],
				totalBytesReceived: 0,
				totalBytesSent: 0,
			};
		}
	}

	private async getActiveWorkflowMetrics(): Promise<WorkflowProcessMetricsDto[]> {
		return Array.from(this.workflowExecutions.values()).map((execution) => ({
			workflowId: execution.workflowId,
			workflowName: 'Unknown', // Would need to fetch from workflow repository
			executionId: execution.executionId,
			pid: execution.pid,
			memory: execution.memoryStart || 0,
			cpu: 0, // Would need calculation
			uptime: Date.now() - execution.startTime,
			status: 'running' as const,
			executionTime: Date.now() - execution.startTime,
			nodeExecutions: 0, // Would need tracking
		}));
	}

	private analyzeCpuHealth(cpu: any): { healthy: boolean; score: number; issues: string[] } {
		const issues: string[] = [];
		let score = 100;

		if (cpu.usage > 90) {
			issues.push('Very high CPU usage');
			score -= 40;
		} else if (cpu.usage > 80) {
			issues.push('High CPU usage');
			score -= 20;
		}

		return {
			healthy: issues.length === 0,
			score: Math.max(0, score),
			issues,
		};
	}

	private analyzeMemoryHealth(memory: any): { healthy: boolean; score: number; issues: string[] } {
		const issues: string[] = [];
		let score = 100;

		if (memory.usagePercent > 95) {
			issues.push('Very high memory usage');
			score -= 40;
		} else if (memory.usagePercent > 85) {
			issues.push('High memory usage');
			score -= 20;
		}

		return {
			healthy: issues.length === 0,
			score: Math.max(0, score),
			issues,
		};
	}

	private analyzeDiskHealth(disk: any): { healthy: boolean; score: number; issues: string[] } {
		const issues: string[] = [];
		let score = 100;

		if (disk.usagePercent > 95) {
			issues.push('Very high disk usage');
			score -= 40;
		} else if (disk.usagePercent > 85) {
			issues.push('High disk usage');
			score -= 20;
		}

		return {
			healthy: issues.length === 0,
			score: Math.max(0, score),
			issues,
		};
	}

	private async analyzeWorkflowHealth(): Promise<{
		healthy: boolean;
		score: number;
		issues: string[];
	}> {
		const issues: string[] = [];
		let score = 100;

		const activeCount = this.workflowExecutions.size;
		if (activeCount > 50) {
			issues.push('Too many concurrent workflows');
			score -= 30;
		}

		return {
			healthy: issues.length === 0,
			score: Math.max(0, score),
			issues,
		};
	}

	private async analyzeNetworkHealth(): Promise<{
		healthy: boolean;
		score: number;
		issues: string[];
	}> {
		return {
			healthy: true,
			score: 100,
			issues: [],
		};
	}

	private generateHealthRecommendations(health: any): string[] {
		const recommendations: string[] = [];

		if (!health.cpu.healthy) {
			recommendations.push('Consider reducing CPU-intensive workflows or scaling horizontally');
		}
		if (!health.memory.healthy) {
			recommendations.push('Consider increasing system memory or optimizing memory usage');
		}
		if (!health.disk.healthy) {
			recommendations.push('Clean up old execution data or increase storage capacity');
		}
		if (!health.workflows.healthy) {
			recommendations.push('Consider implementing workflow throttling or queue management');
		}

		return recommendations;
	}

	private getActiveAlerts(): ResourceAlertDto[] {
		return this.alerts.filter((alert) => !alert.resolved).slice(0, 10);
	}

	private async checkWorkflowResourceAlerts(
		execution: WorkflowExecution,
		duration: number,
		memoryUsed: number,
		result: IExecutionResponse,
	): Promise<void> {
		// Check workflow-specific alerts
		const maxExecutionTime = this.config.alerts.thresholds.workflow.maxExecutionTime;
		const maxMemoryUsage = this.config.alerts.thresholds.workflow.maxMemoryUsage;

		if (duration > maxExecutionTime) {
			this.createAlert({
				type: 'workflow',
				severity: 'warning',
				message: `Workflow execution exceeded time limit: ${Math.round(duration / 1000)}s`,
				threshold: maxExecutionTime,
				currentValue: duration,
				workflowId: execution.workflowId,
			});
		}

		if (memoryUsed > maxMemoryUsage) {
			this.createAlert({
				type: 'workflow',
				severity: 'warning',
				message: `Workflow execution exceeded memory limit: ${Math.round(memoryUsed / 1024 / 1024)}MB`,
				threshold: maxMemoryUsage,
				currentValue: memoryUsed,
				workflowId: execution.workflowId,
			});
		}
	}

	private async updateWorkflowMetricsHistory(
		execution: WorkflowExecution,
		duration: number,
		memoryUsed: number,
		result: IExecutionResponse,
	): Promise<void> {
		// Update workflow metrics history
		// This would typically save to a database
	}

	private async evaluateAlertRule(rule: AlertRule, resources: any): Promise<boolean> {
		try {
			let currentValue: number;

			// Get the current value based on rule type and metric
			switch (rule.type) {
				case 'cpu':
					switch (rule.metric) {
						case 'usage':
							currentValue = resources.system.cpu.usage;
							break;
						case 'load':
							currentValue = resources.system.cpu.load[0]; // 1-minute load average
							break;
						default:
							this.logger.warn('Unknown CPU metric', { metric: rule.metric });
							return false;
					}
					break;

				case 'memory':
					switch (rule.metric) {
						case 'usagePercent':
							currentValue = resources.system.memory.usagePercent;
							break;
						case 'used':
							currentValue = resources.system.memory.used;
							break;
						case 'free':
							currentValue = resources.system.memory.free;
							break;
						default:
							this.logger.warn('Unknown memory metric', { metric: rule.metric });
							return false;
					}
					break;

				case 'disk':
					switch (rule.metric) {
						case 'usagePercent':
							currentValue = resources.system.disk.usagePercent;
							break;
						case 'used':
							currentValue = resources.system.disk.used;
							break;
						case 'free':
							currentValue = resources.system.disk.free;
							break;
						default:
							this.logger.warn('Unknown disk metric', { metric: rule.metric });
							return false;
					}
					break;

				case 'workflow':
					// For workflow-specific rules, check if we have workflow-specific resources
					if (rule.workflowId) {
						const workflowExecution = this.workflowExecutions.get(rule.workflowId);
						if (!workflowExecution) {
							return false; // Workflow not currently running
						}

						switch (rule.metric) {
							case 'executionTime':
								currentValue = Date.now() - workflowExecution.startTime;
								break;
							case 'memoryUsage':
								currentValue = workflowExecution.memoryStart || 0;
								break;
							default:
								this.logger.warn('Unknown workflow metric', { metric: rule.metric });
								return false;
						}
					} else {
						// System-wide workflow metrics
						switch (rule.metric) {
							case 'activeCount':
								currentValue = this.workflowExecutions.size;
								break;
							default:
								this.logger.warn('Unknown system workflow metric', { metric: rule.metric });
								return false;
						}
					}
					break;

				case 'system':
					switch (rule.metric) {
						case 'uptime':
							currentValue = resources.system.uptime;
							break;
						case 'processCount':
							currentValue = resources.processes.workers?.length || 1;
							break;
						default:
							this.logger.warn('Unknown system metric', { metric: rule.metric });
							return false;
					}
					break;

				default:
					this.logger.warn('Unknown rule type', { type: rule.type });
					return false;
			}

			// Evaluate the condition
			switch (rule.operator) {
				case '>':
					return currentValue > rule.threshold;
				case '<':
					return currentValue < rule.threshold;
				case '>=':
					return currentValue >= rule.threshold;
				case '<=':
					return currentValue <= rule.threshold;
				case '==':
					return currentValue === rule.threshold;
				case '!=':
					return currentValue !== rule.threshold;
				default:
					this.logger.warn('Unknown operator', { operator: rule.operator });
					return false;
			}
		} catch (error) {
			this.logger.error('Failed to evaluate alert rule', {
				ruleId: rule.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	private async triggerAlert(rule: AlertRule, resources: any): Promise<void> {
		try {
			// Update rule tracking
			rule.lastTriggered = new Date();
			rule.triggerCount++;

			// Get current value for the alert
			let currentValue = 0;
			switch (rule.type) {
				case 'cpu':
					currentValue =
						rule.metric === 'usage' ? resources.system.cpu.usage : resources.system.cpu.load[0];
					break;
				case 'memory':
					currentValue =
						rule.metric === 'usagePercent'
							? resources.system.memory.usagePercent
							: resources.system.memory[rule.metric as keyof typeof resources.system.memory] || 0;
					break;
				case 'disk':
					currentValue =
						rule.metric === 'usagePercent'
							? resources.system.disk.usagePercent
							: resources.system.disk[rule.metric as keyof typeof resources.system.disk] || 0;
					break;
				case 'workflow':
					if (rule.workflowId) {
						const execution = this.workflowExecutions.get(rule.workflowId);
						currentValue = execution
							? rule.metric === 'executionTime'
								? Date.now() - execution.startTime
								: execution.memoryStart || 0
							: 0;
					} else {
						currentValue = this.workflowExecutions.size;
					}
					break;
				case 'system':
					currentValue =
						rule.metric === 'uptime'
							? resources.system.uptime
							: resources.processes.workers?.length || 1;
					break;
			}

			// Create the alert
			this.createAlert({
				type: rule.type,
				severity: rule.severity,
				message: `${rule.name}: ${rule.metric} ${rule.operator} ${rule.threshold} (current: ${currentValue.toFixed(2)})`,
				threshold: rule.threshold,
				currentValue,
				workflowId: rule.workflowId,
				resourcePath:
					rule.type === 'workflow' && rule.workflowId
						? `workflow:${rule.workflowId}`
						: `system:${rule.type}`,
			});

			// Send notifications if configured
			if (rule.notifications.email || rule.notifications.webhook) {
				await this.sendAlertNotification(rule, currentValue);
			}

			this.logger.info('Alert triggered', {
				ruleId: rule.id,
				ruleName: rule.name,
				severity: rule.severity,
				currentValue,
				threshold: rule.threshold,
			});
		} catch (error) {
			this.logger.error('Failed to trigger alert', {
				ruleId: rule.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Send alert notifications
	 */
	private async sendAlertNotification(rule: AlertRule, currentValue: number): Promise<void> {
		try {
			const alertData = {
				ruleName: rule.name,
				severity: rule.severity,
				metric: rule.metric,
				threshold: rule.threshold,
				currentValue,
				timestamp: new Date().toISOString(),
				workflowId: rule.workflowId,
			};

			// Send webhook notification
			if (rule.notifications.webhook && rule.notifications.webhookUrl) {
				try {
					const response = await fetch(rule.notifications.webhookUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							type: 'n8n_system_alert',
							data: alertData,
						}),
					});

					if (!response.ok) {
						this.logger.warn('Webhook notification failed', {
							url: rule.notifications.webhookUrl,
							status: response.status,
						});
					} else {
						this.logger.debug('Webhook notification sent', {
							ruleId: rule.id,
							url: rule.notifications.webhookUrl,
						});
					}
				} catch (webhookError) {
					this.logger.error('Failed to send webhook notification', {
						ruleId: rule.id,
						error: webhookError instanceof Error ? webhookError.message : String(webhookError),
					});
				}
			}

			// Email notification would be implemented here
			if (rule.notifications.email) {
				this.logger.debug('Email notification requested but not implemented', {
					ruleId: rule.id,
				});
			}
		} catch (error) {
			this.logger.error('Failed to send alert notification', {
				ruleId: rule.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private createAlert(data: {
		type: 'cpu' | 'memory' | 'disk' | 'workflow' | 'system';
		severity: 'info' | 'warning' | 'critical';
		message: string;
		threshold: number;
		currentValue: number;
		workflowId?: string;
		resourcePath?: string;
	}): void {
		const alert: ResourceAlertDto = {
			id: this.generateId(),
			type: data.type,
			severity: data.severity,
			message: data.message,
			threshold: data.threshold,
			currentValue: data.currentValue,
			resourcePath: data.resourcePath,
			workflowId: data.workflowId,
			timestamp: new Date().toISOString(),
			resolved: false,
		};

		this.alerts.push(alert);
		this.emit('alert', alert);

		// Keep only recent alerts
		if (this.alerts.length > 1000) {
			this.alerts = this.alerts.slice(-1000);
		}
	}

	private async saveAlertRules(): Promise<void> {
		// Save alert rules to cache/database
		await this.cacheService.set(
			'monitoring:alert-rules',
			JSON.stringify(this.alertRules),
			this.config.retentionPeriod,
		);
	}

	private alertRuleToDto(rule: AlertRule): AlertRuleDto {
		return {
			id: rule.id,
			name: rule.name,
			description: rule.description,
			type: rule.type,
			metric: rule.metric,
			operator: rule.operator,
			threshold: rule.threshold,
			severity: rule.severity,
			enabled: rule.enabled,
			workflowId: rule.workflowId,
			notifications: rule.notifications,
			createdAt: rule.createdAt.toISOString(),
			updatedAt: rule.updatedAt.toISOString(),
			lastTriggered: rule.lastTriggered?.toISOString(),
			triggerCount: rule.triggerCount,
		};
	}

	private generateId(): string {
		return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Helper methods for node performance analysis
	 */
	private getTimeRangeCutoff(timeRange: string): number {
		const now = Date.now();
		switch (timeRange) {
			case '1h':
				return now - 60 * 60 * 1000;
			case '6h':
				return now - 6 * 60 * 60 * 1000;
			case '24h':
				return now - 24 * 60 * 60 * 1000;
			case '7d':
				return now - 7 * 24 * 60 * 60 * 1000;
			case '30d':
				return now - 30 * 24 * 60 * 60 * 1000;
			default:
				return now - 24 * 60 * 60 * 1000;
		}
	}

	private getIntervalMs(timeRange: string): number {
		switch (timeRange) {
			case '1h':
				return 5 * 60 * 1000; // 5 minute intervals
			case '6h':
				return 30 * 60 * 1000; // 30 minute intervals
			case '24h':
				return 60 * 60 * 1000; // 1 hour intervals
			case '7d':
				return 6 * 60 * 60 * 1000; // 6 hour intervals
			case '30d':
				return 24 * 60 * 60 * 1000; // 1 day intervals
			default:
				return 60 * 60 * 1000; // Default to 1 hour
		}
	}

	private average(numbers: number[]): number {
		if (numbers.length === 0) return 0;
		return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
	}

	private median(numbers: number[]): number {
		if (numbers.length === 0) return 0;
		const sorted = [...numbers].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}

	private percentile(numbers: number[], p: number): number {
		if (numbers.length === 0) return 0;
		const sorted = [...numbers].sort((a, b) => a - b);
		const index = Math.floor((p / 100) * sorted.length);
		return sorted[Math.min(index, sorted.length - 1)];
	}

	private categorizeError(error: string): string {
		const lowerError = error.toLowerCase();
		if (lowerError.includes('timeout')) return 'Timeout';
		if (lowerError.includes('memory')) return 'Memory Error';
		if (lowerError.includes('network') || lowerError.includes('connection')) return 'Network Error';
		if (lowerError.includes('permission') || lowerError.includes('auth')) return 'Permission Error';
		if (lowerError.includes('syntax') || lowerError.includes('parse')) return 'Syntax Error';
		return 'Other Error';
	}

	private generateNodeTrendData(executions: NodeExecution[], timeRange: string): any[] {
		// Group executions by time intervals
		const intervalMs = this.getIntervalMs(timeRange);
		const groupedData = this.groupExecutionsByInterval(executions, intervalMs);

		return groupedData.map(([timestamp, intervalExecutions]) => ({
			timestamp: new Date(timestamp).toISOString(),
			executionTime: this.average(intervalExecutions.map((e) => e.duration || 0)),
			memoryUsage: this.average(intervalExecutions.map((e) => e.memoryUsage || 0)),
			itemsProcessed: intervalExecutions.reduce((sum, e) => sum + e.inputItems + e.outputItems, 0),
			errorCount: intervalExecutions.filter((e) => e.status === 'error').length,
		}));
	}

	private groupExecutionsByInterval(
		executions: NodeExecution[],
		intervalMs: number,
	): Array<[number, NodeExecution[]]> {
		const grouped = new Map<number, NodeExecution[]>();

		executions.forEach((execution) => {
			const intervalStart = Math.floor(execution.startTime / intervalMs) * intervalMs;
			if (!grouped.has(intervalStart)) {
				grouped.set(intervalStart, []);
			}
			grouped.get(intervalStart)!.push(execution);
		});

		return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
	}

	private calculateDataTransformationRatio(executions: NodeExecution[]): number {
		const totalInput = executions.reduce((sum, e) => sum + e.inputItems, 0);
		const totalOutput = executions.reduce((sum, e) => sum + e.outputItems, 0);
		return totalInput > 0 ? totalOutput / totalInput : 0;
	}

	private calculateBottleneckScore(
		nodeExecutions: NodeExecution[],
		allExecutions: NodeExecution[],
	): number {
		const nodeAvgTime = this.average(nodeExecutions.map((e) => e.duration || 0));
		const allAvgTime = this.average(allExecutions.map((e) => e.duration || 0));
		const nodeErrorRate =
			(nodeExecutions.filter((e) => e.status === 'error').length / nodeExecutions.length) * 100;

		// Score based on relative execution time and error rate
		let score = 0;
		if (allAvgTime > 0) {
			score += Math.min((nodeAvgTime / allAvgTime) * 50, 50); // Max 50 points for execution time
		}
		score += Math.min(nodeErrorRate, 50); // Max 50 points for error rate

		return Math.round(score);
	}

	private generateNodeRecommendations(nodeMetrics: any[]): any[] {
		const recommendations: any[] = [];

		nodeMetrics.forEach((node) => {
			if (node.bottleneckScore > 80) {
				recommendations.push({
					nodeId: node.nodeId,
					issue: 'Critical bottleneck detected',
					suggestion: 'Consider optimizing this node or splitting into smaller operations',
					priority: 'high' as const,
				});
			} else if (node.executionTimePercent > 50) {
				recommendations.push({
					nodeId: node.nodeId,
					issue: 'High execution time contribution',
					suggestion: 'Review data processing logic and consider optimization',
					priority: 'medium' as const,
				});
			} else if (node.errorContribution > 30) {
				recommendations.push({
					nodeId: node.nodeId,
					issue: 'High error contribution',
					suggestion: 'Review error handling and input validation',
					priority: 'medium' as const,
				});
			}
		});

		return recommendations;
	}

	private calculateNodeProgress(node: NodeExecution): number | undefined {
		// Simple progress calculation based on execution time
		if (node.status === 'completed') return 100;
		if (node.status === 'error') return 0;
		if (node.status !== 'running') return undefined;

		// Estimate progress based on elapsed time (simple heuristic)
		const elapsed = Date.now() - node.startTime;
		const estimatedTotal = elapsed * 2; // Assume halfway through
		return Math.min(Math.round((elapsed / estimatedTotal) * 100), 95);
	}

	private estimateCompletionTime(executionId: string, nodeStatuses: any[]): string | undefined {
		const runningNodes = nodeStatuses.filter((n) => n.status === 'running');
		const completedNodes = nodeStatuses.filter((n) => n.status === 'completed');

		if (runningNodes.length === 0) return undefined;

		// Simple estimation based on average completion time of completed nodes
		if (completedNodes.length > 0) {
			const avgCompletionTime = this.average(completedNodes.map((n) => n.duration || 0));
			const estimatedRemaining = runningNodes.length * avgCompletionTime;
			return new Date(Date.now() + estimatedRemaining).toISOString();
		}

		return undefined;
	}

	private calculateExecutionPatterns(executions: NodeExecution[]): any {
		// Group by hour of day
		const hourlyPerformance = new Array(24).fill(0).map((_, hour) => ({
			hour,
			avgTime: 0,
		}));

		const hourlyGroups = new Array(24).fill(null).map(() => [] as number[]);

		executions.forEach((e) => {
			const hour = new Date(e.startTime).getHours();
			if (e.duration) {
				hourlyGroups[hour].push(e.duration);
			}
		});

		hourlyGroups.forEach((times, hour) => {
			hourlyPerformance[hour].avgTime = this.average(times);
		});

		// Group by day of week
		const dailyPerformance = [
			'Sunday',
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday',
			'Saturday',
		].map((day, index) => ({
			day,
			avgTime: 0,
		}));

		const dailyGroups = new Array(7).fill(null).map(() => [] as number[]);

		executions.forEach((e) => {
			const dayOfWeek = new Date(e.startTime).getDay();
			if (e.duration) {
				dailyGroups[dayOfWeek].push(e.duration);
			}
		});

		dailyGroups.forEach((times, day) => {
			dailyPerformance[day].avgTime = this.average(times);
		});

		// Calculate correlations (simplified)
		const inputSizes = executions.map((e) => e.inputItems);
		const executionTimes = executions.map((e) => e.duration || 0);
		const inputSizeImpact = this.calculateCorrelation(inputSizes, executionTimes);

		const hours = executions.map((e) => new Date(e.startTime).getHours());
		const timeOfDayImpact = this.calculateCorrelation(hours, executionTimes);

		return {
			timeOfDayPerformance: hourlyPerformance,
			dayOfWeekPerformance: dailyPerformance,
			correlations: {
				inputSizeImpact: isNaN(inputSizeImpact) ? 0 : inputSizeImpact,
				timeOfDayImpact: isNaN(timeOfDayImpact) ? 0 : timeOfDayImpact,
			},
		};
	}

	private calculateCorrelation(x: number[], y: number[]): number {
		if (x.length !== y.length || x.length === 0) return 0;

		const n = x.length;
		const sumX = x.reduce((a, b) => a + b, 0);
		const sumY = y.reduce((a, b) => a + b, 0);
		const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
		const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
		const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

		const numerator = n * sumXY - sumX * sumY;
		const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

		return denominator === 0 ? 0 : numerator / denominator;
	}

	private estimateNodeCpuUsage(duration?: number): number {
		// Simple heuristic for CPU usage estimation based on duration
		if (!duration) return 0;
		// Assume longer running nodes use more CPU (very rough estimate)
		return Math.min((duration / 1000) * 2, 100); // Cap at 100%
	}

	private async cleanupOldData(): Promise<void> {
		const cutoffTime = Date.now() - this.config.retentionPeriod;

		// Clean up old alerts
		this.alerts = this.alerts.filter((alert) => new Date(alert.timestamp).getTime() > cutoffTime);

		// Clean up old metrics history
		this.metricsHistory = this.metricsHistory.filter((metric) =>
			metric.timestamps.some((timestamp) => new Date(timestamp).getTime() > cutoffTime),
		);

		// Clean up old node execution history
		for (const [key, executions] of this.nodeExecutionHistory.entries()) {
			const recentExecutions = executions.filter((execution) => execution.startTime > cutoffTime);
			if (recentExecutions.length === 0) {
				this.nodeExecutionHistory.delete(key);
			} else {
				this.nodeExecutionHistory.set(key, recentExecutions);
			}
		}

		// Clean up completed live executions
		for (const [executionId, nodeMap] of this.liveExecutions.entries()) {
			const hasRunningNodes = Array.from(nodeMap.values()).some(
				(node) => node.status === 'running',
			);
			if (!hasRunningNodes) {
				// Keep for a short time to allow final queries
				const oldestNode = Array.from(nodeMap.values()).reduce((oldest, node) =>
					!oldest || node.startTime < oldest.startTime ? node : oldest,
				);
				if (oldestNode && Date.now() - oldestNode.startTime > 10 * 60 * 1000) {
					// 10 minutes
					this.liveExecutions.delete(executionId);
				}
			}
		}
	}
}
