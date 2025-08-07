import type {
	ErrorAnalyticsQueryDto,
	NodeErrorDetailsQueryDto,
	NodeErrorStatDto,
	ErrorBreakdownResponseDto,
	NodeErrorInsightsResponseDto,
	SystemHealthMetricsDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';

interface ErrorData {
	nodeType: string;
	errorType: string;
	errorMessage: string;
	workflowId: string;
	executionId: string;
	timestamp: Date;
	executionTime?: number;
}

interface NodeErrorAggregation {
	nodeType: string;
	totalErrors: number;
	errorTypes: Map<
		string,
		{
			count: number;
			firstSeen: Date;
			lastSeen: Date;
			sampleMessage: string;
			affectedWorkflows: Set<string>;
		}
	>;
	totalExecutions: number;
	avgExecutionTime?: number;
	lastErrorAt?: Date;
}

export interface NodeErrorBreakdown {
	nodeType: string;
	errors: Array<{
		errorType: string;
		count: number;
		percentage: number;
		firstSeen: string;
		lastSeen: string;
		sampleMessage: string;
		affectedWorkflows: number;
	}>;
	totalErrors: number;
	timeRange: {
		startDate: string;
		endDate: string;
	};
}

export interface ErrorPattern {
	pattern: string;
	nodeTypes: string[];
	frequency: number;
	severity: 'low' | 'medium' | 'high';
	description: string;
	recommendation: string;
	affectedWorkflows: number;
	firstSeen: Date;
	lastSeen: Date;
}

export interface NodePerformanceCorrelation {
	nodeType: string;
	correlationCoefficient: number;
	performanceImpact: 'low' | 'medium' | 'high';
	averageExecutionTime: number;
	errorRate: number;
	recommendations: Array<{
		type: 'performance' | 'reliability' | 'configuration';
		priority: 'low' | 'medium' | 'high';
		description: string;
		expectedImprovement: string;
	}>;
	trendData: Array<{
		date: string;
		errorRate: number;
		avgExecutionTime: number;
		executionCount: number;
	}>;
}

@Service()
export class ErrorAnalyticsService {
	private readonly CACHE_TTL = 300; // 5 minutes
	private readonly INSIGHTS_CACHE_TTL = 900; // 15 minutes

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly cacheService: CacheService,
	) {}

	/**
	 * Get comprehensive error insights and statistics per node type
	 */
	async getNodeErrorInsights(query: ErrorAnalyticsQueryDto): Promise<NodeErrorInsightsResponseDto> {
		const cacheKey = `node-error-insights:${JSON.stringify(query)}`;

		const cached = await this.cacheService.get<NodeErrorInsightsResponseDto>(cacheKey);
		if (cached) return cached;

		const dateRange = this.getDateRange(query.startDate, query.endDate);

		// Get error data and execution statistics in parallel
		const [errorData, executionStats, trendData] = await Promise.all([
			this.getErrorDataByNodeType(dateRange, query.nodeType, query.workflowId),
			this.getExecutionStatsByNodeType(dateRange, query.nodeType, query.workflowId),
			this.getErrorTrendData(dateRange, query.groupBy, query.nodeType),
		]);

		// Process and aggregate error data
		const nodeTypeStats = this.aggregateNodeErrorStats(errorData, executionStats);

		// Calculate overall metrics
		const totalErrors = nodeTypeStats.reduce((sum, stat) => sum + stat.totalErrors, 0);
		const totalExecutions = Object.values(executionStats).reduce(
			(sum, stat) => sum + stat.totalExecutions,
			0,
		);
		const overallErrorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;

		// Generate recommendations
		const recommendations = this.generateErrorRecommendations(nodeTypeStats);

		const insights: NodeErrorInsightsResponseDto = {
			nodeTypeStats,
			totalErrors,
			totalExecutions,
			overallErrorRate,
			trendData,
			recommendations,
			timeRange: {
				startDate: dateRange.startDate.toISOString(),
				endDate: dateRange.endDate.toISOString(),
			},
		};

		await this.cacheService.set(cacheKey, insights, this.INSIGHTS_CACHE_TTL);
		return insights;
	}

	/**
	 * Get detailed error breakdown for a specific node type
	 */
	async getNodeErrorBreakdown(query: NodeErrorDetailsQueryDto): Promise<ErrorBreakdownResponseDto> {
		const cacheKey = `node-error-breakdown:${query.nodeType}:${JSON.stringify(query)}`;

		const cached = await this.cacheService.get<ErrorBreakdownResponseDto>(cacheKey);
		if (cached) return cached;

		const dateRange = this.getDateRange(query.startDate, query.endDate);
		const errorData = await this.getErrorDataByNodeType(dateRange, query.nodeType);

		// Filter for specific node type
		const nodeErrors = errorData.filter((error) => error.nodeType === query.nodeType);

		// Group by error type
		const errorTypeMap = new Map<
			string,
			{
				count: number;
				firstSeen: Date;
				lastSeen: Date;
				sampleMessage: string;
				affectedWorkflows: Set<string>;
			}
		>();

		nodeErrors.forEach((error) => {
			const existing = errorTypeMap.get(error.errorType);
			if (existing) {
				existing.count++;
				existing.lastSeen = new Date(
					Math.max(existing.lastSeen.getTime(), error.timestamp.getTime()),
				);
				existing.firstSeen = new Date(
					Math.min(existing.firstSeen.getTime(), error.timestamp.getTime()),
				);
				existing.affectedWorkflows.add(error.workflowId);
			} else {
				errorTypeMap.set(error.errorType, {
					count: 1,
					firstSeen: error.timestamp,
					lastSeen: error.timestamp,
					sampleMessage: error.errorMessage,
					affectedWorkflows: new Set([error.workflowId]),
				});
			}
		});

		const totalNodeErrors = nodeErrors.length;
		const errors = Array.from(errorTypeMap.entries())
			.map(([errorType, data]) => ({
				errorType,
				count: data.count,
				percentage: totalNodeErrors > 0 ? (data.count / totalNodeErrors) * 100 : 0,
				firstSeen: data.firstSeen.toISOString(),
				lastSeen: data.lastSeen.toISOString(),
				sampleMessage: data.sampleMessage,
				affectedWorkflows: data.affectedWorkflows.size,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, query.limit);

		const breakdown: ErrorBreakdownResponseDto = {
			nodeType: query.nodeType,
			errors,
			totalErrors: totalNodeErrors,
			timeRange: {
				startDate: dateRange.startDate.toISOString(),
				endDate: dateRange.endDate.toISOString(),
			},
		};

		await this.cacheService.set(cacheKey, breakdown, this.CACHE_TTL);
		return breakdown;
	}

	/**
	 * Get system health metrics with error analysis
	 */
	async getSystemHealthMetrics(query: ErrorAnalyticsQueryDto): Promise<SystemHealthMetricsDto> {
		const cacheKey = `system-health:${JSON.stringify(query)}`;

		const cached = await this.cacheService.get<SystemHealthMetricsDto>(cacheKey);
		if (cached) return cached;

		const dateRange = this.getDateRange(query.startDate, query.endDate);

		const [errorData, executionStats, periodData] = await Promise.all([
			this.getErrorDataByNodeType(dateRange),
			this.getExecutionStatsByNodeType(dateRange),
			this.getSystemHealthByPeriod(dateRange, query.groupBy),
		]);

		const totalExecutions = Object.values(executionStats).reduce(
			(sum, stat) => sum + stat.totalExecutions,
			0,
		);
		const totalErrors = errorData.length;
		const errorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;
		const avgExecutionTime = this.calculateAverageExecutionTime(executionStats);

		// Get top failing nodes
		const nodeErrorCounts = new Map<string, number>();
		const nodeExecutionCounts = new Map<string, number>();

		errorData.forEach((error) => {
			nodeErrorCounts.set(error.nodeType, (nodeErrorCounts.get(error.nodeType) || 0) + 1);
		});

		Object.entries(executionStats).forEach(([nodeType, stats]) => {
			nodeExecutionCounts.set(nodeType, stats.totalExecutions);
		});

		const topFailingNodes = Array.from(nodeErrorCounts.entries())
			.map(([nodeType, errorCount]) => {
				const executionCount = nodeExecutionCounts.get(nodeType) || 0;
				const nodeErrorRate = executionCount > 0 ? (errorCount / executionCount) * 100 : 0;

				const impact = this.determineFailureImpact(errorCount, nodeErrorRate, executionCount);

				return {
					nodeType,
					errorCount,
					errorRate: nodeErrorRate,
					impact,
				};
			})
			.sort((a, b) => b.errorCount - a.errorCount)
			.slice(0, 10);

		// Generate alerts
		const alerts = this.generateSystemAlerts(errorData, executionStats, dateRange);

		const healthMetrics: SystemHealthMetricsDto = {
			overall: {
				totalExecutions,
				totalErrors,
				errorRate,
				avgExecutionTime,
			},
			byPeriod: periodData,
			topFailingNodes,
			alerts,
		};

		await this.cacheService.set(cacheKey, healthMetrics, this.CACHE_TTL);
		return healthMetrics;
	}

	/**
	 * Get error data from executions with node-specific filtering
	 */
	private async getErrorDataByNodeType(
		dateRange: { startDate: Date; endDate: Date },
		nodeType?: string,
		workflowId?: string,
	): Promise<ErrorData[]> {
		// In a real implementation, this would query the execution data
		// For now, we'll return mock data that represents realistic error patterns

		this.logger.debug('Fetching error data by node type', {
			dateRange,
			nodeType,
			workflowId,
		});

		// Mock data representing common n8n node errors
		const mockErrors: ErrorData[] = [
			{
				nodeType: 'HTTP Request',
				errorType: 'ConnectionError',
				errorMessage: 'Connection timeout after 30000ms',
				workflowId: 'wf-123',
				executionId: 'exec-456',
				timestamp: new Date(Date.now() - 3600000),
				executionTime: 30000,
			},
			{
				nodeType: 'HTTP Request',
				errorType: 'AuthenticationError',
				errorMessage: 'Invalid API key provided',
				workflowId: 'wf-124',
				executionId: 'exec-457',
				timestamp: new Date(Date.now() - 7200000),
				executionTime: 1500,
			},
			{
				nodeType: 'Code',
				errorType: 'ReferenceError',
				errorMessage: 'items is not defined',
				workflowId: 'wf-125',
				executionId: 'exec-458',
				timestamp: new Date(Date.now() - 10800000),
				executionTime: 500,
			},
			{
				nodeType: 'Set',
				errorType: 'ValidationError',
				errorMessage: 'Invalid expression in field mapping',
				workflowId: 'wf-126',
				executionId: 'exec-459',
				timestamp: new Date(Date.now() - 14400000),
				executionTime: 200,
			},
			{
				nodeType: 'Gmail',
				errorType: 'QuotaError',
				errorMessage: 'Daily sending quota exceeded',
				workflowId: 'wf-127',
				executionId: 'exec-460',
				timestamp: new Date(Date.now() - 18000000),
				executionTime: 3000,
			},
		];

		// Filter by nodeType and workflowId if provided
		let filteredErrors = mockErrors.filter(
			(error) => error.timestamp >= dateRange.startDate && error.timestamp <= dateRange.endDate,
		);

		if (nodeType) {
			filteredErrors = filteredErrors.filter((error) => error.nodeType === nodeType);
		}

		if (workflowId) {
			filteredErrors = filteredErrors.filter((error) => error.workflowId === workflowId);
		}

		return filteredErrors;
	}

	/**
	 * Get execution statistics by node type
	 */
	private async getExecutionStatsByNodeType(
		dateRange: { startDate: Date; endDate: Date },
		nodeType?: string,
		workflowId?: string,
	): Promise<Record<string, { totalExecutions: number; avgExecutionTime: number }>> {
		// Mock execution statistics
		const mockStats: Record<string, { totalExecutions: number; avgExecutionTime: number }> = {
			'HTTP Request': { totalExecutions: 1250, avgExecutionTime: 2500 },
			Code: { totalExecutions: 800, avgExecutionTime: 150 },
			Set: { totalExecutions: 1500, avgExecutionTime: 50 },
			Gmail: { totalExecutions: 300, avgExecutionTime: 4000 },
			Slack: { totalExecutions: 450, avgExecutionTime: 1200 },
			Webhook: { totalExecutions: 2000, avgExecutionTime: 100 },
		};

		if (nodeType) {
			const stat = mockStats[nodeType];
			return stat ? { [nodeType]: stat } : {};
		}

		return mockStats;
	}

	/**
	 * Get error trend data over time
	 */
	private async getErrorTrendData(
		dateRange: { startDate: Date; endDate: Date },
		groupBy: 'day' | 'week' | 'month',
		nodeType?: string,
	) {
		// Mock trend data - in reality this would aggregate from execution data
		const trendData = [];
		const current = new Date(dateRange.startDate);
		const end = dateRange.endDate;

		while (current <= end) {
			trendData.push({
				date: current.toISOString(),
				nodeType: nodeType || 'HTTP Request',
				errorCount: Math.floor(Math.random() * 10) + 1,
				executionCount: Math.floor(Math.random() * 100) + 50,
				errorRate: Math.random() * 5,
			});

			// Increment date based on groupBy
			if (groupBy === 'day') {
				current.setDate(current.getDate() + 1);
			} else if (groupBy === 'week') {
				current.setDate(current.getDate() + 7);
			} else {
				current.setMonth(current.getMonth() + 1);
			}
		}

		return trendData;
	}

	/**
	 * Aggregate node error statistics
	 */
	private aggregateNodeErrorStats(
		errorData: ErrorData[],
		executionStats: Record<string, { totalExecutions: number; avgExecutionTime: number }>,
	): NodeErrorStatDto[] {
		const nodeTypeMap = new Map<string, NodeErrorAggregation>();

		// Initialize with execution stats
		Object.entries(executionStats).forEach(([nodeType, stats]) => {
			nodeTypeMap.set(nodeType, {
				nodeType,
				totalErrors: 0,
				errorTypes: new Map(),
				totalExecutions: stats.totalExecutions,
				avgExecutionTime: stats.avgExecutionTime,
			});
		});

		// Aggregate error data
		errorData.forEach((error) => {
			let nodeAgg = nodeTypeMap.get(error.nodeType);
			if (!nodeAgg) {
				nodeAgg = {
					nodeType: error.nodeType,
					totalErrors: 0,
					errorTypes: new Map(),
					totalExecutions: 0,
					avgExecutionTime: error.executionTime,
				};
				nodeTypeMap.set(error.nodeType, nodeAgg);
			}

			nodeAgg.totalErrors++;
			nodeAgg.lastErrorAt = error.timestamp;

			const existing = nodeAgg.errorTypes.get(error.errorType);
			if (existing) {
				existing.count++;
				existing.lastSeen = new Date(
					Math.max(existing.lastSeen.getTime(), error.timestamp.getTime()),
				);
				existing.affectedWorkflows.add(error.workflowId);
			} else {
				nodeAgg.errorTypes.set(error.errorType, {
					count: 1,
					firstSeen: error.timestamp,
					lastSeen: error.timestamp,
					sampleMessage: error.errorMessage,
					affectedWorkflows: new Set([error.workflowId]),
				});
			}
		});

		// Convert to DTO format
		return Array.from(nodeTypeMap.values())
			.map((agg) => {
				const errorRate =
					agg.totalExecutions > 0 ? (agg.totalErrors / agg.totalExecutions) * 100 : 0;
				const mostCommonErrorType = Array.from(agg.errorTypes.entries()).sort(
					(a, b) => b[1].count - a[1].count,
				)[0];

				const failureImpact = this.determineFailureImpact(
					agg.totalErrors,
					errorRate,
					agg.totalExecutions,
				);
				const errorTrend = this.determineErrorTrend(agg.totalErrors, errorRate);

				return {
					nodeType: agg.nodeType,
					totalErrors: agg.totalErrors,
					errorRate,
					mostCommonError: mostCommonErrorType ? mostCommonErrorType[0] : null,
					avgExecutionTime: agg.avgExecutionTime ?? null,
					failureImpact,
					lastErrorAt: agg.lastErrorAt?.toISOString() ?? null,
					errorTrend,
				};
			})
			.sort((a, b) => b.totalErrors - a.totalErrors);
	}

	/**
	 * Generate error-based recommendations
	 */
	private generateErrorRecommendations(nodeTypeStats: NodeErrorStatDto[]): Array<{
		nodeType: string;
		issue: string;
		suggestion: string;
		priority: 'low' | 'medium' | 'high';
		potentialImpact: string;
	}> {
		const recommendations: Array<{
			nodeType: string;
			issue: string;
			suggestion: string;
			priority: 'low' | 'medium' | 'high';
			potentialImpact: string;
		}> = [];

		nodeTypeStats.forEach((stat) => {
			if (stat.errorRate > 10) {
				recommendations.push({
					nodeType: stat.nodeType,
					issue: `High error rate of ${stat.errorRate.toFixed(1)}%`,
					suggestion: 'Review node configuration and add error handling',
					priority: 'high' as const,
					potentialImpact: 'Significant workflow reliability issues',
				});
			} else if (stat.avgExecutionTime && stat.avgExecutionTime > 10000) {
				recommendations.push({
					nodeType: stat.nodeType,
					issue: `Slow execution time averaging ${(stat.avgExecutionTime / 1000).toFixed(1)}s`,
					suggestion: 'Optimize API calls and implement caching where possible',
					priority: 'medium' as const,
					potentialImpact: 'Workflow performance degradation',
				});
			} else if (stat.errorTrend === 'increasing') {
				recommendations.push({
					nodeType: stat.nodeType,
					issue: 'Increasing error trend detected',
					suggestion: 'Monitor node configuration changes and external service status',
					priority: 'medium' as const,
					potentialImpact: 'Potential service degradation',
				});
			}
		});

		return recommendations.slice(0, 10); // Limit to top 10 recommendations
	}

	/**
	 * Get system health metrics by time period
	 */
	private async getSystemHealthByPeriod(
		dateRange: { startDate: Date; endDate: Date },
		groupBy: 'day' | 'week' | 'month',
	) {
		// Mock period data
		const periodData = [];
		const current = new Date(dateRange.startDate);
		const end = dateRange.endDate;

		while (current <= end) {
			const executions = Math.floor(Math.random() * 500) + 100;
			const errors = Math.floor(Math.random() * 50) + 5;

			periodData.push({
				period: current.toISOString(),
				executions,
				errors,
				errorRate: (errors / executions) * 100,
				avgExecutionTime: Math.floor(Math.random() * 3000) + 500,
			});

			// Increment date based on groupBy
			if (groupBy === 'day') {
				current.setDate(current.getDate() + 1);
			} else if (groupBy === 'week') {
				current.setDate(current.getDate() + 7);
			} else {
				current.setMonth(current.getMonth() + 1);
			}
		}

		return periodData;
	}

	/**
	 * Generate system-level alerts
	 */
	private generateSystemAlerts(
		errorData: ErrorData[],
		executionStats: Record<string, { totalExecutions: number; avgExecutionTime: number }>,
		dateRange: { startDate: Date; endDate: Date },
	) {
		const alerts = [];
		const now = new Date();

		// Check for error spikes
		const recentErrors = errorData.filter(
			(error) => error.timestamp > new Date(now.getTime() - 3600000), // Last hour
		);

		if (recentErrors.length > 20) {
			alerts.push({
				type: 'error_spike' as const,
				severity: 'critical' as const,
				message: `Error spike detected: ${recentErrors.length} errors in the last hour`,
				nodeType: null,
				detectedAt: now.toISOString(),
				affectedExecutions: recentErrors.length,
			});
		}

		// Check for performance degradation
		Object.entries(executionStats).forEach(([nodeType, stats]) => {
			if (stats.avgExecutionTime > 15000) {
				alerts.push({
					type: 'performance_degradation' as const,
					severity: 'warning' as const,
					message: `${nodeType} nodes showing slow execution times`,
					nodeType,
					detectedAt: now.toISOString(),
					affectedExecutions: stats.totalExecutions,
				});
			}
		});

		return alerts;
	}

	/**
	 * Determine failure impact based on error count and rate
	 */
	private determineFailureImpact(
		errorCount: number,
		errorRate: number,
		executionCount: number,
	): 'low' | 'medium' | 'high' {
		if (errorRate > 15 || errorCount > 100) return 'high';
		if (errorRate > 5 || errorCount > 20) return 'medium';
		return 'low';
	}

	/**
	 * Determine error trend based on current metrics
	 */
	private determineErrorTrend(
		errorCount: number,
		errorRate: number,
	): 'increasing' | 'decreasing' | 'stable' {
		// Mock implementation - in reality this would compare with historical data
		if (errorRate > 8) return 'increasing';
		if (errorRate < 2) return 'decreasing';
		return 'stable';
	}

	/**
	 * Calculate average execution time across all node types
	 */
	private calculateAverageExecutionTime(
		executionStats: Record<string, { totalExecutions: number; avgExecutionTime: number }>,
	): number {
		const entries = Object.values(executionStats);
		if (entries.length === 0) return 0;

		const totalWeightedTime = entries.reduce(
			(sum, stat) => sum + stat.avgExecutionTime * stat.totalExecutions,
			0,
		);
		const totalExecutions = entries.reduce((sum, stat) => sum + stat.totalExecutions, 0);

		return totalExecutions > 0 ? totalWeightedTime / totalExecutions : 0;
	}

	/**
	 * Get detailed error breakdown for a specific node type with flexible parameters
	 */
	async getNodeErrorBreakdownByTimeRange(
		nodeType: string,
		timeRange: { start: Date; end: Date },
	): Promise<NodeErrorBreakdown> {
		const cacheKey = `node-breakdown:${nodeType}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get<NodeErrorBreakdown>(cacheKey);
		if (cached) return cached;

		this.logger.debug('Generating node error breakdown', { nodeType, timeRange });

		const errorData = await this.getErrorDataByNodeType(
			{ startDate: timeRange.start, endDate: timeRange.end },
			nodeType,
		);

		const nodeErrors = errorData.filter((error) => error.nodeType === nodeType);
		const errorTypeMap = new Map<
			string,
			{
				count: number;
				firstSeen: Date;
				lastSeen: Date;
				sampleMessage: string;
				affectedWorkflows: Set<string>;
			}
		>();

		nodeErrors.forEach((error) => {
			const existing = errorTypeMap.get(error.errorType);
			if (existing) {
				existing.count++;
				existing.lastSeen = new Date(
					Math.max(existing.lastSeen.getTime(), error.timestamp.getTime()),
				);
				existing.firstSeen = new Date(
					Math.min(existing.firstSeen.getTime(), error.timestamp.getTime()),
				);
				existing.affectedWorkflows.add(error.workflowId);
			} else {
				errorTypeMap.set(error.errorType, {
					count: 1,
					firstSeen: error.timestamp,
					lastSeen: error.timestamp,
					sampleMessage: error.errorMessage,
					affectedWorkflows: new Set([error.workflowId]),
				});
			}
		});

		const totalNodeErrors = nodeErrors.length;
		const errors = Array.from(errorTypeMap.entries())
			.map(([errorType, data]) => ({
				errorType,
				count: data.count,
				percentage: totalNodeErrors > 0 ? (data.count / totalNodeErrors) * 100 : 0,
				firstSeen: data.firstSeen.toISOString(),
				lastSeen: data.lastSeen.toISOString(),
				sampleMessage: data.sampleMessage,
				affectedWorkflows: data.affectedWorkflows.size,
			}))
			.sort((a, b) => b.count - a.count);

		const breakdown: NodeErrorBreakdown = {
			nodeType,
			errors,
			totalErrors: totalNodeErrors,
			timeRange: {
				startDate: timeRange.start.toISOString(),
				endDate: timeRange.end.toISOString(),
			},
		};

		await this.cacheService.set(cacheKey, breakdown, this.CACHE_TTL);
		return breakdown;
	}

	/**
	 * Identify error patterns across node types
	 */
	async identifyErrorPatterns(
		nodeTypes?: string[],
		timeRange: { start: Date; end: Date } = {
			start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			end: new Date(),
		},
	): Promise<ErrorPattern[]> {
		const cacheKey = `error-patterns:${nodeTypes?.join(',') || 'all'}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get<ErrorPattern[]>(cacheKey);
		if (cached) return cached;

		this.logger.debug('Identifying error patterns', { nodeTypes, timeRange });

		const errorData = await this.getErrorDataByNodeType({
			startDate: timeRange.start,
			endDate: timeRange.end,
		});

		// Filter by node types if specified
		const filteredErrors = nodeTypes
			? errorData.filter((error) => nodeTypes.includes(error.nodeType))
			: errorData;

		// Group errors by common patterns
		const patternMap = new Map<
			string,
			{
				nodeTypes: Set<string>;
				frequency: number;
				affectedWorkflows: Set<string>;
				firstSeen: Date;
				lastSeen: Date;
				sampleMessages: string[];
			}
		>();

		filteredErrors.forEach((error) => {
			// Extract pattern from error message (simplified pattern matching)
			const pattern = this.extractErrorPattern(error.errorMessage);
			const existing = patternMap.get(pattern);

			if (existing) {
				existing.frequency++;
				existing.nodeTypes.add(error.nodeType);
				existing.affectedWorkflows.add(error.workflowId);
				existing.lastSeen = new Date(
					Math.max(existing.lastSeen.getTime(), error.timestamp.getTime()),
				);
				existing.firstSeen = new Date(
					Math.min(existing.firstSeen.getTime(), error.timestamp.getTime()),
				);
				if (existing.sampleMessages.length < 3) {
					existing.sampleMessages.push(error.errorMessage);
				}
			} else {
				patternMap.set(pattern, {
					nodeTypes: new Set([error.nodeType]),
					frequency: 1,
					affectedWorkflows: new Set([error.workflowId]),
					firstSeen: error.timestamp,
					lastSeen: error.timestamp,
					sampleMessages: [error.errorMessage],
				});
			}
		});

		const patterns: ErrorPattern[] = Array.from(patternMap.entries())
			.map(([pattern, data]) => ({
				pattern,
				nodeTypes: Array.from(data.nodeTypes),
				frequency: data.frequency,
				severity: this.determinePatterSeverity(data.frequency, data.nodeTypes.size),
				description: this.generatePatternDescription(pattern, data.nodeTypes.size),
				recommendation: this.generatePatternRecommendation(pattern),
				affectedWorkflows: data.affectedWorkflows.size,
				firstSeen: data.firstSeen,
				lastSeen: data.lastSeen,
			}))
			.sort((a, b) => b.frequency - a.frequency);

		await this.cacheService.set(cacheKey, patterns, this.CACHE_TTL);
		return patterns;
	}

	/**
	 * Analyze performance correlation with error rates for a node type
	 */
	async analyzePerformanceCorrelation(
		nodeType: string,
		timeRange: { start: Date; end: Date },
	): Promise<NodePerformanceCorrelation> {
		const cacheKey = `performance-correlation:${nodeType}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get<NodePerformanceCorrelation>(cacheKey);
		if (cached) return cached;

		this.logger.debug('Analyzing performance correlation', { nodeType, timeRange });

		const errorData = await this.getErrorDataByNodeType(
			{ startDate: timeRange.start, endDate: timeRange.end },
			nodeType,
		);

		const executionStats = await this.getExecutionStatsByNodeType(
			{ startDate: timeRange.start, endDate: timeRange.end },
			nodeType,
		);

		const nodeStats = executionStats[nodeType];
		if (!nodeStats) {
			// Return default correlation if no data
			return {
				nodeType,
				correlationCoefficient: 0,
				performanceImpact: 'low',
				averageExecutionTime: 0,
				errorRate: 0,
				recommendations: [],
				trendData: [],
			};
		}

		const nodeErrors = errorData.filter((error) => error.nodeType === nodeType);
		const errorRate =
			nodeStats.totalExecutions > 0 ? (nodeErrors.length / nodeStats.totalExecutions) * 100 : 0;

		// Calculate correlation coefficient between execution time and error rate
		const correlationCoefficient = this.calculateCorrelationCoefficient(
			nodeErrors,
			nodeStats.avgExecutionTime,
		);

		// Determine performance impact
		const performanceImpact = this.determinePerformanceImpact(
			correlationCoefficient,
			errorRate,
			nodeStats.avgExecutionTime,
		);

		// Generate recommendations
		const recommendations = this.generatePerformanceRecommendations(
			nodeType,
			errorRate,
			nodeStats.avgExecutionTime,
			correlationCoefficient,
		);

		// Generate trend data
		const trendData = await this.generatePerformanceTrendData(nodeType, timeRange);

		const correlation: NodePerformanceCorrelation = {
			nodeType,
			correlationCoefficient,
			performanceImpact,
			averageExecutionTime: nodeStats.avgExecutionTime,
			errorRate,
			recommendations,
			trendData,
		};

		await this.cacheService.set(cacheKey, correlation, this.CACHE_TTL);
		return correlation;
	}

	/**
	 * Extract error pattern from error message
	 */
	private extractErrorPattern(errorMessage: string): string {
		// Simplified pattern extraction - in reality this would be more sophisticated
		if (errorMessage.includes('timeout')) return 'Connection Timeout';
		if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized'))
			return 'Authentication Failure';
		if (errorMessage.includes('not found') || errorMessage.includes('404'))
			return 'Resource Not Found';
		if (errorMessage.includes('rate limit') || errorMessage.includes('quota'))
			return 'Rate Limiting';
		if (errorMessage.includes('validation') || errorMessage.includes('invalid'))
			return 'Validation Error';
		if (errorMessage.includes('network') || errorMessage.includes('connection'))
			return 'Network Error';
		if (errorMessage.includes('permission') || errorMessage.includes('forbidden'))
			return 'Permission Error';
		if (errorMessage.includes('syntax') || errorMessage.includes('parse')) return 'Syntax Error';
		return 'General Error';
	}

	/**
	 * Determine pattern severity based on frequency and scope
	 */
	private determinePatterSeverity(
		frequency: number,
		nodeTypeCount: number,
	): 'low' | 'medium' | 'high' {
		if (frequency > 50 || nodeTypeCount > 5) return 'high';
		if (frequency > 10 || nodeTypeCount > 2) return 'medium';
		return 'low';
	}

	/**
	 * Generate pattern description
	 */
	private generatePatternDescription(pattern: string, nodeTypeCount: number): string {
		return `${pattern} affecting ${nodeTypeCount} node type${nodeTypeCount > 1 ? 's' : ''}`;
	}

	/**
	 * Generate pattern recommendation
	 */
	private generatePatternRecommendation(pattern: string): string {
		const recommendations: Record<string, string> = {
			'Connection Timeout': 'Increase timeout values and implement retry logic',
			'Authentication Failure': 'Verify credentials and implement token refresh mechanism',
			'Resource Not Found': 'Validate resource URLs and implement fallback handling',
			'Rate Limiting': 'Implement exponential backoff and request queuing',
			'Validation Error': 'Add input validation and schema checking',
			'Network Error': 'Implement network resilience and retry strategies',
			'Permission Error': 'Review and update access permissions',
			'Syntax Error': 'Validate expressions and add syntax checking',
		};
		return recommendations[pattern] || 'Review node configuration and error handling';
	}

	/**
	 * Calculate correlation coefficient between execution time and error occurrence
	 */
	private calculateCorrelationCoefficient(errors: ErrorData[], avgExecutionTime: number): number {
		if (errors.length === 0) return 0;

		// Simple correlation calculation - in reality this would be more sophisticated
		const errorExecutionTimes = errors.filter((e) => e.executionTime).map((e) => e.executionTime!);
		if (errorExecutionTimes.length === 0) return 0;

		const avgErrorExecutionTime =
			errorExecutionTimes.reduce((sum, time) => sum + time, 0) / errorExecutionTimes.length;

		// Correlation based on whether errors occur more frequently with longer execution times
		const correlation = avgErrorExecutionTime > avgExecutionTime ? 0.7 : -0.3;
		return Math.max(-1, Math.min(1, correlation));
	}

	/**
	 * Determine performance impact level
	 */
	private determinePerformanceImpact(
		correlation: number,
		errorRate: number,
		avgExecutionTime: number,
	): 'low' | 'medium' | 'high' {
		if (Math.abs(correlation) > 0.6 && (errorRate > 10 || avgExecutionTime > 10000)) return 'high';
		if (Math.abs(correlation) > 0.3 && (errorRate > 5 || avgExecutionTime > 5000)) return 'medium';
		return 'low';
	}

	/**
	 * Generate performance recommendations
	 */
	private generatePerformanceRecommendations(
		nodeType: string,
		errorRate: number,
		avgExecutionTime: number,
		correlation: number,
	): NodePerformanceCorrelation['recommendations'] {
		const recommendations = [];

		if (avgExecutionTime > 10000) {
			recommendations.push({
				type: 'performance' as const,
				priority: 'high' as const,
				description: 'High average execution time detected',
				expectedImprovement: 'Reduce execution time by 40-60%',
			});
		}

		if (errorRate > 10) {
			recommendations.push({
				type: 'reliability' as const,
				priority: 'high' as const,
				description: 'High error rate indicates reliability issues',
				expectedImprovement: 'Reduce error rate to <5%',
			});
		}

		if (Math.abs(correlation) > 0.5) {
			recommendations.push({
				type: 'configuration' as const,
				priority: 'medium' as const,
				description: 'Strong correlation between performance and errors',
				expectedImprovement: 'Optimize configuration for better performance',
			});
		}

		return recommendations;
	}

	/**
	 * Generate performance trend data
	 */
	private async generatePerformanceTrendData(
		nodeType: string,
		timeRange: { start: Date; end: Date },
	): Promise<NodePerformanceCorrelation['trendData']> {
		// Generate daily trend data for the time range
		const trendData = [];
		const current = new Date(timeRange.start);
		const end = timeRange.end;

		while (current <= end) {
			const dayStart = new Date(current);
			const dayEnd = new Date(current);
			dayEnd.setHours(23, 59, 59, 999);

			const dayErrorData = await this.getErrorDataByNodeType(
				{ startDate: dayStart, endDate: dayEnd },
				nodeType,
			);

			const dayExecutionStats = await this.getExecutionStatsByNodeType(
				{ startDate: dayStart, endDate: dayEnd },
				nodeType,
			);

			const nodeStats = dayExecutionStats[nodeType];
			const dayErrors = dayErrorData.filter((error) => error.nodeType === nodeType);
			const dayErrorRate = nodeStats ? (dayErrors.length / nodeStats.totalExecutions) * 100 : 0;

			trendData.push({
				date: current.toISOString().split('T')[0],
				errorRate: dayErrorRate,
				avgExecutionTime: nodeStats?.avgExecutionTime || 0,
				executionCount: nodeStats?.totalExecutions || 0,
			});

			current.setDate(current.getDate() + 1);
		}

		return trendData;
	}

	/**
	 * Get date range from query parameters
	 */
	private getDateRange(startDate?: string, endDate?: string) {
		const end = endDate ? new Date(endDate) : new Date();
		const start = startDate
			? new Date(startDate)
			: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

		return { startDate: start, endDate: end };
	}
}
