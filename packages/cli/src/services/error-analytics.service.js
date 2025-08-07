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
exports.ErrorAnalyticsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const cache_service_1 = require('@/services/cache/cache.service');
let ErrorAnalyticsService = class ErrorAnalyticsService {
	constructor(logger, executionRepository, workflowRepository, cacheService) {
		this.logger = logger;
		this.executionRepository = executionRepository;
		this.workflowRepository = workflowRepository;
		this.cacheService = cacheService;
		this.CACHE_TTL = 300;
		this.INSIGHTS_CACHE_TTL = 900;
	}
	async getNodeErrorInsights(query) {
		const cacheKey = `node-error-insights:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const dateRange = this.getDateRange(query.startDate, query.endDate);
		const [errorData, executionStats, trendData] = await Promise.all([
			this.getErrorDataByNodeType(dateRange, query.nodeType, query.workflowId),
			this.getExecutionStatsByNodeType(dateRange, query.nodeType, query.workflowId),
			this.getErrorTrendData(dateRange, query.groupBy, query.nodeType),
		]);
		const nodeTypeStats = this.aggregateNodeErrorStats(errorData, executionStats);
		const totalErrors = nodeTypeStats.reduce((sum, stat) => sum + stat.totalErrors, 0);
		const totalExecutions = Object.values(executionStats).reduce(
			(sum, stat) => sum + stat.totalExecutions,
			0,
		);
		const overallErrorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;
		const recommendations = this.generateErrorRecommendations(nodeTypeStats);
		const insights = {
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
	async getNodeErrorBreakdown(query) {
		const cacheKey = `node-error-breakdown:${query.nodeType}:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		const dateRange = this.getDateRange(query.startDate, query.endDate);
		const errorData = await this.getErrorDataByNodeType(dateRange, query.nodeType);
		const nodeErrors = errorData.filter((error) => error.nodeType === query.nodeType);
		const errorTypeMap = new Map();
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
		const breakdown = {
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
	async getSystemHealthMetrics(query) {
		const cacheKey = `system-health:${JSON.stringify(query)}`;
		const cached = await this.cacheService.get(cacheKey);
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
		const nodeErrorCounts = new Map();
		const nodeExecutionCounts = new Map();
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
		const alerts = this.generateSystemAlerts(errorData, executionStats, dateRange);
		const healthMetrics = {
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
	async getErrorDataByNodeType(dateRange, nodeType, workflowId) {
		this.logger.debug('Fetching error data by node type', {
			dateRange,
			nodeType,
			workflowId,
		});
		const mockErrors = [
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
	async getExecutionStatsByNodeType(dateRange, nodeType, workflowId) {
		const mockStats = {
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
	async getErrorTrendData(dateRange, groupBy, nodeType) {
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
	aggregateNodeErrorStats(errorData, executionStats) {
		const nodeTypeMap = new Map();
		Object.entries(executionStats).forEach(([nodeType, stats]) => {
			nodeTypeMap.set(nodeType, {
				nodeType,
				totalErrors: 0,
				errorTypes: new Map(),
				totalExecutions: stats.totalExecutions,
				avgExecutionTime: stats.avgExecutionTime,
			});
		});
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
	generateErrorRecommendations(nodeTypeStats) {
		const recommendations = [];
		nodeTypeStats.forEach((stat) => {
			if (stat.errorRate > 10) {
				recommendations.push({
					nodeType: stat.nodeType,
					issue: `High error rate of ${stat.errorRate.toFixed(1)}%`,
					suggestion: 'Review node configuration and add error handling',
					priority: 'high',
					potentialImpact: 'Significant workflow reliability issues',
				});
			} else if (stat.avgExecutionTime && stat.avgExecutionTime > 10000) {
				recommendations.push({
					nodeType: stat.nodeType,
					issue: `Slow execution time averaging ${(stat.avgExecutionTime / 1000).toFixed(1)}s`,
					suggestion: 'Optimize API calls and implement caching where possible',
					priority: 'medium',
					potentialImpact: 'Workflow performance degradation',
				});
			} else if (stat.errorTrend === 'increasing') {
				recommendations.push({
					nodeType: stat.nodeType,
					issue: 'Increasing error trend detected',
					suggestion: 'Monitor node configuration changes and external service status',
					priority: 'medium',
					potentialImpact: 'Potential service degradation',
				});
			}
		});
		return recommendations.slice(0, 10);
	}
	async getSystemHealthByPeriod(dateRange, groupBy) {
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
	generateSystemAlerts(errorData, executionStats, dateRange) {
		const alerts = [];
		const now = new Date();
		const recentErrors = errorData.filter(
			(error) => error.timestamp > new Date(now.getTime() - 3600000),
		);
		if (recentErrors.length > 20) {
			alerts.push({
				type: 'error_spike',
				severity: 'critical',
				message: `Error spike detected: ${recentErrors.length} errors in the last hour`,
				nodeType: null,
				detectedAt: now.toISOString(),
				affectedExecutions: recentErrors.length,
			});
		}
		Object.entries(executionStats).forEach(([nodeType, stats]) => {
			if (stats.avgExecutionTime > 15000) {
				alerts.push({
					type: 'performance_degradation',
					severity: 'warning',
					message: `${nodeType} nodes showing slow execution times`,
					nodeType,
					detectedAt: now.toISOString(),
					affectedExecutions: stats.totalExecutions,
				});
			}
		});
		return alerts;
	}
	determineFailureImpact(errorCount, errorRate, executionCount) {
		if (errorRate > 15 || errorCount > 100) return 'high';
		if (errorRate > 5 || errorCount > 20) return 'medium';
		return 'low';
	}
	determineErrorTrend(errorCount, errorRate) {
		if (errorRate > 8) return 'increasing';
		if (errorRate < 2) return 'decreasing';
		return 'stable';
	}
	calculateAverageExecutionTime(executionStats) {
		const entries = Object.values(executionStats);
		if (entries.length === 0) return 0;
		const totalWeightedTime = entries.reduce(
			(sum, stat) => sum + stat.avgExecutionTime * stat.totalExecutions,
			0,
		);
		const totalExecutions = entries.reduce((sum, stat) => sum + stat.totalExecutions, 0);
		return totalExecutions > 0 ? totalWeightedTime / totalExecutions : 0;
	}
	async getNodeErrorBreakdown(nodeType, timeRange) {
		const cacheKey = `node-breakdown:${nodeType}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		this.logger.debug('Generating node error breakdown', { nodeType, timeRange });
		const errorData = await this.getErrorDataByNodeType(
			{ startDate: timeRange.start, endDate: timeRange.end },
			nodeType,
		);
		const nodeErrors = errorData.filter((error) => error.nodeType === nodeType);
		const errorTypeMap = new Map();
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
		const breakdown = {
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
	async identifyErrorPatterns(
		nodeTypes,
		timeRange = {
			start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			end: new Date(),
		},
	) {
		const cacheKey = `error-patterns:${nodeTypes?.join(',') || 'all'}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
		if (cached) return cached;
		this.logger.debug('Identifying error patterns', { nodeTypes, timeRange });
		const errorData = await this.getErrorDataByNodeType({
			startDate: timeRange.start,
			endDate: timeRange.end,
		});
		const filteredErrors = nodeTypes
			? errorData.filter((error) => nodeTypes.includes(error.nodeType))
			: errorData;
		const patternMap = new Map();
		filteredErrors.forEach((error) => {
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
		const patterns = Array.from(patternMap.entries())
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
	async analyzePerformanceCorrelation(nodeType, timeRange) {
		const cacheKey = `performance-correlation:${nodeType}:${timeRange.start.getTime()}:${timeRange.end.getTime()}`;
		const cached = await this.cacheService.get(cacheKey);
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
		const correlationCoefficient = this.calculateCorrelationCoefficient(
			nodeErrors,
			nodeStats.avgExecutionTime,
		);
		const performanceImpact = this.determinePerformanceImpact(
			correlationCoefficient,
			errorRate,
			nodeStats.avgExecutionTime,
		);
		const recommendations = this.generatePerformanceRecommendations(
			nodeType,
			errorRate,
			nodeStats.avgExecutionTime,
			correlationCoefficient,
		);
		const trendData = await this.generatePerformanceTrendData(nodeType, timeRange);
		const correlation = {
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
	extractErrorPattern(errorMessage) {
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
	determinePatterSeverity(frequency, nodeTypeCount) {
		if (frequency > 50 || nodeTypeCount > 5) return 'high';
		if (frequency > 10 || nodeTypeCount > 2) return 'medium';
		return 'low';
	}
	generatePatternDescription(pattern, nodeTypeCount) {
		return `${pattern} affecting ${nodeTypeCount} node type${nodeTypeCount > 1 ? 's' : ''}`;
	}
	generatePatternRecommendation(pattern) {
		const recommendations = {
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
	calculateCorrelationCoefficient(errors, avgExecutionTime) {
		if (errors.length === 0) return 0;
		const errorExecutionTimes = errors.filter((e) => e.executionTime).map((e) => e.executionTime);
		if (errorExecutionTimes.length === 0) return 0;
		const avgErrorExecutionTime =
			errorExecutionTimes.reduce((sum, time) => sum + time, 0) / errorExecutionTimes.length;
		const correlation = avgErrorExecutionTime > avgExecutionTime ? 0.7 : -0.3;
		return Math.max(-1, Math.min(1, correlation));
	}
	determinePerformanceImpact(correlation, errorRate, avgExecutionTime) {
		if (Math.abs(correlation) > 0.6 && (errorRate > 10 || avgExecutionTime > 10000)) return 'high';
		if (Math.abs(correlation) > 0.3 && (errorRate > 5 || avgExecutionTime > 5000)) return 'medium';
		return 'low';
	}
	generatePerformanceRecommendations(nodeType, errorRate, avgExecutionTime, correlation) {
		const recommendations = [];
		if (avgExecutionTime > 10000) {
			recommendations.push({
				type: 'performance',
				priority: 'high',
				description: 'High average execution time detected',
				expectedImprovement: 'Reduce execution time by 40-60%',
			});
		}
		if (errorRate > 10) {
			recommendations.push({
				type: 'reliability',
				priority: 'high',
				description: 'High error rate indicates reliability issues',
				expectedImprovement: 'Reduce error rate to <5%',
			});
		}
		if (Math.abs(correlation) > 0.5) {
			recommendations.push({
				type: 'configuration',
				priority: 'medium',
				description: 'Strong correlation between performance and errors',
				expectedImprovement: 'Optimize configuration for better performance',
			});
		}
		return recommendations;
	}
	async generatePerformanceTrendData(nodeType, timeRange) {
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
	getDateRange(startDate, endDate) {
		const end = endDate ? new Date(endDate) : new Date();
		const start = startDate
			? new Date(startDate)
			: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
		return { startDate: start, endDate: end };
	}
};
exports.ErrorAnalyticsService = ErrorAnalyticsService;
exports.ErrorAnalyticsService = ErrorAnalyticsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.ExecutionRepository,
			db_1.WorkflowRepository,
			cache_service_1.CacheService,
		]),
	],
	ErrorAnalyticsService,
);
//# sourceMappingURL=error-analytics.service.js.map
