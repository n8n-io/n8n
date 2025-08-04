import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface ExecutionMetrics {
	executionId: string;
	startTime: number;
	endTime: number;
	duration: number;
	codeLength: number;
	memoryUsage: {
		before: NodeJS.MemoryUsage;
		after: NodeJS.MemoryUsage;
		peak: number;
	};
	cacheHit: boolean;
	workerPoolUsed: boolean;
	workerId?: string;
	packageCount: number;
	error?: string;
	timestamp: Date;
}

interface PerformanceStats {
	totalExecutions: number;
	averageExecutionTime: number;
	medianExecutionTime: number;
	p95ExecutionTime: number;
	p99ExecutionTime: number;
	successRate: number;
	errorRate: number;
	cacheHitRate: number;
	poolUtilizationRate: number;
	memoryEfficiency: number;
	throughput: number; // executions per second
}

interface ResourceMetrics {
	cpuUsage: number;
	memoryUsage: number;
	gcStats: {
		collections: number;
		duration: number;
		freed: number;
	};
	eventLoopDelay: number;
	activeHandles: number;
	activeRequests: number;
}

interface TrendData {
	timestamp: Date;
	value: number;
	type: 'execution_time' | 'memory_usage' | 'cache_hit_rate' | 'error_rate';
}

interface PerformanceAlert {
	id: string;
	type: 'high_latency' | 'memory_leak' | 'high_error_rate' | 'cache_miss_spike';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	value: number;
	threshold: number;
	timestamp: Date;
	resolved: boolean;
}

@Service()
export class PythonMetricsService extends EventEmitter {
	private readonly executionMetrics: ExecutionMetrics[] = [];
	private readonly trendData: TrendData[] = [];
	private readonly alerts: PerformanceAlert[] = [];
	private readonly resourceHistory: ResourceMetrics[] = [];

	private readonly maxMetricsHistory = 10000;
	private readonly maxTrendDataPoints = 1000;
	private readonly maxResourceHistoryPoints = 500;

	private resourceMonitorTimer?: NodeJS.Timeout;
	private alertCheckTimer?: NodeJS.Timeout;
	private cleanupTimer?: NodeJS.Timeout;

	// Performance thresholds
	private readonly thresholds = {
		highLatency: parseInt(process.env.N8N_PYTHON_METRICS_HIGH_LATENCY_THRESHOLD || '5000', 10), // 5 seconds
		memoryLeak: parseInt(process.env.N8N_PYTHON_METRICS_MEMORY_LEAK_THRESHOLD || '500', 10), // 500MB
		highErrorRate: parseFloat(process.env.N8N_PYTHON_METRICS_HIGH_ERROR_RATE_THRESHOLD || '0.1'), // 10%
		cacheMissSpike: parseFloat(process.env.N8N_PYTHON_METRICS_CACHE_MISS_THRESHOLD || '0.3'), // 30%
	};

	constructor(private readonly logger: Logger) {
		super();

		this.logger.info('Python Metrics Service initialized', {
			thresholds: this.thresholds,
			maxMetricsHistory: this.maxMetricsHistory,
		});

		this.startResourceMonitoring();
		this.startAlertChecking();
		this.startCleanupTimer();
	}

	/**
	 * Record a Python execution
	 */
	recordExecution(
		executionId: string,
		startTime: number,
		endTime: number,
		options: {
			codeLength: number;
			memoryBefore: NodeJS.MemoryUsage;
			memoryAfter: NodeJS.MemoryUsage;
			peakMemory: number;
			cacheHit: boolean;
			workerPoolUsed: boolean;
			workerId?: string;
			packageCount: number;
			error?: string;
		},
	): void {
		const metrics: ExecutionMetrics = {
			executionId,
			startTime,
			endTime,
			duration: endTime - startTime,
			codeLength: options.codeLength,
			memoryUsage: {
				before: options.memoryBefore,
				after: options.memoryAfter,
				peak: options.peakMemory,
			},
			cacheHit: options.cacheHit,
			workerPoolUsed: options.workerPoolUsed,
			workerId: options.workerId,
			packageCount: options.packageCount,
			error: options.error,
			timestamp: new Date(),
		};

		this.executionMetrics.push(metrics);

		// Trim history if needed
		if (this.executionMetrics.length > this.maxMetricsHistory) {
			this.executionMetrics.splice(0, this.executionMetrics.length - this.maxMetricsHistory);
		}

		// Record trend data
		this.recordTrendData('execution_time', metrics.duration);
		this.recordTrendData('memory_usage', options.peakMemory);
		this.recordTrendData('cache_hit_rate', options.cacheHit ? 1 : 0);
		this.recordTrendData('error_rate', options.error ? 1 : 0);

		this.emit('executionRecorded', metrics);

		this.logger.debug('Python execution metrics recorded', {
			executionId,
			duration: metrics.duration,
			cacheHit: options.cacheHit,
			workerPoolUsed: options.workerPoolUsed,
		});
	}

	/**
	 * Get performance statistics
	 */
	getPerformanceStats(timeWindow?: number): PerformanceStats {
		const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
		const relevantMetrics = this.executionMetrics.filter((m) => m.timestamp.getTime() > cutoffTime);

		if (relevantMetrics.length === 0) {
			return this.getEmptyStats();
		}

		const durations = relevantMetrics.map((m) => m.duration).sort((a, b) => a - b);
		const successful = relevantMetrics.filter((m) => !m.error);
		const cacheHits = relevantMetrics.filter((m) => m.cacheHit);
		const poolUsed = relevantMetrics.filter((m) => m.workerPoolUsed);

		const totalExecutions = relevantMetrics.length;
		const averageExecutionTime = durations.reduce((sum, d) => sum + d, 0) / totalExecutions;
		const medianExecutionTime = durations[Math.floor(durations.length / 2)];
		const p95ExecutionTime = durations[Math.floor(durations.length * 0.95)];
		const p99ExecutionTime = durations[Math.floor(durations.length * 0.99)];

		const successRate = successful.length / totalExecutions;
		const errorRate = 1 - successRate;
		const cacheHitRate = cacheHits.length / totalExecutions;
		const poolUtilizationRate = poolUsed.length / totalExecutions;

		// Calculate memory efficiency (lower is better)
		const avgMemoryUsage =
			relevantMetrics.reduce(
				(sum, m) => sum + (m.memoryUsage.after.heapUsed - m.memoryUsage.before.heapUsed),
				0,
			) / totalExecutions;
		const memoryEfficiency = avgMemoryUsage / (avgMemoryUsage + 1000000); // Normalize

		// Calculate throughput (executions per second)
		const timeSpan = timeWindow || Date.now() - relevantMetrics[0].timestamp.getTime();
		const throughput = (totalExecutions / timeSpan) * 1000; // Convert to per second

		return {
			totalExecutions,
			averageExecutionTime,
			medianExecutionTime,
			p95ExecutionTime,
			p99ExecutionTime,
			successRate,
			errorRate,
			cacheHitRate,
			poolUtilizationRate,
			memoryEfficiency,
			throughput,
		};
	}

	/**
	 * Get resource metrics
	 */
	getCurrentResourceMetrics(): ResourceMetrics {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		// Get event loop delay (approximate)
		const start = performance.now();
		setImmediate(() => {
			const delay = performance.now() - start;
			this.emit('eventLoopDelay', delay);
		});

		return {
			cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
			memoryUsage: memUsage.heapUsed,
			gcStats: {
				collections: 0, // Would need to hook into GC events
				duration: 0,
				freed: 0,
			},
			eventLoopDelay: 0, // Updated asynchronously
			activeHandles: (process as any)._getActiveHandles().length,
			activeRequests: (process as any)._getActiveRequests().length,
		};
	}

	/**
	 * Get trend data for visualization
	 */
	getTrendData(
		type?: 'execution_time' | 'memory_usage' | 'cache_hit_rate' | 'error_rate',
		points?: number,
	): TrendData[] {
		let data = type ? this.trendData.filter((d) => d.type === type) : this.trendData;

		if (points && data.length > points) {
			// Sample data points evenly
			const step = Math.floor(data.length / points);
			data = data.filter((_, index) => index % step === 0);
		}

		return data.slice(-1000); // Return last 1000 points
	}

	/**
	 * Get active alerts
	 */
	getActiveAlerts(): PerformanceAlert[] {
		return this.alerts.filter((alert) => !alert.resolved);
	}

	/**
	 * Get all alerts (including resolved)
	 */
	getAllAlerts(): PerformanceAlert[] {
		return [...this.alerts];
	}

	/**
	 * Resolve an alert
	 */
	resolveAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolved = true;
			this.emit('alertResolved', alert);
			return true;
		}
		return false;
	}

	/**
	 * Get execution metrics for specific time range
	 */
	getExecutionMetrics(startTime?: Date, endTime?: Date, limit?: number): ExecutionMetrics[] {
		let metrics = this.executionMetrics;

		if (startTime) {
			metrics = metrics.filter((m) => m.timestamp >= startTime);
		}

		if (endTime) {
			metrics = metrics.filter((m) => m.timestamp <= endTime);
		}

		if (limit) {
			metrics = metrics.slice(-limit);
		}

		return metrics;
	}

	/**
	 * Get performance comparison between time periods
	 */
	getPerformanceComparison(
		period1Start: Date,
		period1End: Date,
		period2Start: Date,
		period2End: Date,
	): {
		period1: PerformanceStats;
		period2: PerformanceStats;
		improvement: {
			executionTime: number;
			errorRate: number;
			cacheHitRate: number;
			throughput: number;
		};
	} {
		const period1Metrics = this.executionMetrics.filter(
			(m) => m.timestamp >= period1Start && m.timestamp <= period1End,
		);
		const period2Metrics = this.executionMetrics.filter(
			(m) => m.timestamp >= period2Start && m.timestamp <= period2End,
		);

		const period1Stats = this.calculateStatsForMetrics(period1Metrics);
		const period2Stats = this.calculateStatsForMetrics(period2Metrics);

		const improvement = {
			executionTime:
				((period1Stats.averageExecutionTime - period2Stats.averageExecutionTime) /
					period1Stats.averageExecutionTime) *
				100,
			errorRate: ((period1Stats.errorRate - period2Stats.errorRate) / period1Stats.errorRate) * 100,
			cacheHitRate:
				((period2Stats.cacheHitRate - period1Stats.cacheHitRate) / period1Stats.cacheHitRate) * 100,
			throughput:
				((period2Stats.throughput - period1Stats.throughput) / period1Stats.throughput) * 100,
		};

		return {
			period1: period1Stats,
			period2: period2Stats,
			improvement,
		};
	}

	/**
	 * Generate performance report
	 */
	generatePerformanceReport(): {
		summary: PerformanceStats;
		trends: { type: string; data: TrendData[] }[];
		alerts: PerformanceAlert[];
		recommendations: string[];
	} {
		const summary = this.getPerformanceStats();
		const trends = [
			{ type: 'Execution Time', data: this.getTrendData('execution_time', 100) },
			{ type: 'Memory Usage', data: this.getTrendData('memory_usage', 100) },
			{ type: 'Cache Hit Rate', data: this.getTrendData('cache_hit_rate', 100) },
			{ type: 'Error Rate', data: this.getTrendData('error_rate', 100) },
		];

		const activeAlerts = this.getActiveAlerts();
		const recommendations = this.generateRecommendations(summary);

		return {
			summary,
			trends,
			alerts: activeAlerts,
			recommendations,
		};
	}

	/**
	 * Record trend data point
	 */
	private recordTrendData(type: TrendData['type'], value: number): void {
		this.trendData.push({
			timestamp: new Date(),
			value,
			type,
		});

		// Trim trend data if needed
		if (this.trendData.length > this.maxTrendDataPoints) {
			this.trendData.splice(0, this.trendData.length - this.maxTrendDataPoints);
		}
	}

	/**
	 * Start resource monitoring
	 */
	private startResourceMonitoring(): void {
		this.resourceMonitorTimer = setInterval(() => {
			const metrics = this.getCurrentResourceMetrics();
			this.resourceHistory.push(metrics);

			// Trim resource history
			if (this.resourceHistory.length > this.maxResourceHistoryPoints) {
				this.resourceHistory.splice(0, this.resourceHistory.length - this.maxResourceHistoryPoints);
			}

			this.emit('resourceMetrics', metrics);
		}, 10000); // Every 10 seconds
	}

	/**
	 * Start alert checking
	 */
	private startAlertChecking(): void {
		this.alertCheckTimer = setInterval(() => {
			this.checkForAlerts();
		}, 30000); // Every 30 seconds
	}

	/**
	 * Start cleanup timer
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.performCleanup();
		}, 300000); // Every 5 minutes
	}

	/**
	 * Check for performance alerts
	 */
	private checkForAlerts(): void {
		const recentStats = this.getPerformanceStats(600000); // Last 10 minutes

		// Check for high latency
		if (recentStats.averageExecutionTime > this.thresholds.highLatency) {
			this.createAlert(
				'high_latency',
				'high',
				`Average execution time is ${recentStats.averageExecutionTime.toFixed(0)}ms`,
				recentStats.averageExecutionTime,
				this.thresholds.highLatency,
			);
		}

		// Check for high error rate
		if (recentStats.errorRate > this.thresholds.highErrorRate) {
			this.createAlert(
				'high_error_rate',
				'medium',
				`Error rate is ${(recentStats.errorRate * 100).toFixed(1)}%`,
				recentStats.errorRate,
				this.thresholds.highErrorRate,
			);
		}

		// Check for cache miss spike
		if (recentStats.cacheHitRate < 1 - this.thresholds.cacheMissSpike) {
			this.createAlert(
				'cache_miss_spike',
				'medium',
				`Cache hit rate dropped to ${(recentStats.cacheHitRate * 100).toFixed(1)}%`,
				recentStats.cacheHitRate,
				1 - this.thresholds.cacheMissSpike,
			);
		}

		// Check for memory issues
		const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
		if (currentMemory > this.thresholds.memoryLeak) {
			this.createAlert(
				'memory_leak',
				'critical',
				`Memory usage is ${currentMemory.toFixed(0)}MB`,
				currentMemory,
				this.thresholds.memoryLeak,
			);
		}
	}

	/**
	 * Create a performance alert
	 */
	private createAlert(
		type: PerformanceAlert['type'],
		severity: PerformanceAlert['severity'],
		message: string,
		value: number,
		threshold: number,
	): void {
		// Check if similar alert already exists
		const existingAlert = this.alerts.find(
			(a) => a.type === type && !a.resolved && Date.now() - a.timestamp.getTime() < 300000, // 5 minutes
		);

		if (existingAlert) {
			return; // Don't create duplicate alerts
		}

		const alert: PerformanceAlert = {
			id: `${type}_${Date.now()}`,
			type,
			severity,
			message,
			value,
			threshold,
			timestamp: new Date(),
			resolved: false,
		};

		this.alerts.push(alert);
		this.emit('alert', alert);

		this.logger.warn('Performance alert created', {
			type,
			severity,
			message,
			value,
			threshold,
		});
	}

	/**
	 * Generate performance recommendations
	 */
	private generateRecommendations(stats: PerformanceStats): string[] {
		const recommendations: string[] = [];

		if (stats.averageExecutionTime > 2000) {
			recommendations.push('Consider enabling worker pool for parallel execution');
		}

		if (stats.cacheHitRate < 0.5) {
			recommendations.push('Improve code caching by identifying frequently executed patterns');
		}

		if (stats.errorRate > 0.05) {
			recommendations.push('Review error logs to identify and fix common Python execution issues');
		}

		if (stats.poolUtilizationRate < 0.3) {
			recommendations.push('Consider reducing worker pool size to optimize resource usage');
		}

		if (stats.memoryEfficiency > 0.8) {
			recommendations.push('Optimize memory usage by implementing garbage collection strategies');
		}

		if (recommendations.length === 0) {
			recommendations.push('Python execution performance is optimal');
		}

		return recommendations;
	}

	/**
	 * Calculate stats for specific metrics array
	 */
	private calculateStatsForMetrics(metrics: ExecutionMetrics[]): PerformanceStats {
		if (metrics.length === 0) {
			return this.getEmptyStats();
		}

		const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
		const successful = metrics.filter((m) => !m.error);
		const cacheHits = metrics.filter((m) => m.cacheHit);
		const poolUsed = metrics.filter((m) => m.workerPoolUsed);

		const totalExecutions = metrics.length;
		const averageExecutionTime = durations.reduce((sum, d) => sum + d, 0) / totalExecutions;
		const medianExecutionTime = durations[Math.floor(durations.length / 2)];
		const p95ExecutionTime = durations[Math.floor(durations.length * 0.95)];
		const p99ExecutionTime = durations[Math.floor(durations.length * 0.99)];

		const successRate = successful.length / totalExecutions;
		const errorRate = 1 - successRate;
		const cacheHitRate = cacheHits.length / totalExecutions;
		const poolUtilizationRate = poolUsed.length / totalExecutions;

		const avgMemoryUsage =
			metrics.reduce(
				(sum, m) => sum + (m.memoryUsage.after.heapUsed - m.memoryUsage.before.heapUsed),
				0,
			) / totalExecutions;
		const memoryEfficiency = avgMemoryUsage / (avgMemoryUsage + 1000000);

		const timeSpan =
			metrics[metrics.length - 1].timestamp.getTime() - metrics[0].timestamp.getTime();
		const throughput = timeSpan > 0 ? (totalExecutions / timeSpan) * 1000 : 0;

		return {
			totalExecutions,
			averageExecutionTime,
			medianExecutionTime,
			p95ExecutionTime,
			p99ExecutionTime,
			successRate,
			errorRate,
			cacheHitRate,
			poolUtilizationRate,
			memoryEfficiency,
			throughput,
		};
	}

	/**
	 * Get empty stats structure
	 */
	private getEmptyStats(): PerformanceStats {
		return {
			totalExecutions: 0,
			averageExecutionTime: 0,
			medianExecutionTime: 0,
			p95ExecutionTime: 0,
			p99ExecutionTime: 0,
			successRate: 0,
			errorRate: 0,
			cacheHitRate: 0,
			poolUtilizationRate: 0,
			memoryEfficiency: 0,
			throughput: 0,
		};
	}

	/**
	 * Perform periodic cleanup
	 */
	private performCleanup(): void {
		// Clean up old resolved alerts
		const cutoffTime = Date.now() - 86400000; // 24 hours
		const alertsBefore = this.alerts.length;

		for (let i = this.alerts.length - 1; i >= 0; i--) {
			const alert = this.alerts[i];
			if (alert.resolved && alert.timestamp.getTime() < cutoffTime) {
				this.alerts.splice(i, 1);
			}
		}

		if (this.alerts.length < alertsBefore) {
			this.logger.debug('Cleaned up old resolved alerts', {
				removed: alertsBefore - this.alerts.length,
				remaining: this.alerts.length,
			});
		}
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		this.logger.info('Shutting down Python Metrics Service');

		if (this.resourceMonitorTimer) {
			clearInterval(this.resourceMonitorTimer);
		}

		if (this.alertCheckTimer) {
			clearInterval(this.alertCheckTimer);
		}

		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		this.logger.info('Python Metrics Service shutdown complete');
	}
}
