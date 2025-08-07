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
exports.SearchAnalyticsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const cache_service_1 = require('@/services/cache/cache.service');
let SearchAnalyticsService = class SearchAnalyticsService {
	constructor(logger, cacheService) {
		this.logger = logger;
		this.cacheService = cacheService;
		this.ANALYTICS_CACHE_KEY = 'search_analytics';
		this.METRICS_RETENTION_DAYS = 30;
		this.ANALYTICS_UPDATE_INTERVAL = 5 * 60 * 1000;
		this.metricsBuffer = [];
		this.lastAnalyticsUpdate = 0;
		setInterval(() => {
			this.flushMetricsBuffer();
		}, 60 * 1000);
	}
	async recordSearchQuery(metrics) {
		try {
			this.metricsBuffer.push({
				...metrics,
				timestamp: new Date(),
			});
			this.logger.debug('Search query recorded', {
				query: metrics.query,
				userId: metrics.userId,
				searchTimeMs: metrics.searchTimeMs,
				resultCount: metrics.resultCount,
				searchMethod: metrics.searchMethod,
			});
			if (this.metricsBuffer.length >= 100) {
				await this.flushMetricsBuffer();
			}
		} catch (error) {
			this.logger.error('Failed to record search query', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async getSearchAnalytics(days = 7) {
		try {
			const cacheKey = `${this.ANALYTICS_CACHE_KEY}_${days}d`;
			const cachedAnalytics = await this.cacheService.get(cacheKey);
			if (cachedAnalytics && this.isCacheValid()) {
				return cachedAnalytics;
			}
			const analytics = await this.generateAnalytics(days);
			await this.cacheService.set(cacheKey, analytics, 5 * 60 * 1000);
			return analytics;
		} catch (error) {
			this.logger.error('Failed to get search analytics', {
				error: error instanceof Error ? error.message : String(error),
				days,
			});
			return this.getEmptyAnalytics();
		}
	}
	async getOptimizationSuggestions() {
		try {
			const analytics = await this.getSearchAnalytics(7);
			const suggestions = [];
			if (analytics.performanceMetrics.slowQueries > analytics.totalSearches * 0.1) {
				suggestions.push({
					type: 'query_slow',
					severity: 'high',
					title: 'High number of slow queries detected',
					description: `${analytics.performanceMetrics.slowQueries} queries (${Math.round((analytics.performanceMetrics.slowQueries / analytics.totalSearches) * 100)}%) are taking longer than 1 second`,
					action: 'Consider optimizing search indexes or query structure',
					impact: 'Improved user experience and reduced server load',
				});
			}
			if (analytics.searchEngineUsagePercent < 50) {
				suggestions.push({
					type: 'index_missing',
					severity: 'medium',
					title: 'Low search engine utilization',
					description: `Only ${Math.round(analytics.searchEngineUsagePercent)}% of searches are using the search engine`,
					action: 'Ensure search engine is properly configured and workflows are indexed',
					impact: 'Faster search response times and better relevance scoring',
				});
			}
			const popularFilters = analytics.topFilters.filter(
				(f) => f.count > analytics.totalSearches * 0.05,
			);
			if (popularFilters.length > 0) {
				suggestions.push({
					type: 'filter_popular',
					severity: 'low',
					title: 'Popular filters identified',
					description: `Filters ${popularFilters.map((f) => f.filter).join(', ')} are frequently used`,
					action: 'Consider creating quick filter shortcuts or improving filter UI',
					impact: 'Enhanced user experience for common search patterns',
					data: popularFilters,
				});
			}
			const noResultQueries = analytics.topQueries.filter((q) => q.count > 5).length;
			if (noResultQueries > 0) {
				suggestions.push({
					type: 'search_pattern',
					severity: 'medium',
					title: 'Repeated search patterns detected',
					description: `${noResultQueries} search queries are being repeated frequently`,
					action: 'Analyze search patterns to improve content discoverability',
					impact: 'Better search success rates and user satisfaction',
				});
			}
			return suggestions;
		} catch (error) {
			this.logger.error('Failed to get optimization suggestions', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}
	async getPopularQueries(limit = 10) {
		try {
			const allMetrics = await this.getAllMetrics(7);
			const queryStats = new Map();
			allMetrics.forEach((metric) => {
				const existing = queryStats.get(metric.query) || {
					count: 0,
					totalResponseTime: 0,
					lastSearched: new Date(0),
				};
				existing.count++;
				existing.totalResponseTime += metric.searchTimeMs;
				if (metric.timestamp > existing.lastSearched) {
					existing.lastSearched = metric.timestamp;
				}
				queryStats.set(metric.query, existing);
			});
			return Array.from(queryStats.entries())
				.map(([query, stats]) => ({
					query,
					count: stats.count,
					averageResponseTimeMs: Math.round(stats.totalResponseTime / stats.count),
					lastSearched: stats.lastSearched,
				}))
				.sort((a, b) => b.count - a.count)
				.slice(0, limit);
		} catch (error) {
			this.logger.error('Failed to get popular queries', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}
	async getPerformanceMetrics() {
		try {
			const metrics = await this.getAllMetrics(1);
			if (metrics.length === 0) {
				return {
					averageResponseTime: 0,
					p95ResponseTime: 0,
					p99ResponseTime: 0,
					searchEngineHealthScore: 100,
					totalSearchesToday: 0,
					errorRate: 0,
				};
			}
			const responseTimes = metrics.map((m) => m.searchTimeMs).sort((a, b) => a - b);
			const averageResponseTime =
				responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
			const p95Index = Math.floor(responseTimes.length * 0.95);
			const p99Index = Math.floor(responseTimes.length * 0.99);
			const searchEngineQueries = metrics.filter((m) => m.searchMethod === 'search_engine').length;
			const searchEngineHealthScore = Math.round((searchEngineQueries / metrics.length) * 100);
			return {
				averageResponseTime: Math.round(averageResponseTime),
				p95ResponseTime: responseTimes[p95Index] || 0,
				p99ResponseTime: responseTimes[p99Index] || 0,
				searchEngineHealthScore,
				totalSearchesToday: metrics.length,
				errorRate: 0,
			};
		} catch (error) {
			this.logger.error('Failed to get performance metrics', {
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				averageResponseTime: 0,
				p95ResponseTime: 0,
				p99ResponseTime: 0,
				searchEngineHealthScore: 0,
				totalSearchesToday: 0,
				errorRate: 100,
			};
		}
	}
	async cleanupOldAnalytics() {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - this.METRICS_RETENTION_DAYS);
			this.logger.debug('Analytics cleanup completed', {
				cutoffDate: cutoffDate.toISOString(),
				retentionDays: this.METRICS_RETENTION_DAYS,
			});
		} catch (error) {
			this.logger.error('Failed to cleanup old analytics', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	async flushMetricsBuffer() {
		if (this.metricsBuffer.length === 0) {
			return;
		}
		try {
			const cacheKey = `search_metrics_${Date.now()}`;
			await this.cacheService.set(cacheKey, this.metricsBuffer, 24 * 60 * 60 * 1000);
			this.logger.debug('Flushed search metrics to cache', {
				metricsCount: this.metricsBuffer.length,
			});
			this.metricsBuffer = [];
		} catch (error) {
			this.logger.error('Failed to flush metrics buffer', {
				error: error instanceof Error ? error.message : String(error),
				metricsCount: this.metricsBuffer.length,
			});
		}
	}
	async generateAnalytics(days) {
		const metrics = await this.getAllMetrics(days);
		if (metrics.length === 0) {
			return this.getEmptyAnalytics();
		}
		const totalSearches = metrics.length;
		const averageResponseTimeMs = Math.round(
			metrics.reduce((sum, m) => sum + m.searchTimeMs, 0) / totalSearches,
		);
		const searchEngineQueries = metrics.filter((m) => m.searchMethod === 'search_engine').length;
		const searchEngineUsagePercent = Math.round((searchEngineQueries / totalSearches) * 100);
		const queryCounts = new Map();
		metrics.forEach((m) => {
			const existing = queryCounts.get(m.query) || { count: 0, totalTime: 0 };
			existing.count++;
			existing.totalTime += m.searchTimeMs;
			queryCounts.set(m.query, existing);
		});
		const topQueries = Array.from(queryCounts.entries())
			.map(([query, stats]) => ({
				query,
				count: stats.count,
				averageResponseTimeMs: Math.round(stats.totalTime / stats.count),
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
		const filterCounts = new Map();
		metrics.forEach((m) => {
			Object.keys(m.filters || {}).forEach((filter) => {
				filterCounts.set(filter, (filterCounts.get(filter) || 0) + 1);
			});
		});
		const topFilters = Array.from(filterCounts.entries())
			.map(([filter, count]) => ({ filter, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
		const performanceMetrics = {
			fastQueries: metrics.filter((m) => m.searchTimeMs < 100).length,
			moderateQueries: metrics.filter((m) => m.searchTimeMs >= 100 && m.searchTimeMs <= 1000)
				.length,
			slowQueries: metrics.filter((m) => m.searchTimeMs > 1000).length,
		};
		const trendMap = new Map();
		metrics.forEach((m) => {
			const date = m.timestamp.toISOString().split('T')[0];
			const existing = trendMap.get(date) || { count: 0, totalTime: 0 };
			existing.count++;
			existing.totalTime += m.searchTimeMs;
			trendMap.set(date, existing);
		});
		const searchTrends = Array.from(trendMap.entries())
			.map(([date, stats]) => ({
				date,
				searchCount: stats.count,
				averageResponseTimeMs: Math.round(stats.totalTime / stats.count),
			}))
			.sort((a, b) => a.date.localeCompare(b.date));
		return {
			totalSearches,
			averageResponseTimeMs,
			searchEngineUsagePercent,
			topQueries,
			topFilters,
			performanceMetrics,
			searchTrends,
		};
	}
	async getAllMetrics(days) {
		try {
			const allMetrics = [...this.metricsBuffer];
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - days);
			return allMetrics.filter((m) => m.timestamp >= cutoffDate);
		} catch (error) {
			this.logger.error('Failed to get all metrics', {
				error: error instanceof Error ? error.message : String(error),
				days,
			});
			return [];
		}
	}
	isCacheValid() {
		return Date.now() - this.lastAnalyticsUpdate < this.ANALYTICS_UPDATE_INTERVAL;
	}
	getEmptyAnalytics() {
		return {
			totalSearches: 0,
			averageResponseTimeMs: 0,
			searchEngineUsagePercent: 0,
			topQueries: [],
			topFilters: [],
			performanceMetrics: {
				fastQueries: 0,
				moderateQueries: 0,
				slowQueries: 0,
			},
			searchTrends: [],
		};
	}
};
exports.SearchAnalyticsService = SearchAnalyticsService;
exports.SearchAnalyticsService = SearchAnalyticsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [backend_common_1.Logger, cache_service_1.CacheService]),
	],
	SearchAnalyticsService,
);
//# sourceMappingURL=search-analytics.service.js.map
