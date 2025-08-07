'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SystemMonitoringService = void 0;
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const node_fs_1 = require('node:fs');
const node_child_process_1 = require('node:child_process');
const node_util_1 = require('node:util');
const node_os_1 = require('node:os');
const system_resources_service_1 = require('./system-resources.service');
const events_1 = require('events');
const db_1 = require('@n8n/db');
const db_2 = require('@n8n/db');
const cache_service_1 = require('@/services/cache/cache.service');
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
let SystemMonitoringService = class SystemMonitoringService extends events_1.EventEmitter {
	constructor(systemResourcesService, executionRepository, workflowRepository, cacheService) {
		super();
		this.systemResourcesService = systemResourcesService;
		this.executionRepository = executionRepository;
		this.workflowRepository = workflowRepository;
		this.cacheService = cacheService;
		this.logger = n8n_workflow_1.LoggerProxy;
		this.workflowExecutions = new Map();
		this.nodeExecutions = new Map();
		this.nodeExecutionHistory = new Map();
		this.liveExecutions = new Map();
		this.metricsHistory = [];
		this.workflowMetricsHistory = new Map();
		this.workflowResourceMetrics = new Map();
		this.workflowResourceHistory = new Map();
		this.alerts = [];
		this.alertRules = [];
		this.config = this.getDefaultConfig();
		this.initializeDefaultAlertRules();
	}
	async initialize() {
		try {
			this.logger.info('Initializing System Monitoring Service');
			await this.loadConfiguration();
			if (this.config.enabled) {
				await this.startMonitoring();
				await this.startWorkflowResourceMonitoring();
			}
			this.setupWorkflowTracking();
			this.logger.info('System Monitoring Service initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize System Monitoring Service', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError('Failed to initialize system monitoring service', {
				cause: error,
			});
		}
	}
	async getEnhancedSystemResources(options = {}) {
		try {
			const basicResources = await this.systemResourcesService.getCurrentResources({
				includeWorkers: options.includeWorkers,
				includeQueue: options.includeQueue,
			});
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
							uptime: worker.uptime || 0,
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
			throw new n8n_workflow_1.ApplicationError('Failed to get enhanced system resources', {
				cause: error,
			});
		}
	}
	async checkSystemHealth() {
		try {
			const resources = await this.systemResourcesService.getCurrentResources();
			const alerts = this.getActiveAlerts();
			const cpuHealth = this.analyzeCpuHealth(resources.system.cpu);
			const memoryHealth = this.analyzeMemoryHealth(resources.system.memory);
			const diskHealth = this.analyzeDiskHealth(resources.system.disk);
			const workflowHealth = await this.analyzeWorkflowHealth();
			const networkHealth = await this.analyzeNetworkHealth();
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
				alerts: alerts.slice(0, 10),
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
	trackWorkflowExecutionStart(data) {
		const { executionId, workflowData } = data;
		const workflowId = workflowData.id;
		if (!executionId || !workflowId) return;
		const execution = {
			workflowId,
			executionId,
			startTime: Date.now(),
			pid: process.pid,
			memoryStart: process.memoryUsage().rss,
			cpuStart: process.cpuUsage().user + process.cpuUsage().system,
			resourceSamples: [],
		};
		this.workflowExecutions.set(executionId, execution);
		if (!this.workflowResourceMetrics.has(workflowId)) {
			this.initializeWorkflowMetrics(workflowId, workflowData.name);
		}
		this.logger.debug('Started tracking workflow execution', {
			executionId,
			workflowId,
		});
		this.emit('workflowExecutionStart', {
			workflowId,
			executionId,
			startTime: execution.startTime,
		});
	}
	async trackWorkflowExecutionEnd(executionId, result) {
		const execution = this.workflowExecutions.get(executionId);
		if (!execution) return;
		try {
			const endTime = Date.now();
			const duration = endTime - execution.startTime;
			const memoryEnd = process.memoryUsage().rss;
			const memoryUsed = memoryEnd - (execution.memoryStart || 0);
			const cpuEnd = process.cpuUsage().user + process.cpuUsage().system;
			const cpuUsed = cpuEnd - (execution.cpuStart || 0);
			await this.updateWorkflowResourceMetrics(execution, duration, memoryUsed, cpuUsed, result);
			await this.checkWorkflowResourceAlerts(execution, duration, memoryUsed, result);
			await this.updateWorkflowMetricsHistory(execution, duration, memoryUsed, result);
			this.workflowExecutions.delete(executionId);
			this.emit('workflowExecutionEnd', {
				workflowId: execution.workflowId,
				executionId,
				duration,
				memoryUsed,
				cpuUsed,
				status: result.finished ? 'success' : 'error',
				resourceSamples: execution.resourceSamples || [],
			});
			this.logger.debug('Finished tracking workflow execution', {
				executionId,
				workflowId: execution.workflowId,
				duration,
				memoryUsed,
				cpuUsed,
				status: result.finished ? 'success' : 'error',
			});
		} catch (error) {
			this.logger.error('Failed to track workflow execution end', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	getAlerts(filter = {}) {
		let filteredAlerts = [...this.alerts];
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
			filteredAlerts = filteredAlerts.filter((a) => new Date(a.timestamp) >= filter.startDate);
		}
		if (filter.endDate) {
			filteredAlerts = filteredAlerts.filter((a) => new Date(a.timestamp) <= filter.endDate);
		}
		filteredAlerts.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
		const total = filteredAlerts.length;
		const unresolved = this.alerts.filter((a) => !a.resolved).length;
		const offset = filter.offset || 0;
		const limit = Math.min(filter.limit || 50, 500);
		const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);
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
	async createAlertRule(data) {
		const rule = {
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
	async updateAlertRule(id, data) {
		const rule = this.alertRules.find((r) => r.id === id);
		if (!rule) {
			throw new n8n_workflow_1.ApplicationError(`Alert rule with ID '${id}' not found`);
		}
		Object.assign(rule, {
			...data,
			updatedAt: new Date(),
		});
		await this.saveAlertRules();
		this.logger.info('Updated alert rule', { ruleId: id, name: rule.name });
		return this.alertRuleToDto(rule);
	}
	async deleteAlertRule(id) {
		const index = this.alertRules.findIndex((r) => r.id === id);
		if (index === -1) {
			throw new n8n_workflow_1.ApplicationError(`Alert rule with ID '${id}' not found`);
		}
		const rule = this.alertRules[index];
		this.alertRules.splice(index, 1);
		await this.saveAlertRules();
		this.logger.info('Deleted alert rule', { ruleId: id, name: rule.name });
	}
	getAlertRules() {
		const rules = this.alertRules.map((rule) => this.alertRuleToDto(rule));
		return {
			rules,
			total: rules.length,
			enabled: rules.filter((r) => r.enabled).length,
		};
	}
	getMetricsHistory(timeRange) {
		const now = Date.now();
		let cutoffTime;
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
	async getNodePerformanceMetrics(workflowId, nodeId, options) {
		try {
			const historyKey = `${workflowId}:${nodeId}`;
			const nodeHistory = this.nodeExecutionHistory.get(historyKey) || [];
			const cutoffTime = this.getTimeRangeCutoff(options.timeRange);
			const recentExecutions = nodeHistory.filter((execution) => execution.startTime >= cutoffTime);
			if (recentExecutions.length === 0) {
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
			const executionTimes = recentExecutions
				.filter((e) => e.duration)
				.map((e) => e.duration)
				.sort((a, b) => a - b);
			const memoryUsages = recentExecutions.filter((e) => e.memoryUsage).map((e) => e.memoryUsage);
			const cpuUsages = recentExecutions.filter((e) => e.cpuUsage).map((e) => e.cpuUsage);
			const errorTypes = new Map();
			failedExecutions.forEach((e) => {
				if (e.error) {
					const errorType = this.categorizeError(e.error);
					errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
				}
			});
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
			throw new n8n_workflow_1.ApplicationError('Failed to get node performance metrics', {
				cause: error,
			});
		}
	}
	async getWorkflowNodeBreakdown(workflowId, options) {
		try {
			const allNodeExecutions = new Map();
			const cutoffTime = this.getTimeRangeCutoff(options.timeRange);
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
			const allExecutions = Array.from(allNodeExecutions.values()).flat();
			const totalWorkflowTime = allExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
			const totalWorkflowMemory = allExecutions.reduce((sum, e) => sum + (e.memoryUsage || 0), 0);
			const totalWorkflowErrors = allExecutions.filter((e) => e.status === 'error').length;
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
			const sortedByBottleneck = [...nodeMetrics].sort(
				(a, b) => b.bottleneckScore - a.bottleneckScore,
			);
			const criticalPath = sortedByBottleneck.slice(0, 3).map((n) => n.nodeId);
			const bottleneckNodes = sortedByBottleneck
				.filter((n) => n.bottleneckScore > 70)
				.map((n) => n.nodeId);
			const recommendations = options.includeRecommendations
				? this.generateNodeRecommendations(nodeMetrics)
				: [];
			return {
				workflowId,
				workflowName: 'Workflow',
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
			throw new n8n_workflow_1.ApplicationError('Failed to get workflow node breakdown', {
				cause: error,
			});
		}
	}
	async getNodeTypePerformance(options) {
		try {
			const cutoffTime = this.getTimeRangeCutoff(options.timeRange);
			const nodeTypeMetrics = new Map();
			for (const executions of this.nodeExecutionHistory.values()) {
				const recentExecutions = executions.filter((e) => e.startTime >= cutoffTime);
				for (const execution of recentExecutions) {
					const nodeType = execution.nodeType;
					if (!nodeTypeMetrics.has(nodeType)) {
						nodeTypeMetrics.set(nodeType, []);
					}
					nodeTypeMetrics.get(nodeType).push(execution);
				}
			}
			const nodeTypeStats = Array.from(nodeTypeMetrics.entries()).map(([nodeType, executions]) => {
				const executionTimes = executions
					.filter((e) => e.duration)
					.map((e) => e.duration)
					.sort((a, b) => a - b);
				const memoryUsages = executions.filter((e) => e.memoryUsage).map((e) => e.memoryUsage);
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
						vsAverage: 0,
						ranking: 0,
					},
					topPerformingWorkflows: [],
					problematicWorkflows: [],
				};
			});
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
			throw new n8n_workflow_1.ApplicationError('Failed to get node type performance', {
				cause: error,
			});
		}
	}
	async getLiveNodeExecution(executionId) {
		try {
			const liveNodes = this.liveExecutions.get(executionId);
			if (!liveNodes) {
				throw new n8n_workflow_1.ApplicationError(
					`Execution '${executionId}' not found or not active`,
				);
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
			throw new n8n_workflow_1.ApplicationError('Failed to get live node execution', {
				cause: error,
			});
		}
	}
	async getNodePerformanceHistory(workflowId, nodeId, timeRange) {
		try {
			const historyKey = `${workflowId}:${nodeId}`;
			const nodeHistory = this.nodeExecutionHistory.get(historyKey) || [];
			const cutoffTime = this.getTimeRangeCutoff(timeRange);
			const recentExecutions = nodeHistory.filter((execution) => execution.startTime >= cutoffTime);
			const intervalMs = this.getIntervalMs(timeRange);
			const groupedData = this.groupExecutionsByInterval(recentExecutions, intervalMs);
			const timestamps = [];
			const executionTimes = [];
			const memoryUsages = [];
			const inputCounts = [];
			const outputCounts = [];
			const errorCounts = [];
			groupedData.forEach(([timestamp, executions]) => {
				timestamps.push(new Date(timestamp).toISOString());
				executionTimes.push(this.average(executions.map((e) => e.duration || 0)));
				memoryUsages.push(this.average(executions.map((e) => e.memoryUsage || 0)));
				inputCounts.push(this.average(executions.map((e) => e.inputItems)));
				outputCounts.push(this.average(executions.map((e) => e.outputItems)));
				errorCounts.push(executions.filter((e) => e.status === 'error').length);
			});
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
			throw new n8n_workflow_1.ApplicationError('Failed to get node performance history', {
				cause: error,
			});
		}
	}
	trackNodeExecutionStart(executionId, nodeId, nodeType, nodeName, workflowId) {
		const nodeExecution = {
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
		if (!this.liveExecutions.has(executionId)) {
			this.liveExecutions.set(executionId, new Map());
		}
		this.liveExecutions.get(executionId).set(nodeId, nodeExecution);
		const key = `${executionId}:${nodeId}`;
		this.nodeExecutions.set(key, nodeExecution);
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
	trackNodeExecutionEnd(executionId, nodeId, result) {
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
		nodeExecution.memoryUsage = process.memoryUsage().rss;
		nodeExecution.cpuUsage = this.estimateNodeCpuUsage(nodeExecution.duration);
		const liveNodes = this.liveExecutions.get(executionId);
		if (liveNodes) {
			liveNodes.set(nodeId, nodeExecution);
		}
		const historyKey = `${nodeExecution.workflowId}:${nodeId}`;
		if (!this.nodeExecutionHistory.has(historyKey)) {
			this.nodeExecutionHistory.set(historyKey, []);
		}
		this.nodeExecutionHistory.get(historyKey).push({ ...nodeExecution });
		this.nodeExecutions.delete(key);
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
	async getWorkflowResourceMetrics(workflowId, timeRange) {
		const metrics = this.workflowResourceMetrics.get(workflowId);
		if (!metrics) return null;
		if (timeRange) {
			const cutoffTime = this.getTimeRangeCutoff(timeRange);
			const filteredSamples = metrics.samples.filter((sample) => sample.timestamp >= cutoffTime);
			return { ...metrics, samples: filteredSamples };
		}
		return metrics;
	}
	async getAllWorkflowResourceMetrics(timeRange) {
		const result = new Map();
		for (const [workflowId, metrics] of this.workflowResourceMetrics.entries()) {
			if (timeRange) {
				const cutoffTime = this.getTimeRangeCutoff(timeRange);
				const filteredSamples = metrics.samples.filter((sample) => sample.timestamp >= cutoffTime);
				result.set(workflowId, { ...metrics, samples: filteredSamples });
			} else {
				result.set(workflowId, metrics);
			}
		}
		return result;
	}
	async getWorkflowResourceComparison(workflowIds, timeRange) {
		const comparisons = [];
		for (const workflowId of workflowIds) {
			const metrics = await this.getWorkflowResourceMetrics(workflowId, timeRange);
			if (metrics) {
				comparisons.push(metrics);
			}
		}
		return comparisons.sort((a, b) => b.totalResourceCost - a.totalResourceCost);
	}
	getWorkflowResourceAlerts(workflowId) {
		let alerts = this.alerts.filter((alert) => alert.type === 'workflow');
		if (workflowId) {
			alerts = alerts.filter((alert) => alert.workflowId === workflowId);
		}
		return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}
	async startMonitoring() {
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
	stopMonitoring() {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
		}
		this.stopWorkflowResourceMonitoring();
		this.logger.info('System monitoring stopped');
	}
	async collectMetrics() {
		try {
			const resources = await this.systemResourcesService.getCurrentResources();
			const activeWorkflowCount = this.workflowExecutions.size;
			const queueSize = resources.queue?.waiting || 0;
			const metricsEntry = {
				timestamps: [new Date().toISOString()],
				cpu: [resources.system.cpu.usage],
				memory: [resources.system.memory.usagePercent],
				disk: [resources.system.disk.usagePercent],
				activeWorkflows: [activeWorkflowCount],
				queueSize: [queueSize],
			};
			this.metricsHistory.push(metricsEntry);
			const maxHistoryEntries = 24 * 60;
			if (this.metricsHistory.length > maxHistoryEntries) {
				this.metricsHistory = this.metricsHistory.slice(-maxHistoryEntries);
			}
		} catch (error) {
			this.logger.error('Failed to collect metrics', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async checkAlertRules() {
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
	setupWorkflowTracking() {
		this.logger.debug('Workflow tracking setup completed');
	}
	async getEnhancedSystemMetrics(includeDetailed, includeNetworking) {
		const totalMemory = (0, node_os_1.totalmem)();
		const freeMemory = (0, node_os_1.freemem)();
		const usedMemory = totalMemory - freeMemory;
		const loadAverages = (0, node_os_1.loadavg)();
		const cpuCount = (0, node_os_1.cpus)().length;
		const cpuMetrics = {
			usage: await this.getCpuUsage(),
			cores: cpuCount,
			load: [loadAverages[0], loadAverages[1], loadAverages[2]],
			...(includeDetailed && {
				perCore: await this.getPerCoreCpuUsage(),
				temperature: await this.getCpuTemperature(),
				throttling: await this.getCpuThrottling(),
			}),
		};
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
		const diskMetrics = {
			total: 100 * 1024 * 1024 * 1024,
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
			uptime: (0, node_os_1.uptime)() * 1000,
			platform: (0, node_os_1.platform)(),
			architecture: (0, node_os_1.arch)(),
			nodeVersion: process.version,
		};
	}
	getDefaultConfig() {
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
	async loadConfiguration() {}
	initializeDefaultAlertRules() {
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
			{
				id: 'workflow-long-execution',
				name: 'Workflow Long Execution Time',
				type: 'workflow',
				metric: 'executionTime',
				operator: '>',
				threshold: 300000,
				severity: 'warning',
				enabled: true,
				notifications: { email: false, webhook: false },
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
			},
			{
				id: 'workflow-high-memory',
				name: 'Workflow High Memory Usage',
				type: 'workflow',
				metric: 'memoryUsage',
				operator: '>',
				threshold: 1024 * 1024 * 1024,
				severity: 'warning',
				enabled: true,
				notifications: { email: false, webhook: false },
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
			},
			{
				id: 'workflow-excessive-resource-cost',
				name: 'Workflow Excessive Resource Cost',
				type: 'workflow',
				metric: 'resourceCost',
				operator: '>',
				threshold: 100,
				severity: 'critical',
				enabled: true,
				notifications: { email: false, webhook: false },
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
			},
		];
	}
	async getCpuUsage() {
		try {
			const resources = await this.systemResourcesService.getCurrentResources();
			return resources.system.cpu.usage;
		} catch (error) {
			this.logger.error('Failed to get CPU usage', {
				error: error instanceof Error ? error.message : String(error),
			});
			return 0;
		}
	}
	async getPerCoreCpuUsage() {
		try {
			const totalUsage = await this.getCpuUsage();
			const coreCount = (0, node_os_1.cpus)().length;
			return (0, node_os_1.cpus)().map(() => {
				const variation = (Math.random() - 0.5) * 20;
				return Math.max(0, Math.min(100, totalUsage + variation));
			});
		} catch (error) {
			return (0, node_os_1.cpus)().map(() => 0);
		}
	}
	async getCpuTemperature() {
		try {
			if (process.platform === 'linux') {
				try {
					const tempData = await node_fs_1.promises.readFile(
						'/sys/class/thermal/thermal_zone0/temp',
						'utf8',
					);
					const tempCelsius = parseInt(tempData.trim()) / 1000;
					return tempCelsius;
				} catch (tempError) {
					return undefined;
				}
			}
			return undefined;
		} catch (error) {
			return undefined;
		}
	}
	async getCpuThrottling() {
		try {
			if (process.platform === 'linux') {
				try {
					const cpuFreqData = await node_fs_1.promises.readFile('/proc/cpuinfo', 'utf8');
					const currentFreq = await node_fs_1.promises.readFile(
						'/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq',
						'utf8',
					);
					const maxFreq = await node_fs_1.promises.readFile(
						'/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq',
						'utf8',
					);
					const current = parseInt(currentFreq.trim());
					const max = parseInt(maxFreq.trim());
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
	async getCachedMemory() {
		try {
			if (process.platform === 'linux') {
				const meminfo = await node_fs_1.promises.readFile('/proc/meminfo', 'utf8');
				const cachedMatch = meminfo.match(/^Cached:\s+(\d+)\s+kB/m);
				if (cachedMatch) {
					return parseInt(cachedMatch[1]) * 1024;
				}
			}
			return 0;
		} catch (error) {
			return 0;
		}
	}
	async getBufferMemory() {
		try {
			if (process.platform === 'linux') {
				const meminfo = await node_fs_1.promises.readFile('/proc/meminfo', 'utf8');
				const buffersMatch = meminfo.match(/^Buffers:\s+(\d+)\s+kB/m);
				if (buffersMatch) {
					return parseInt(buffersMatch[1]) * 1024;
				}
			}
			return 0;
		} catch (error) {
			return 0;
		}
	}
	async getSwapInfo() {
		try {
			if (process.platform === 'linux') {
				const meminfo = await node_fs_1.promises.readFile('/proc/meminfo', 'utf8');
				const swapTotalMatch = meminfo.match(/^SwapTotal:\s+(\d+)\s+kB/m);
				const swapFreeMatch = meminfo.match(/^SwapFree:\s+(\d+)\s+kB/m);
				if (swapTotalMatch && swapFreeMatch) {
					const total = parseInt(swapTotalMatch[1]) * 1024;
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
	async getDiskVolumes() {
		try {
			const volumes = [];
			if (process.platform === 'linux' || process.platform === 'darwin') {
				try {
					const { stdout } = await execAsync('df -h');
					const lines = stdout.trim().split('\n').slice(1);
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
	async getDiskIOPS() {
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
							totalRead += parseFloat(parts[3]) || 0;
							totalWrite += parseFloat(parts[4]) || 0;
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
	async getNetworkMetrics() {
		try {
			const interfaces = (0, node_os_1.networkInterfaces)();
			const networkStats = [];
			let totalBytesReceived = 0;
			let totalBytesSent = 0;
			for (const [name, iface] of Object.entries(interfaces)) {
				if (iface) {
					for (const config of iface) {
						if (config.family === 'IPv4' && !config.internal) {
							networkStats.push({
								name,
								address: config.address,
								netmask: config.netmask,
								family: config.family,
								bytesReceived: 0,
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
			if (process.platform === 'linux') {
				try {
					const netdev = await node_fs_1.promises.readFile('/proc/net/dev', 'utf8');
					const lines = netdev.trim().split('\n').slice(2);
					for (const line of lines) {
						const parts = line.trim().split(/\s+/);
						if (parts.length >= 17) {
							const interfaceName = parts[0].replace(':', '');
							const bytesReceived = parseInt(parts[1]);
							const packetsReceived = parseInt(parts[2]);
							const bytesSent = parseInt(parts[9]);
							const packetsSent = parseInt(parts[10]);
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
	async getActiveWorkflowMetrics() {
		return Array.from(this.workflowExecutions.values()).map((execution) => ({
			workflowId: execution.workflowId,
			workflowName: 'Unknown',
			executionId: execution.executionId,
			pid: execution.pid,
			memory: execution.memoryStart || 0,
			cpu: 0,
			uptime: Date.now() - execution.startTime,
			status: 'running',
			executionTime: Date.now() - execution.startTime,
			nodeExecutions: 0,
		}));
	}
	analyzeCpuHealth(cpu) {
		const issues = [];
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
	analyzeMemoryHealth(memory) {
		const issues = [];
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
	analyzeDiskHealth(disk) {
		const issues = [];
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
	async analyzeWorkflowHealth() {
		const issues = [];
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
	async analyzeNetworkHealth() {
		return {
			healthy: true,
			score: 100,
			issues: [],
		};
	}
	generateHealthRecommendations(health) {
		const recommendations = [];
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
	getActiveAlerts() {
		return this.alerts.filter((alert) => !alert.resolved).slice(0, 10);
	}
	async checkWorkflowResourceAlerts(execution, duration, memoryUsed, result) {
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
	async updateWorkflowMetricsHistory(execution, duration, memoryUsed, result) {}
	async evaluateAlertRule(rule, resources) {
		try {
			let currentValue;
			switch (rule.type) {
				case 'cpu':
					switch (rule.metric) {
						case 'usage':
							currentValue = resources.system.cpu.usage;
							break;
						case 'load':
							currentValue = resources.system.cpu.load[0];
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
					if (rule.workflowId) {
						const workflowExecution = this.workflowExecutions.get(rule.workflowId);
						if (!workflowExecution) {
							return false;
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
	async triggerAlert(rule, resources) {
		try {
			rule.lastTriggered = new Date();
			rule.triggerCount++;
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
							: resources.system.memory[rule.metric] || 0;
					break;
				case 'disk':
					currentValue =
						rule.metric === 'usagePercent'
							? resources.system.disk.usagePercent
							: resources.system.disk[rule.metric] || 0;
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
	async sendAlertNotification(rule, currentValue) {
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
	createAlert(data) {
		const alert = {
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
		if (this.alerts.length > 1000) {
			this.alerts = this.alerts.slice(-1000);
		}
	}
	async saveAlertRules() {
		await this.cacheService.set(
			'monitoring:alert-rules',
			JSON.stringify(this.alertRules),
			this.config.retentionPeriod,
		);
	}
	alertRuleToDto(rule) {
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
	generateId() {
		return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
	getTimeRangeCutoff(timeRange) {
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
	getIntervalMs(timeRange) {
		switch (timeRange) {
			case '1h':
				return 5 * 60 * 1000;
			case '6h':
				return 30 * 60 * 1000;
			case '24h':
				return 60 * 60 * 1000;
			case '7d':
				return 6 * 60 * 60 * 1000;
			case '30d':
				return 24 * 60 * 60 * 1000;
			default:
				return 60 * 60 * 1000;
		}
	}
	average(numbers) {
		if (numbers.length === 0) return 0;
		return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
	}
	median(numbers) {
		if (numbers.length === 0) return 0;
		const sorted = [...numbers].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}
	percentile(numbers, p) {
		if (numbers.length === 0) return 0;
		const sorted = [...numbers].sort((a, b) => a - b);
		const index = Math.floor((p / 100) * sorted.length);
		return sorted[Math.min(index, sorted.length - 1)];
	}
	categorizeError(error) {
		const lowerError = error.toLowerCase();
		if (lowerError.includes('timeout')) return 'Timeout';
		if (lowerError.includes('memory')) return 'Memory Error';
		if (lowerError.includes('network') || lowerError.includes('connection')) return 'Network Error';
		if (lowerError.includes('permission') || lowerError.includes('auth')) return 'Permission Error';
		if (lowerError.includes('syntax') || lowerError.includes('parse')) return 'Syntax Error';
		return 'Other Error';
	}
	generateNodeTrendData(executions, timeRange) {
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
	groupExecutionsByInterval(executions, intervalMs) {
		const grouped = new Map();
		executions.forEach((execution) => {
			const intervalStart = Math.floor(execution.startTime / intervalMs) * intervalMs;
			if (!grouped.has(intervalStart)) {
				grouped.set(intervalStart, []);
			}
			grouped.get(intervalStart).push(execution);
		});
		return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
	}
	calculateDataTransformationRatio(executions) {
		const totalInput = executions.reduce((sum, e) => sum + e.inputItems, 0);
		const totalOutput = executions.reduce((sum, e) => sum + e.outputItems, 0);
		return totalInput > 0 ? totalOutput / totalInput : 0;
	}
	calculateBottleneckScore(nodeExecutions, allExecutions) {
		const nodeAvgTime = this.average(nodeExecutions.map((e) => e.duration || 0));
		const allAvgTime = this.average(allExecutions.map((e) => e.duration || 0));
		const nodeErrorRate =
			(nodeExecutions.filter((e) => e.status === 'error').length / nodeExecutions.length) * 100;
		let score = 0;
		if (allAvgTime > 0) {
			score += Math.min((nodeAvgTime / allAvgTime) * 50, 50);
		}
		score += Math.min(nodeErrorRate, 50);
		return Math.round(score);
	}
	generateNodeRecommendations(nodeMetrics) {
		const recommendations = [];
		nodeMetrics.forEach((node) => {
			if (node.bottleneckScore > 80) {
				recommendations.push({
					nodeId: node.nodeId,
					issue: 'Critical bottleneck detected',
					suggestion: 'Consider optimizing this node or splitting into smaller operations',
					priority: 'high',
				});
			} else if (node.executionTimePercent > 50) {
				recommendations.push({
					nodeId: node.nodeId,
					issue: 'High execution time contribution',
					suggestion: 'Review data processing logic and consider optimization',
					priority: 'medium',
				});
			} else if (node.errorContribution > 30) {
				recommendations.push({
					nodeId: node.nodeId,
					issue: 'High error contribution',
					suggestion: 'Review error handling and input validation',
					priority: 'medium',
				});
			}
		});
		return recommendations;
	}
	calculateNodeProgress(node) {
		if (node.status === 'completed') return 100;
		if (node.status === 'error') return 0;
		if (node.status !== 'running') return undefined;
		const elapsed = Date.now() - node.startTime;
		const estimatedTotal = elapsed * 2;
		return Math.min(Math.round((elapsed / estimatedTotal) * 100), 95);
	}
	estimateCompletionTime(executionId, nodeStatuses) {
		const runningNodes = nodeStatuses.filter((n) => n.status === 'running');
		const completedNodes = nodeStatuses.filter((n) => n.status === 'completed');
		if (runningNodes.length === 0) return undefined;
		if (completedNodes.length > 0) {
			const avgCompletionTime = this.average(completedNodes.map((n) => n.duration || 0));
			const estimatedRemaining = runningNodes.length * avgCompletionTime;
			return new Date(Date.now() + estimatedRemaining).toISOString();
		}
		return undefined;
	}
	calculateExecutionPatterns(executions) {
		const hourlyPerformance = new Array(24).fill(0).map((_, hour) => ({
			hour,
			avgTime: 0,
		}));
		const hourlyGroups = new Array(24).fill(null).map(() => []);
		executions.forEach((e) => {
			const hour = new Date(e.startTime).getHours();
			if (e.duration) {
				hourlyGroups[hour].push(e.duration);
			}
		});
		hourlyGroups.forEach((times, hour) => {
			hourlyPerformance[hour].avgTime = this.average(times);
		});
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
		const dailyGroups = new Array(7).fill(null).map(() => []);
		executions.forEach((e) => {
			const dayOfWeek = new Date(e.startTime).getDay();
			if (e.duration) {
				dailyGroups[dayOfWeek].push(e.duration);
			}
		});
		dailyGroups.forEach((times, day) => {
			dailyPerformance[day].avgTime = this.average(times);
		});
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
	calculateCorrelation(x, y) {
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
	estimateNodeCpuUsage(duration) {
		if (!duration) return 0;
		return Math.min((duration / 1000) * 2, 100);
	}
	async cleanupOldData() {
		const cutoffTime = Date.now() - this.config.retentionPeriod;
		this.alerts = this.alerts.filter((alert) => new Date(alert.timestamp).getTime() > cutoffTime);
		this.metricsHistory = this.metricsHistory.filter((metric) =>
			metric.timestamps.some((timestamp) => new Date(timestamp).getTime() > cutoffTime),
		);
		for (const [key, executions] of this.nodeExecutionHistory.entries()) {
			const recentExecutions = executions.filter((execution) => execution.startTime > cutoffTime);
			if (recentExecutions.length === 0) {
				this.nodeExecutionHistory.delete(key);
			} else {
				this.nodeExecutionHistory.set(key, recentExecutions);
			}
		}
		for (const [workflowId, samples] of this.workflowResourceHistory.entries()) {
			const recentSamples = samples.filter((sample) => sample.timestamp > cutoffTime);
			if (recentSamples.length === 0) {
				this.workflowResourceHistory.delete(workflowId);
			} else {
				this.workflowResourceHistory.set(workflowId, recentSamples);
			}
		}
		for (const [workflowId, metrics] of this.workflowResourceMetrics.entries()) {
			const recentSamples = metrics.samples.filter((sample) => sample.timestamp > cutoffTime);
			metrics.samples = recentSamples;
		}
		for (const [executionId, nodeMap] of this.liveExecutions.entries()) {
			const hasRunningNodes = Array.from(nodeMap.values()).some(
				(node) => node.status === 'running',
			);
			if (!hasRunningNodes) {
				const oldestNode = Array.from(nodeMap.values()).reduce((oldest, node) =>
					!oldest || node.startTime < oldest.startTime ? node : oldest,
				);
				if (oldestNode && Date.now() - oldestNode.startTime > 10 * 60 * 1000) {
					this.liveExecutions.delete(executionId);
				}
			}
		}
	}
	async startWorkflowResourceMonitoring() {
		if (this.workflowSamplingInterval) {
			clearInterval(this.workflowSamplingInterval);
		}
		this.workflowSamplingInterval = setInterval(async () => {
			try {
				await this.sampleWorkflowResources();
			} catch (error) {
				this.logger.error('Error during workflow resource sampling', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}, 5000);
		this.logger.info('Workflow resource monitoring started');
	}
	stopWorkflowResourceMonitoring() {
		if (this.workflowSamplingInterval) {
			clearInterval(this.workflowSamplingInterval);
			this.workflowSamplingInterval = undefined;
		}
		this.logger.info('Workflow resource monitoring stopped');
	}
	async sampleWorkflowResources() {
		const currentMemory = process.memoryUsage();
		const currentCpu = process.cpuUsage();
		const timestamp = Date.now();
		for (const [executionId, execution] of this.workflowExecutions.entries()) {
			try {
				const memoryUsage = currentMemory.rss - (execution.memoryStart || 0);
				const cpuUsage = currentCpu.user + currentCpu.system - (execution.cpuStart || 0);
				const activeNodes = this.liveExecutions.get(executionId)?.size || 0;
				const sample = {
					timestamp,
					memoryUsage: Math.max(0, memoryUsage),
					cpuUsage: Math.max(0, cpuUsage),
					activeNodes,
				};
				if (!execution.resourceSamples) {
					execution.resourceSamples = [];
				}
				execution.resourceSamples.push(sample);
				if (execution.resourceSamples.length > 100) {
					execution.resourceSamples.shift();
				}
				const workflowHistory = this.workflowResourceHistory.get(execution.workflowId) || [];
				workflowHistory.push(sample);
				if (workflowHistory.length > 1000) {
					workflowHistory.shift();
				}
				this.workflowResourceHistory.set(execution.workflowId, workflowHistory);
			} catch (error) {
				this.logger.error('Failed to sample workflow resources', {
					executionId,
					workflowId: execution.workflowId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
	initializeWorkflowMetrics(workflowId, workflowName) {
		const metrics = {
			workflowId,
			workflowName,
			totalExecutions: 0,
			averageExecutionTime: 0,
			averageMemoryUsage: 0,
			peakMemoryUsage: 0,
			averageCpuUsage: 0,
			peakCpuUsage: 0,
			totalResourceCost: 0,
			resourceEfficiency: 0,
			lastExecuted: new Date(),
			samples: [],
		};
		this.workflowResourceMetrics.set(workflowId, metrics);
		this.logger.debug('Initialized workflow metrics', { workflowId, workflowName });
	}
	async updateWorkflowResourceMetrics(execution, duration, memoryUsed, cpuUsed, result) {
		const workflowId = execution.workflowId;
		let metrics = this.workflowResourceMetrics.get(workflowId);
		if (!metrics) {
			this.initializeWorkflowMetrics(workflowId);
			metrics = this.workflowResourceMetrics.get(workflowId);
		}
		metrics.totalExecutions++;
		metrics.averageExecutionTime =
			(metrics.averageExecutionTime * (metrics.totalExecutions - 1) + duration) /
			metrics.totalExecutions;
		metrics.averageMemoryUsage =
			(metrics.averageMemoryUsage * (metrics.totalExecutions - 1) + memoryUsed) /
			metrics.totalExecutions;
		metrics.peakMemoryUsage = Math.max(metrics.peakMemoryUsage, memoryUsed);
		const avgCpuForExecution = execution.resourceSamples
			? this.average(execution.resourceSamples.map((s) => s.cpuUsage))
			: cpuUsed;
		metrics.averageCpuUsage =
			(metrics.averageCpuUsage * (metrics.totalExecutions - 1) + avgCpuForExecution) /
			metrics.totalExecutions;
		const peakCpuForExecution = execution.resourceSamples
			? Math.max(...execution.resourceSamples.map((s) => s.cpuUsage))
			: cpuUsed;
		metrics.peakCpuUsage = Math.max(metrics.peakCpuUsage, peakCpuForExecution);
		const resourceCost =
			(avgCpuForExecution / 1000000) * (memoryUsed / 1024 / 1024) * (duration / 1000);
		metrics.totalResourceCost += resourceCost;
		const successfulExecutions = result.finished ? 1 : 0;
		metrics.resourceEfficiency =
			metrics.totalResourceCost > 0 ? (successfulExecutions / metrics.totalResourceCost) * 100 : 0;
		metrics.lastExecuted = new Date();
		if (execution.resourceSamples) {
			metrics.samples.push(...execution.resourceSamples);
			if (metrics.samples.length > 10000) {
				metrics.samples = metrics.samples.slice(-10000);
			}
		}
		this.logger.debug('Updated workflow resource metrics', {
			workflowId,
			totalExecutions: metrics.totalExecutions,
			averageExecutionTime: metrics.averageExecutionTime,
			resourceCost,
		});
	}
};
exports.SystemMonitoringService = SystemMonitoringService;
exports.SystemMonitoringService = SystemMonitoringService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			system_resources_service_1.SystemResourcesService,
			db_1.ExecutionRepository,
			db_2.WorkflowRepository,
			cache_service_1.CacheService,
		]),
	],
	SystemMonitoringService,
);
//# sourceMappingURL=system-monitoring.service.js.map
