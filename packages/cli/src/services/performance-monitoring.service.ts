import {
	type ExecutionProfileDto,
	type BottleneckDto,
	type PerformanceMetricsDto,
	type PerformanceMetricsRequestDto,
	ExecutionStatus,
	BottleneckSeverity,
	BottleneckIssue,
	NodeExecutionStatus,
} from '@n8n/api-types';
import type { IRunData, IRunExecutionData } from 'n8n-workflow';
import { LoggerProxy, ApplicationError } from 'n8n-workflow';
import { Service } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionService } from '@/executions/execution.service';

import type { Logger } from '@/logger';

@Service()
export class PerformanceMonitoringService {
	private logger: Logger = LoggerProxy;

	constructor(
		private readonly executionService: ExecutionService,
		private readonly activeExecutions: ActiveExecutions,
	) {}

	/**
	 * Generate execution profile with performance metrics and bottleneck analysis
	 */
	async getExecutionProfile(
		executionId: string,
		options: {
			includeBottlenecks?: boolean;
			includeResourceMetrics?: boolean;
		} = {},
	): Promise<ExecutionProfileDto> {
		try {
			// Get execution data from database
			const execution = await this.executionService.findOne({
				where: { id: executionId },
				includeData: true,
			});

			if (!execution) {
				throw new ApplicationError('Execution not found', { extra: { executionId } });
			}

			// Check if execution is still active
			const isActive = this.activeExecutions.has(executionId);

			// Parse execution data
			const executionData = execution.data as IRunExecutionData;
			const runData = executionData?.resultData?.runData || {};

			// Calculate timing metrics
			const startedAt = execution.startedAt;
			const finishedAt = execution.finishedAt;
			const duration =
				startedAt && finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined;

			// Build execution profile
			const profile: ExecutionProfileDto = {
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
			throw new ApplicationError('Failed to generate execution profile', {
				cause: error,
				extra: { executionId },
			});
		}
	}

	/**
	 * Get performance metrics over a time range
	 */
	async getPerformanceMetrics(
		request: PerformanceMetricsRequestDto,
	): Promise<PerformanceMetricsDto> {
		try {
			const { timeRange, startDate, endDate } = this.parseTimeRange(request);

			// Get executions within time range
			const executions = await this.executionService.findMany({
				where: {
					...(request.workflowId && { workflowId: request.workflowId }),
					...(request.status && {
						status: request.status.split(',') as ExecutionStatus[],
					}),
					startedAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				select: {
					id: true,
					workflowId: true,
					status: true,
					startedAt: true,
					finishedAt: true,
				},
			});

			// Calculate aggregated metrics
			const metrics = this.calculateAggregatedMetrics(executions, timeRange);

			return {
				timeRange: {
					start: startDate.toISOString(),
					end: endDate.toISOString(),
				},
				filters: {
					workflowId: request.workflowId,
					status: request.status?.split(',') as ExecutionStatus[],
				},
				metrics,
			};
		} catch (error) {
			this.logger.error('Failed to get performance metrics', {
				request,
				error: error.message,
			});
			throw new ApplicationError('Failed to get performance metrics', {
				cause: error,
				extra: { request },
			});
		}
	}

	/**
	 * Map internal execution status to API status
	 */
	private mapExecutionStatus(status: string): ExecutionStatus {
		switch (status) {
			case 'new':
				return ExecutionStatus.NEW;
			case 'running':
				return ExecutionStatus.RUNNING;
			case 'success':
				return ExecutionStatus.SUCCESS;
			case 'error':
				return ExecutionStatus.ERROR;
			case 'canceled':
				return ExecutionStatus.CANCELED;
			case 'crashed':
				return ExecutionStatus.CRASHED;
			case 'waiting':
				return ExecutionStatus.WAITING;
			default:
				return ExecutionStatus.ERROR;
		}
	}

	/**
	 * Calculate queue time based on execution timestamps
	 */
	private calculateQueueTime(execution: any): number | undefined {
		// Queue time would be createdAt to startedAt if we track creation time
		// For now, return undefined as this requires additional tracking
		return undefined;
	}

	/**
	 * Analyze individual node executions for performance metrics
	 */
	private analyzeNodeExecutions(runData: IRunData) {
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
				status: latestRun.error ? NodeExecutionStatus.ERROR : NodeExecutionStatus.SUCCESS,
			});
		}

		return nodeExecutions;
	}

	/**
	 * Extract node type from execution data
	 */
	private extractNodeType(nodeData: any): string {
		// Try to extract node type from various sources
		return nodeData.node?.type || nodeData.nodeType || 'unknown';
	}

	/**
	 * Calculate total memory peak across all nodes
	 */
	private calculateMemoryPeak(
		runData: IRunData,
		includeEstimate: boolean = false,
	): number | undefined {
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

	/**
	 * Estimate CPU usage based on execution patterns
	 */
	private estimateCpuUsage(runData: IRunData): number | undefined {
		// This is a rough estimation based on execution time and data volume
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

		// Simple heuristic: CPU usage correlates with execution time and data volume
		const estimatedCpu = Math.min(
			100,
			(totalExecutionTime / 1000) * 2 + (totalDataVolume / 1000000) * 10,
		);
		return estimatedCpu > 0 ? Math.round(estimatedCpu * 100) / 100 : undefined;
	}

	/**
	 * Estimate memory usage based on data volume
	 */
	private estimateMemoryUsage(runData: IRunData): number | undefined {
		let totalMemory = 0;

		for (const nodeData of Object.values(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (latestRun) {
				totalMemory += this.estimateNodeMemoryUsage(latestRun) || 0;
			}
		}

		return totalMemory > 0 ? Math.round((totalMemory / 1024 / 1024) * 100) / 100 : undefined; // Convert to MB
	}

	/**
	 * Estimate I/O operations based on data processing
	 */
	private estimateIoOperations(runData: IRunData): number | undefined {
		let totalIo = 0;

		for (const nodeData of Object.values(runData)) {
			if (!nodeData || nodeData.length === 0) continue;
			const latestRun = nodeData[nodeData.length - 1];
			if (latestRun) {
				// Estimate I/O based on input/output data items
				const inputItems = latestRun.data?.main?.[0]?.length || 0;
				const outputItems = latestRun.data?.main?.[0]?.length || 0;
				totalIo += Math.max(inputItems, outputItems);
			}
		}

		return totalIo > 0 ? totalIo : undefined;
	}

	/**
	 * Estimate memory usage for individual node
	 */
	private estimateNodeMemoryUsage(nodeData: any): number | undefined {
		const dataVolume = this.estimateDataVolume(nodeData);
		// Simple heuristic: memory usage roughly correlates with data volume
		return dataVolume > 0 ? dataVolume * 2 : undefined; // Assume 2x overhead
	}

	/**
	 * Estimate data volume for a node execution
	 */
	private estimateDataVolume(nodeData: any): number {
		try {
			const data = nodeData.data;
			if (!data) return 0;

			// Rough estimation based on JSON stringification
			const jsonString = JSON.stringify(data);
			return jsonString.length;
		} catch {
			return 0;
		}
	}

	/**
	 * Detect performance bottlenecks in execution
	 */
	private detectBottlenecks(runData: IRunData): BottleneckDto[] {
		const bottlenecks: BottleneckDto[] = [];

		// Analyze each node for potential issues
		for (const [nodeId, nodeData] of Object.entries(runData)) {
			if (!nodeData || nodeData.length === 0) continue;

			const latestRun = nodeData[nodeData.length - 1];
			if (!latestRun) continue;

			const executionTime = latestRun.executionTime || 0;
			const dataVolume = this.estimateDataVolume(latestRun);
			const memoryUsage = this.estimateNodeMemoryUsage(latestRun) || 0;

			// Detect slow execution (>30 seconds)
			if (executionTime > 30000) {
				bottlenecks.push({
					nodeId,
					issue: BottleneckIssue.SLOW_EXECUTION,
					severity: executionTime > 120000 ? BottleneckSeverity.HIGH : BottleneckSeverity.MEDIUM,
					suggestion: `Node execution took ${Math.round(executionTime / 1000)}s. Consider optimizing queries or reducing data volume.`,
				});
			}

			// Detect high memory usage (>100MB estimated)
			if (memoryUsage > 100 * 1024 * 1024) {
				bottlenecks.push({
					nodeId,
					issue: BottleneckIssue.HIGH_MEMORY,
					severity:
						memoryUsage > 500 * 1024 * 1024 ? BottleneckSeverity.HIGH : BottleneckSeverity.MEDIUM,
					suggestion: `High memory usage detected (~${Math.round(memoryUsage / 1024 / 1024)}MB). Consider processing data in smaller chunks.`,
				});
			}

			// Detect large dataset processing (>10MB of data)
			if (dataVolume > 10 * 1024 * 1024) {
				bottlenecks.push({
					nodeId,
					issue: BottleneckIssue.LARGE_DATASET,
					severity:
						dataVolume > 100 * 1024 * 1024 ? BottleneckSeverity.HIGH : BottleneckSeverity.MEDIUM,
					suggestion: `Large dataset detected (~${Math.round(dataVolume / 1024 / 1024)}MB). Consider pagination or data filtering.`,
				});
			}
		}

		return bottlenecks;
	}

	/**
	 * Parse time range from request parameters
	 */
	private parseTimeRange(request: PerformanceMetricsRequestDto) {
		const now = new Date();
		let startDate: Date;
		let endDate: Date = now;

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
					startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
			}
		} else {
			startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
		}

		return { startDate, endDate, timeRange: request.timeRange || '24h' };
	}

	/**
	 * Calculate aggregated performance metrics
	 */
	private calculateAggregatedMetrics(executions: any[], timeRange: string) {
		const successfulExecutions = executions.filter((e) => e.status === 'success');
		const failedExecutions = executions.filter((e) => e.status === 'error');
		const runningExecutions = executions.filter((e) => e.status === 'running');

		// Calculate durations for completed executions
		const durations = executions
			.filter((e) => e.startedAt && e.finishedAt)
			.map((e) => e.finishedAt.getTime() - e.startedAt.getTime())
			.sort((a, b) => a - b);

		const averageDuration =
			durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

		const medianDuration = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

		const p95Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;

		const p99Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

		// Generate trend data
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
				averageMemory: 0, // Would need actual tracking
				peakMemory: 0, // Would need actual tracking
				averageCpu: 0, // Would need actual tracking
			},
			trends,
		};
	}

	/**
	 * Generate trend data points for visualization
	 */
	private generateTrendData(executions: any[], timeRange: string) {
		// Group executions by time intervals
		const intervalMs = this.getIntervalMs(timeRange);
		const groupedData = new Map<number, any[]>();

		executions.forEach((execution) => {
			const timestamp = execution.startedAt.getTime();
			const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs;

			if (!groupedData.has(intervalStart)) {
				groupedData.set(intervalStart, []);
			}
			groupedData.get(intervalStart)!.push(execution);
		});

		// Convert to trend data points
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
					errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimal places
				};
			});
	}

	/**
	 * Get time interval in milliseconds based on time range
	 */
	private getIntervalMs(timeRange: string): number {
		switch (timeRange) {
			case '1h':
				return 5 * 60 * 1000; // 5 minute intervals
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
}
