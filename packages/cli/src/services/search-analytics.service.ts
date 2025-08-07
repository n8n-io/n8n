import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';

export interface SearchQueryMetrics {
	query: string;
	userId: string;
	searchTimeMs: number;
	resultCount: number;
	searchMethod: 'search_engine' | 'database';
	searchEngine?: string;
	filters: Record<string, any>;
	timestamp: Date;
	userAgent?: string;
	sessionId?: string;
}

export interface SearchAnalytics {
	totalSearches: number;
	averageResponseTimeMs: number;
	searchEngineUsagePercent: number;
	topQueries: Array<{
		query: string;
		count: number;
		averageResponseTimeMs: number;
	}>;
	topFilters: Array<{
		filter: string;
		count: number;
	}>;
	performanceMetrics: {
		fastQueries: number; // < 100ms
		moderateQueries: number; // 100ms - 1s
		slowQueries: number; // > 1s
	};
	searchTrends: Array<{
		date: string;
		searchCount: number;
		averageResponseTimeMs: number;
	}>;
}

export interface SearchOptimizationSuggestion {
	type: 'index_missing' | 'query_slow' | 'filter_popular' | 'search_pattern';
	severity: 'low' | 'medium' | 'high';
	title: string;
	description: string;
	action: string;
	impact: string;
	data?: any;
}

@Service()
export class SearchAnalyticsService {
	private readonly ANALYTICS_CACHE_KEY = 'search_analytics';
	private readonly METRICS_RETENTION_DAYS = 30;
	private readonly ANALYTICS_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

	private metricsBuffer: SearchQueryMetrics[] = [];
	private lastAnalyticsUpdate = 0;

	constructor(
		private readonly logger: Logger,
		private readonly cacheService: CacheService,
	) {
		// Periodically flush metrics buffer
		setInterval(() => {
			this.flushMetricsBuffer();
		}, 60 * 1000); // Flush every minute
	}

	/**
	 * Record a search query for analytics
	 */
	async recordSearchQuery(metrics: SearchQueryMetrics): Promise<void> {
		try {
			// Add to buffer for batch processing
			this.metricsBuffer.push({
				...metrics,
				timestamp: new Date(),
			});

			// Log search patterns for debugging
			this.logger.debug('Search query recorded', {
				query: metrics.query,
				userId: metrics.userId,
				searchTimeMs: metrics.searchTimeMs,
				resultCount: metrics.resultCount,
				searchMethod: metrics.searchMethod,
			});

			// Flush buffer if it's getting large
			if (this.metricsBuffer.length >= 100) {
				await this.flushMetricsBuffer();
			}
		} catch (error) {
			this.logger.error('Failed to record search query', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Get search analytics for the specified time period
	 */
	async getSearchAnalytics(days: number = 7): Promise<SearchAnalytics> {
		try {
			// Check cache first
			const cacheKey = `${this.ANALYTICS_CACHE_KEY}_${days}d`;
			const cachedAnalytics = await this.cacheService.get<SearchAnalytics>(cacheKey);

			if (cachedAnalytics && this.isCacheValid()) {
				return cachedAnalytics;
			}

			// Generate analytics
			const analytics = await this.generateAnalytics(days);

			// Cache results for 5 minutes
			await this.cacheService.set(cacheKey, analytics, 5 * 60 * 1000);

			return analytics;
		} catch (error) {
			this.logger.error('Failed to get search analytics', {
				error: error instanceof Error ? error.message : String(error),
				days,
			});

			// Return empty analytics on error
			return this.getEmptyAnalytics();
		}
	}

	/**
	 * Get search optimization suggestions
	 */
	async getOptimizationSuggestions(): Promise<SearchOptimizationSuggestion[]> {
		try {
			const analytics = await this.getSearchAnalytics(7);
			const suggestions: SearchOptimizationSuggestion[] = [];

			// Analyze slow queries
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

			// Analyze search engine usage
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

			// Analyze popular filters
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

			// Analyze search patterns
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

	/**
	 * Get popular search queries
	 */
	async getPopularQueries(limit: number = 10): Promise<
		Array<{
			query: string;
			count: number;
			averageResponseTimeMs: number;
			lastSearched: Date;
		}>
	> {
		try {
			const allMetrics = await this.getAllMetrics(7);
			const queryStats = new Map<
				string,
				{
					count: number;
					totalResponseTime: number;
					lastSearched: Date;
				}
			>();

			// Aggregate query statistics
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

			// Convert to array and sort by count
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

	/**
	 * Get search performance metrics for monitoring
	 */
	async getPerformanceMetrics(): Promise<{
		averageResponseTime: number;
		p95ResponseTime: number;
		p99ResponseTime: number;
		searchEngineHealthScore: number;
		totalSearchesToday: number;
		errorRate: number;
	}> {
		try {
			const metrics = await this.getAllMetrics(1); // Last 24 hours

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

			// Calculate response time percentiles
			const responseTimes = metrics.map((m) => m.searchTimeMs).sort((a, b) => a - b);
			const averageResponseTime =
				responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
			const p95Index = Math.floor(responseTimes.length * 0.95);
			const p99Index = Math.floor(responseTimes.length * 0.99);

			// Calculate search engine health score
			const searchEngineQueries = metrics.filter((m) => m.searchMethod === 'search_engine').length;
			const searchEngineHealthScore = Math.round((searchEngineQueries / metrics.length) * 100);

			return {
				averageResponseTime: Math.round(averageResponseTime),
				p95ResponseTime: responseTimes[p95Index] || 0,
				p99ResponseTime: responseTimes[p99Index] || 0,
				searchEngineHealthScore,
				totalSearchesToday: metrics.length,
				errorRate: 0, // Would need error tracking to calculate this
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

	/**
	 * Clear analytics data older than retention period
	 */
	async cleanupOldAnalytics(): Promise<void> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - this.METRICS_RETENTION_DAYS);

			// This would typically involve database cleanup
			// For now, we'll just log the operation
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

	// Private methods

	private async flushMetricsBuffer(): Promise<void> {
		if (this.metricsBuffer.length === 0) {
			return;
		}

		try {
			// In a real implementation, this would persist to database
			// For now, we'll store in cache with expiration
			const cacheKey = `search_metrics_${Date.now()}`;
			await this.cacheService.set(cacheKey, this.metricsBuffer, 24 * 60 * 60 * 1000); // 24 hours

			this.logger.debug('Flushed search metrics to cache', {
				metricsCount: this.metricsBuffer.length,
			});

			// Clear buffer
			this.metricsBuffer = [];
		} catch (error) {
			this.logger.error('Failed to flush metrics buffer', {
				error: error instanceof Error ? error.message : String(error),
				metricsCount: this.metricsBuffer.length,
			});
		}
	}

	private async generateAnalytics(days: number): Promise<SearchAnalytics> {
		const metrics = await this.getAllMetrics(days);

		if (metrics.length === 0) {
			return this.getEmptyAnalytics();
		}

		// Calculate basic statistics
		const totalSearches = metrics.length;
		const averageResponseTimeMs = Math.round(
			metrics.reduce((sum, m) => sum + m.searchTimeMs, 0) / totalSearches,
		);
		const searchEngineQueries = metrics.filter((m) => m.searchMethod === 'search_engine').length;
		const searchEngineUsagePercent = Math.round((searchEngineQueries / totalSearches) * 100);

		// Analyze top queries
		const queryCounts = new Map<string, { count: number; totalTime: number }>();
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

		// Analyze top filters
		const filterCounts = new Map<string, number>();
		metrics.forEach((m) => {
			Object.keys(m.filters || {}).forEach((filter) => {
				filterCounts.set(filter, (filterCounts.get(filter) || 0) + 1);
			});
		});

		const topFilters = Array.from(filterCounts.entries())
			.map(([filter, count]) => ({ filter, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Performance metrics
		const performanceMetrics = {
			fastQueries: metrics.filter((m) => m.searchTimeMs < 100).length,
			moderateQueries: metrics.filter((m) => m.searchTimeMs >= 100 && m.searchTimeMs <= 1000)
				.length,
			slowQueries: metrics.filter((m) => m.searchTimeMs > 1000).length,
		};

		// Search trends (daily aggregation)
		const trendMap = new Map<string, { count: number; totalTime: number }>();
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

	private async getAllMetrics(days: number): Promise<SearchQueryMetrics[]> {
		try {
			// In a real implementation, this would query from database
			// For now, we'll return the current buffer and cached metrics
			const allMetrics: SearchQueryMetrics[] = [...this.metricsBuffer];

			// This is a simplified version - in production, you'd query from persistent storage
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

	private isCacheValid(): boolean {
		return Date.now() - this.lastAnalyticsUpdate < this.ANALYTICS_UPDATE_INTERVAL;
	}

	private getEmptyAnalytics(): SearchAnalytics {
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
}
