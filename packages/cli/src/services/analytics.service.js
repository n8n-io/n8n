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
exports.AnalyticsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const cache_service_1 = require('@/services/cache/cache.service');
const error_analytics_service_1 = require('./error-analytics.service');
let AnalyticsService = class AnalyticsService {
	constructor(
		logger,
		executionRepository,
		workflowRepository,
		userRepository,
		cacheService,
		errorAnalyticsService,
	) {
		this.logger = logger;
		this.executionRepository = executionRepository;
		this.workflowRepository = workflowRepository;
		this.userRepository = userRepository;
		this.cacheService = cacheService;
		this.errorAnalyticsService = errorAnalyticsService;
		this.CACHE_TTL = 900;
		this.SYSTEM_CACHE_TTL = 300;
	}
	async getSystemAnalytics(timeRange = this.getDefaultTimeRange()) {
		const cacheKey = `system-analytics:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) {
			return cached;
		}
		this.logger.debug('Generating system analytics', { timeRange });
		try {
			const totalExecutions = await this.getTotalExecutions(timeRange);
			const totalErrors = await this.getTotalErrors(timeRange);
			const overallErrorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;
			const activeWorkflows = await this.getActiveWorkflowsCount(timeRange);
			const activeUsers = await this.getActiveUsersCount(timeRange);
			const trends = await this.calculateTrends(timeRange);
			const topErrorNodes = await this.getTopErrorNodes(timeRange);
			const analytics = {
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
	async getNodeTypeAnalytics(nodeType, timeRange = this.getDefaultTimeRange()) {
		const cacheKey = `node-analytics:${nodeType}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) {
			return cached;
		}
		this.logger.debug('Generating node type analytics', { nodeType, timeRange });
		try {
			const workflows = await this.getWorkflowsWithNodeType(nodeType);
			const totalWorkflows = workflows.length;
			const executions = await this.getExecutionsForNodeType(nodeType, timeRange);
			const totalExecutions = executions.length;
			const successfulExecutions = executions.filter((e) => e.status === 'success').length;
			const failedExecutions = totalExecutions - successfulExecutions;
			const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;
			const performanceMetrics = await this.calculateNodePerformanceMetrics(executions);
			const averageExecutionTime = performanceMetrics.p50ExecutionTime;
			const popularityRank = await this.getNodePopularityRank(nodeType);
			const commonConfigurationIssues = await this.identifyConfigurationIssues(
				nodeType,
				executions,
			);
			const analytics = {
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
	async getAllNodeTypes(timeRange = this.getDefaultTimeRange()) {
		const cacheKey = `all-node-types:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) {
			return cached;
		}
		try {
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
	async compareNodeTypes(nodeTypes, timeRange = this.getDefaultTimeRange()) {
		const cacheKey = `compare-nodes:${nodeTypes.join(',')}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
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
	getDefaultTimeRange() {
		const end = new Date();
		const start = new Date();
		start.setDate(start.getDate() - 7);
		return { start, end };
	}
	async getTotalExecutions(timeRange) {
		return this.executionRepository
			.createQueryBuilder('execution')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.getCount();
	}
	async getTotalErrors(timeRange) {
		return this.executionRepository
			.createQueryBuilder('execution')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.andWhere('execution.status IN (:...statuses)', { statuses: ['failed', 'crashed'] })
			.getCount();
	}
	async getActiveWorkflowsCount(timeRange) {
		return this.workflowRepository
			.createQueryBuilder('workflow')
			.innerJoin('execution', 'execution', 'execution.workflowId = workflow.id')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.distinctOn(['workflow.id'])
			.getCount();
	}
	async getActiveUsersCount(timeRange) {
		return this.userRepository
			.createQueryBuilder('user')
			.where('user.lastActivity >= :start', { start: timeRange.start })
			.getCount();
	}
	async calculateTrends(timeRange) {
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
		const errorTrend = this.calculateTrend(currentErrors, previousErrors, true);
		const performanceTrend = 'stable';
		return {
			executionTrend,
			errorTrend,
			performanceTrend,
		};
	}
	calculateTrend(current, previous, invert = false) {
		if (previous === 0) return 'stable';
		const changePercent = ((current - previous) / previous) * 100;
		const threshold = 5;
		if (Math.abs(changePercent) < threshold) return 'stable';
		const isIncreasing = changePercent > 0;
		if (invert) {
			return isIncreasing ? 'worsening' : 'improving';
		}
		return isIncreasing ? 'increasing' : 'decreasing';
	}
	async getTopErrorNodes(timeRange, limit = 10) {
		return [];
	}
	async getWorkflowsWithNodeType(nodeType) {
		return this.workflowRepository
			.createQueryBuilder('workflow')
			.where('workflow.nodes LIKE :nodeType', { nodeType: `%"type":"${nodeType}"%` })
			.select(['workflow.id'])
			.getMany();
	}
	async getExecutionsForNodeType(nodeType, timeRange) {
		return this.executionRepository
			.createQueryBuilder('execution')
			.leftJoin('workflow', 'workflow', 'workflow.id = execution.workflowId')
			.where('execution.startedAt >= :start', { start: timeRange.start })
			.andWhere('execution.startedAt <= :end', { end: timeRange.end })
			.andWhere('workflow.nodes LIKE :nodeType', { nodeType: `%"type":"${nodeType}"%` })
			.select(['execution.id', 'execution.status', 'execution.startedAt', 'execution.stoppedAt'])
			.getMany();
	}
	async calculateNodePerformanceMetrics(executions) {
		const executionTimes = executions
			.filter((e) => e.stoppedAt)
			.map((e) => e.stoppedAt.getTime() - e.startedAt.getTime())
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
			averageMemoryUsage: 0,
		};
	}
	async getNodePopularityRank(nodeType) {
		const allNodeTypes = await this.getAllNodeTypes();
		const nodeIndex = allNodeTypes.findIndex((n) => n.nodeType === nodeType);
		return nodeIndex >= 0 ? nodeIndex + 1 : -1;
	}
	async identifyConfigurationIssues(nodeType, executions) {
		const issues = [];
		const failedExecutions = executions.filter(
			(e) => e.status === 'failed' || e.status === 'crashed',
		);
		const errorRate =
			executions.length > 0 ? (failedExecutions.length / executions.length) * 100 : 0;
		if (errorRate > 20) {
			issues.push('High error rate suggests configuration issues');
		}
		return issues;
	}
	async extractNodeTypesFromWorkflows(timeRange) {
		return [
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.set',
			'n8n-nodes-base.if',
			'n8n-nodes-base.webhook',
			'n8n-nodes-base.code',
		];
	}
	calculateNodeScore(analytics) {
		const errorPenalty = analytics.errorRate * -2;
		const usageBonus = Math.log(analytics.totalExecutions + 1) * 10;
		const speedBonus =
			analytics.averageExecutionTime > 0 ? 1000 / analytics.averageExecutionTime : 0;
		return usageBonus + speedBonus + errorPenalty;
	}
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.ExecutionRepository,
			db_1.WorkflowRepository,
			db_1.UserRepository,
			cache_service_1.CacheService,
			error_analytics_service_1.ErrorAnalyticsService,
		]),
	],
	AnalyticsService,
);
//# sourceMappingURL=analytics.service.js.map
