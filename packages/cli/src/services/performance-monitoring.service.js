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
exports.PerformanceMonitoringService = void 0;
const n8n_workflow_1 = require('n8n-workflow');
const di_1 = require('@n8n/di');
const active_executions_1 = require('@/active-executions');
const execution_service_1 = require('@/executions/execution.service');
let PerformanceMonitoringService = class PerformanceMonitoringService {
	constructor(executionService, activeExecutions) {
		this.executionService = executionService;
		this.activeExecutions = activeExecutions;
		this.logger = n8n_workflow_1.LoggerProxy;
	}
	async getExecutionProfile(executionId, options = {}) {
		try {
			const execution = await this.executionService.findOne(executionId, {
				includeData: true,
			});
			if (!execution) {
				throw new n8n_workflow_1.ApplicationError('Execution not found', {
					extra: { executionId },
				});
			}
			const isActive = this.activeExecutions.has(executionId);
			const executionData = execution.data;
			const runData = executionData?.resultData?.runData || {};
			const startedAt = execution.startedAt;
			const finishedAt = execution.finished ? execution.stoppedAt : null;
			const duration =
				startedAt && finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined;
			const profile = {
				executionId,
				workflowId: execution.workflowId,
				status: this.mapExecutionStatus(execution.status),
				timing: {
					startedAt: startedAt?.toISOString() || new Date().toISOString(),
					finishedAt: finishedAt?.toISOString(),
					duration,
					queueTime: this.calculateQueueTime(execution),
				},
				performance: {
					nodeExecutions: this.analyzeNodeExecutions(runData),
					totalMemoryPeak: this.calculateMemoryPeak(runData, options.includeResourceMetrics),
					resourceUtilization: {
						cpuPercent: options.includeResourceMetrics ? this.estimateCpuUsage(runData) : undefined,
						memoryMB: options.includeResourceMetrics
							? this.estimateMemoryUsage(runData)
							: undefined,
						ioOperations: options.includeResourceMetrics
							? this.estimateIoOperations(runData)
							: undefined,
					},
				},
				bottlenecks: options.includeBottlenecks ? this.detectBottlenecks(runData) : [],
			};
			return profile;
		} catch (error) {
			this.logger.error('Failed to generate execution profile', {
				executionId,
				error: error.message,
			});
			throw new n8n_workflow_1.ApplicationError('Failed to generate execution profile', {
				cause: error,
				extra: { executionId },
			});
		}
	}
	async getPerformanceMetrics(request) {
		try {
			const { timeRange, startDate, endDate } = this.parseTimeRange(request);
			const executions = [];
			const metrics = this.calculateAggregatedMetrics(executions, timeRange);
			return {
				timeRange: {
					start: startDate.toISOString(),
					end: endDate.toISOString(),
				},
				filters: {
					workflowId: request.workflowId,
					status: request.status?.split(','),
				},
				metrics,
			};
		} catch (error) {
			this.logger.error('Failed to get performance metrics', {
				request,
				error: error.message,
			});
			throw new n8n_workflow_1.ApplicationError('Failed to get performance metrics', {
				cause: error,
				extra: { request },
			});
		}
	}
	mapExecutionStatus(status) {
		switch (status) {
			case 'new':
				return 'new';
			case 'running':
				return 'running';
			case 'success':
				return 'success';
			case 'error':
				return 'error';
			case 'canceled':
				return 'canceled';
			case 'crashed':
				return 'crashed';
			case 'waiting':
				return 'waiting';
			default:
				return 'error';
		}
	}
	calculateQueueTime(execution) {
		return undefined;
	}
	analyzeNodeExecutions(runData) {
		const nodeExecutions = [];
		for (const [nodeId, nodeData] of Object.entries(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (!latestRun) continue;
			const startTime = latestRun.startTime;
			const executionTime = latestRun.executionTime || 0;
			const inputData = latestRun.data?.main?.[0] || [];
			const outputData = latestRun.data?.main?.[0] || [];
			nodeExecutions.push({
				nodeId,
				nodeType: this.extractNodeType(latestRun),
				duration: executionTime,
				memoryUsage: this.estimateNodeMemoryUsage(latestRun),
				inputItems: inputData.length,
				outputItems: outputData.length,
				status: latestRun.error ? 'error' : 'success',
			});
		}
		return nodeExecutions;
	}
	extractNodeType(nodeData) {
		return nodeData.node?.type || nodeData.nodeType || 'unknown';
	}
	calculateMemoryPeak(runData, includeEstimate = false) {
		if (!includeEstimate) return undefined;
		let totalPeak = 0;
		for (const nodeData of Object.values(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (latestRun) {
				totalPeak += this.estimateNodeMemoryUsage(latestRun) || 0;
			}
		}
		return totalPeak > 0 ? totalPeak : undefined;
	}
	estimateCpuUsage(runData) {
		let totalExecutionTime = 0;
		let totalDataVolume = 0;
		for (const nodeData of Object.values(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (latestRun) {
				totalExecutionTime += latestRun.executionTime || 0;
				totalDataVolume += this.estimateDataVolume(latestRun);
			}
		}
		const estimatedCpu = Math.min(
			100,
			(totalExecutionTime / 1000) * 2 + (totalDataVolume / 1000000) * 10,
		);
		return estimatedCpu > 0 ? Math.round(estimatedCpu * 100) / 100 : undefined;
	}
	estimateMemoryUsage(runData) {
		let totalMemory = 0;
		for (const nodeData of Object.values(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (latestRun) {
				totalMemory += this.estimateNodeMemoryUsage(latestRun) || 0;
			}
		}
		return totalMemory > 0 ? Math.round((totalMemory / 1024 / 1024) * 100) / 100 : undefined;
	}
	estimateIoOperations(runData) {
		let totalIo = 0;
		for (const nodeData of Object.values(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (latestRun) {
				const inputItems = latestRun.data?.main?.[0]?.length || 0;
				const outputItems = latestRun.data?.main?.[0]?.length || 0;
				totalIo += Math.max(inputItems, outputItems);
			}
		}
		return totalIo > 0 ? totalIo : undefined;
	}
	estimateNodeMemoryUsage(nodeData) {
		const dataVolume = this.estimateDataVolume(nodeData);
		return dataVolume > 0 ? dataVolume * 2 : undefined;
	}
	estimateDataVolume(nodeData) {
		try {
			const data = nodeData.data;
			if (!data) return 0;
			const jsonString = JSON.stringify(data);
			return jsonString.length;
		} catch {
			return 0;
		}
	}
	detectBottlenecks(runData) {
		const bottlenecks = [];
		for (const [nodeId, nodeData] of Object.entries(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (!latestRun) continue;
			const executionTime = latestRun.executionTime || 0;
			const dataVolume = this.estimateDataVolume(latestRun);
			const memoryUsage = this.estimateNodeMemoryUsage(latestRun) || 0;
			if (executionTime > 30000) {
				bottlenecks.push({
					nodeId,
					issue: 'slow_execution',
					severity: executionTime > 120000 ? 'high' : 'medium',
					suggestion: `Node execution took ${Math.round(executionTime / 1000)}s. Consider optimizing queries or reducing data volume.`,
				});
			}
			if (memoryUsage > 100 * 1024 * 1024) {
				bottlenecks.push({
					nodeId,
					issue: 'high_memory',
					severity: memoryUsage > 500 * 1024 * 1024 ? 'high' : 'medium',
					suggestion: `High memory usage detected (~${Math.round(memoryUsage / 1024 / 1024)}MB). Consider processing data in smaller chunks.`,
				});
			}
			if (dataVolume > 10 * 1024 * 1024) {
				bottlenecks.push({
					nodeId,
					issue: 'large_dataset',
					severity: dataVolume > 100 * 1024 * 1024 ? 'high' : 'medium',
					suggestion: `Large dataset detected (~${Math.round(dataVolume / 1024 / 1024)}MB). Consider pagination or data filtering.`,
				});
			}
		}
		return bottlenecks;
	}
	parseTimeRange(request) {
		const now = new Date();
		let startDate;
		let endDate = now;
		if (request.startDate && request.endDate) {
			startDate = new Date(request.startDate);
			endDate = new Date(request.endDate);
		} else if (request.timeRange) {
			switch (request.timeRange) {
				case '1h':
					startDate = new Date(now.getTime() - 60 * 60 * 1000);
					break;
				case '24h':
					startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
					break;
				case '7d':
					startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case '30d':
					startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				default:
					startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			}
		} else {
			startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		}
		return { startDate, endDate, timeRange: request.timeRange || '24h' };
	}
	calculateAggregatedMetrics(executions, timeRange) {
		const successfulExecutions = executions.filter((e) => e.status === 'success');
		const failedExecutions = executions.filter((e) => e.status === 'error');
		const runningExecutions = executions.filter((e) => e.status === 'running');
		const durations = executions
			.filter((e) => e.startedAt && e.finishedAt)
			.map((e) => e.finishedAt.getTime() - e.startedAt.getTime())
			.sort((a, b) => a - b);
		const averageDuration =
			durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
		const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;
		const p95Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;
		const p99Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;
		const trends = this.generateTrendData(executions, timeRange);
		return {
			executionCounts: {
				total: executions.length,
				success: successfulExecutions.length,
				failed: failedExecutions.length,
				running: runningExecutions.length,
			},
			timing: {
				averageDuration: Math.round(averageDuration),
				medianDuration: Math.round(medianDuration),
				p95Duration: Math.round(p95Duration),
				p99Duration: Math.round(p99Duration),
			},
			resourceUsage: {
				averageMemory: 0,
				peakMemory: 0,
				averageCpu: 0,
			},
			trends,
		};
	}
	generateTrendData(executions, timeRange) {
		const intervalMs = this.getIntervalMs(timeRange);
		const groupedData = new Map();
		executions.forEach((execution) => {
			const timestamp = execution.startedAt.getTime();
			const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs;
			if (!groupedData.has(intervalStart)) {
				groupedData.set(intervalStart, []);
			}
			groupedData.get(intervalStart).push(execution);
		});
		return Array.from(groupedData.entries())
			.sort(([a], [b]) => a - b)
			.map(([timestamp, intervalExecutions]) => {
				const successCount = intervalExecutions.filter((e) => e.status === 'success').length;
				const totalCount = intervalExecutions.length;
				const errorRate = totalCount > 0 ? (totalCount - successCount) / totalCount : 0;
				const durations = intervalExecutions
					.filter((e) => e.startedAt && e.finishedAt)
					.map((e) => e.finishedAt.getTime() - e.startedAt.getTime());
				const averageDuration =
					durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
				return {
					timestamp: new Date(timestamp).toISOString(),
					executionCount: totalCount,
					averageDuration: Math.round(averageDuration),
					errorRate: Math.round(errorRate * 10000) / 100,
				};
			});
	}
	getIntervalMs(timeRange) {
		switch (timeRange) {
			case '1h':
				return 5 * 60 * 1000;
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
};
exports.PerformanceMonitoringService = PerformanceMonitoringService;
exports.PerformanceMonitoringService = PerformanceMonitoringService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			execution_service_1.ExecutionService,
			active_executions_1.ActiveExecutions,
		]),
	],
	PerformanceMonitoringService,
);
//# sourceMappingURL=performance-monitoring.service.js.map
