import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, WorkflowRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionStatus } from 'n8n-workflow';
import { CacheService } from '@/services/cache/cache.service';
import { ErrorAnalyticsService } from './error-analytics.service';

export interface SystemAnalytics {
	overview: {
		totalExecutions: number;
		totalErrors: number;
		overallErrorRate: number;
		activeWorkflows: number;
		activeUsers: number;
	};
	trends: {
		executionTrend: 'increasing' | 'decreasing' | 'stable';
		errorTrend: 'improving' | 'worsening' | 'stable';
		performanceTrend: 'improving' | 'degrading' | 'stable';
	};
	topErrorNodes: Array<{
		nodeType: string;
		errorCount: number;
		errorRate: number;
		lastError: Date;
	}>;
	timeRange: { start: Date; end: Date };
}

export interface NodeTypeAnalytics {
	nodeType: string;
	totalWorkflows: number;
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	errorRate: number;
	averageExecutionTime: number;
	popularityRank: number;
	commonConfigurationIssues: string[];
	performanceMetrics: {
		p50ExecutionTime: number;
		p95ExecutionTime: number;
		p99ExecutionTime: number;
		averageMemoryUsage: number;
	};
}

export interface AnalyticsQuery {
	timeRange?: { start: Date; end: Date };
	nodeTypes?: string[];
	workflowIds?: string[];
	userIds?: string[];
	includeDetails?: boolean;
}

@Service()
export class AnalyticsService {
	private readonly CACHE_TTL = 900; // 15 minutes
	private readonly SYSTEM_CACHE_TTL = 300; // 5 minutes

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly cacheService: CacheService,
		private readonly errorAnalyticsService: ErrorAnalyticsService,
	) {}

	/**
	 * Get comprehensive system analytics
	 */
	async getSystemAnalytics(
		timeRange: { start: Date; end: Date } = this.getDefaultTimeRange(),
	): Promise<SystemAnalytics> {
		const cacheKey = `system-analytics:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get<SystemAnalytics>(cacheKey);
		if (cached) {
			return cached;
		}

		this.logger.debug('Generating system analytics', { timeRange });

		try {
			// Get basic execution metrics
			const totalExecutions = await this.getTotalExecutions(timeRange);
			const totalErrors = await this.getTotalErrors(timeRange);
			const overallErrorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;

			// Get workflow and user metrics
			const activeWorkflows = await this.getActiveWorkflowsCount(timeRange);
			const activeUsers = await this.getActiveUsersCount(timeRange);

			// Calculate trends
			const trends = await this.calculateTrends(timeRange);

			// Get top error nodes
			const topErrorNodes = await this.getTopErrorNodes(timeRange);

			const analytics: SystemAnalytics = {
				overview: {
					totalExecutions,
					totalErrors,
					overallErrorRate,
					activeWorkflows,
					activeUsers,
				},
				trends,
				topErrorNodes,
				timeRange,
			};

			await this.cacheService.set(cacheKey, analytics, this.SYSTEM_CACHE_TTL);
			return analytics;
		} catch (error) {
			this.logger.error('Failed to generate system analytics', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get analytics for a specific node type
	 */
	async getNodeTypeAnalytics(
		nodeType: string,
		timeRange: { start: Date; end: Date } = this.getDefaultTimeRange(),
	): Promise<NodeTypeAnalytics> {
		const cacheKey = `node-analytics:${nodeType}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get<NodeTypeAnalytics>(cacheKey);
		if (cached) {
			return cached;
		}

		this.logger.debug('Generating node type analytics', { nodeType, timeRange });

		try {
			// Get workflows containing this node type
			const workflows = await this.getWorkflowsWithNodeType(nodeType);
			const totalWorkflows = workflows.length;

			// Get execution metrics
			const executions = await this.getExecutionsForNodeType(nodeType, timeRange);
			const totalExecutions = executions.length;
			const successfulExecutions = executions.filter((e) => e.status === 'success').length;
			const failedExecutions = totalExecutions - successfulExecutions;
			const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;

			// Calculate performance metrics
			const performanceMetrics = await this.calculateNodePerformanceMetrics(executions);
			const averageExecutionTime = performanceMetrics.p50ExecutionTime;

			// Get popularity rank
			const popularityRank = await this.getNodePopularityRank(nodeType);

			// Identify common configuration issues
			const commonConfigurationIssues = await this.identifyConfigurationIssues(
				nodeType,
				executions,
			);

			const analytics: NodeTypeAnalytics = {
				nodeType,
				totalWorkflows,
				totalExecutions,
				successfulExecutions,
				failedExecutions,
				errorRate,
				averageExecutionTime,
				popularityRank,
				commonConfigurationIssues,
				performanceMetrics,
			};

			await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);
			return analytics;
		} catch (error) {
			this.logger.error('Failed to generate node type analytics', {
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get all available node types with basic statistics
	 */
	async getAllNodeTypes(
		timeRange: { start: Date; end: Date } = this.getDefaultTimeRange(),
	): Promise<
		Array<{
			nodeType: string;
			usageCount: number;
			errorRate: number;
			lastUsed: Date;
		}>
	> {
		const cacheKey = `all-node-types:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached =
			await this.cacheService.get<
				Array<{
					nodeType: string;
					usageCount: number;
					errorRate: number;
					lastUsed: Date;
				}>
			>(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			// This would query the database to get all node types used in workflows
			const nodeTypes = await this.extractNodeTypesFromWorkflows(timeRange);

			const nodeTypeStats = await Promise.all(
				nodeTypes.map(async (nodeType) => {
					const executions = await this.getExecutionsForNodeType(nodeType, timeRange);
					const failedExecutions = executions.filter(
						(e) => e.status === 'failed' || e.status === 'crashed',
					);

					return {
						nodeType,
						usageCount: executions.length,
						errorRate:
							executions.length > 0 ? (failedExecutions.length / executions.length) * 100 : 0,
						lastUsed:
							executions.length > 0
								? new Date(Math.max(...executions.map((e) => e.startedAt.getTime())))
								: new Date(0),
					};
				}),
			);

			// Sort by usage count descending
			nodeTypeStats.sort((a, b) => b.usageCount - a.usageCount);

			await this.cacheService.set(cacheKey, nodeTypeStats, this.CACHE_TTL);
			return nodeTypeStats;
		} catch (error) {
			this.logger.error('Failed to get all node types', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Get comparative analytics between multiple node types
	 */
	async compareNodeTypes(
		nodeTypes: string[],
		timeRange: { start: Date; end: Date } = this.getDefaultTimeRange(),
	): Promise<Array<NodeTypeAnalytics & { rank: number }>> {
		const cacheKey = `compare-nodes:${nodeTypes.join(',')}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached =
			await this.cacheService.get<Array<NodeTypeAnalytics & { rank: number }>>(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const comparisons = await Promise.all(
				nodeTypes.map(async (nodeType) => {
					const analytics = await this.getNodeTypeAnalytics(nodeType, timeRange);
					return analytics;
				}),
			);

			// Add ranking based on performance (lower error rate + faster execution = better rank)
			const rankedComparisons = comparisons
				.map((analytics) => ({
					...analytics,
					score: this.calculateNodeScore(analytics),
				}))
				.sort((a, b) => b.score - a.score)
				.map((analytics, index) => ({
					...analytics,
					rank: index + 1,
				}));

			await this.cacheService.set(cacheKey, rankedComparisons, this.CACHE_TTL);
			return rankedComparisons;
		} catch (error) {
			this.logger.error('Failed to compare node types', {
				nodeTypes,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Private helper methods
	 */
	private getDefaultTimeRange(): { start: Date; end: Date } {
		const end = new Date();
		const start = new Date();
		start.setDate(start.getDate() - 7); // Last 7 days
		return { start, end };
	}

	private async getTotalExecutions(timeRange: { start: Date; end: Date }): Promise<number> {
		return this.executionRepository
			.createQueryBuilder('execution')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.getCount();
	}

	private async getTotalErrors(timeRange: { start: Date; end: Date }): Promise<number> {
		return this.executionRepository
			.createQueryBuilder('execution')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.andWhere('execution.status IN (:...statuses)', { statuses: ['failed', 'crashed'] })
			.getCount();
	}

	private async getActiveWorkflowsCount(timeRange: { start: Date; end: Date }): Promise<number> {
		return this.workflowRepository
			.createQueryBuilder('workflow')
			.innerJoin('execution', 'execution', 'execution.workflowId = workflow.id')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.distinctOn(['workflow.id'])
			.getCount();
	}

	private async getActiveUsersCount(timeRange: { start: Date; end: Date }): Promise<number> {
		// This would require joining with user activity or execution ownership
		return this.userRepository
			.createQueryBuilder('user')
			.where('user.lastActivity >= :start', { start: timeRange.start })
			.getCount();
	}

	private async calculateTrends(timeRange: { start: Date; end: Date }): Promise<
		SystemAnalytics['trends']
	> {
		// Calculate trends by comparing current period with previous period
		const periodDuration = timeRange.end.getTime() - timeRange.start.getTime();
		const previousPeriod = {
			start: new Date(timeRange.start.getTime() - periodDuration),
			end: timeRange.start,
		};

		const currentExecutions = await this.getTotalExecutions(timeRange);
		const previousExecutions = await this.getTotalExecutions(previousPeriod);
		const currentErrors = await this.getTotalErrors(timeRange);
		const previousErrors = await this.getTotalErrors(previousPeriod);

		const executionTrend = this.calculateTrend(currentExecutions, previousExecutions);
		const errorTrend = this.calculateTrend(currentErrors, previousErrors, true); // Invert for errors
		const performanceTrend = 'stable'; // Would need performance metrics to calculate

		return {
			executionTrend,
			errorTrend,
			performanceTrend,
		};
	}

	private calculateTrend(
		current: number,
		previous: number,
		invert: boolean = false,
	): 'increasing' | 'decreasing' | 'stable' {
		if (previous === 0) return 'stable';

		const changePercent = ((current - previous) / previous) * 100;
		const threshold = 5; // 5% threshold for considering a trend

		if (Math.abs(changePercent) < threshold) return 'stable';

		const isIncreasing = changePercent > 0;

		if (invert) {
			return isIncreasing ? 'worsening' : 'improving';
		}

		return isIncreasing ? 'increasing' : 'decreasing';
	}

	private async getTopErrorNodes(
		timeRange: { start: Date; end: Date },
		limit: number = 10,
	): Promise<SystemAnalytics['topErrorNodes']> {
		// This would query executions and extract node types with highest error counts
		// For now, return empty array as implementation would require complex queries
		return [];
	}

	private async getWorkflowsWithNodeType(nodeType: string): Promise<Array<{ id: string }>> {
		return this.workflowRepository
			.createQueryBuilder('workflow')
			.where('workflow.nodes LIKE :nodeType', { nodeType: `%"type":"${nodeType}"%` })
			.select(['workflow.id'])
			.getMany();
	}

	private async getExecutionsForNodeType(
		nodeType: string,
		timeRange: { start: Date; end: Date },
	): Promise<
		Array<{
			id: string;
			status: ExecutionStatus;
			startedAt: Date;
			stoppedAt?: Date;
		}>
	> {
		return this.executionRepository
			.createQueryBuilder('execution')
			.leftJoin('workflow', 'workflow', 'workflow.id = execution.workflowId')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.andWhere('workflow.nodes LIKE :nodeType', { nodeType: `%"type":"${nodeType}"%` })
			.select(['execution.id', 'execution.status', 'execution.startedAt', 'execution.stoppedAt'])
			.getMany();
	}

	private async calculateNodePerformanceMetrics(
		executions: Array<{ startedAt: Date; stoppedAt?: Date }>,
	): Promise<NodeTypeAnalytics['performanceMetrics']> {
		const executionTimes = executions
			.filter((e) => e.stoppedAt)
			.map((e) => e.stoppedAt!.getTime() - e.startedAt.getTime())
			.sort((a, b) => a - b);

		if (executionTimes.length === 0) {
			return {
				p50ExecutionTime: 0,
				p95ExecutionTime: 0,
				p99ExecutionTime: 0,
				averageMemoryUsage: 0,
			};
		}

		const p50Index = Math.floor(executionTimes.length * 0.5);
		const p95Index = Math.floor(executionTimes.length * 0.95);
		const p99Index = Math.floor(executionTimes.length * 0.99);

		return {
			p50ExecutionTime: executionTimes[p50Index],
			p95ExecutionTime: executionTimes[p95Index],
			p99ExecutionTime: executionTimes[p99Index],
			averageMemoryUsage: 0, // Would need memory tracking
		};
	}

	private async getNodePopularityRank(nodeType: string): Promise<number> {
		const allNodeTypes = await this.getAllNodeTypes();
		const nodeIndex = allNodeTypes.findIndex((n) => n.nodeType === nodeType);
		return nodeIndex >= 0 ? nodeIndex + 1 : -1;
	}

	private async identifyConfigurationIssues(
		nodeType: string,
		executions: Array<{ status: ExecutionStatus }>,
	): Promise<string[]> {
		const issues: string[] = [];

		const failedExecutions = executions.filter(
			(e) => e.status === 'failed' || e.status === 'crashed',
		);
		const errorRate =
			executions.length > 0 ? (failedExecutions.length / executions.length) * 100 : 0;

		if (errorRate > 20) {
			issues.push('High error rate suggests configuration issues');
		}

		// Would analyze specific error patterns for this node type
		return issues;
	}

	private async extractNodeTypesFromWorkflows(timeRange: { start: Date; end: Date }): Promise<
		string[]
	> {
		// This would extract all unique node types from workflows used in the time range
		// For now, return some common node types
		return [
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.set',
			'n8n-nodes-base.if',
			'n8n-nodes-base.webhook',
			'n8n-nodes-base.code',
		];
	}

	private calculateNodeScore(analytics: NodeTypeAnalytics): number {
		// Calculate a performance score based on multiple factors
		const errorPenalty = analytics.errorRate * -2; // High error rate is bad
		const usageBonus = Math.log(analytics.totalExecutions + 1) * 10; // More usage is good
		const speedBonus =
			analytics.averageExecutionTime > 0 ? 1000 / analytics.averageExecutionTime : 0;

		return usageBonus + speedBonus + errorPenalty;
	}
}
