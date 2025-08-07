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
exports.PythonMetricsService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const events_1 = require('events');
const perf_hooks_1 = require('perf_hooks');
let PythonMetricsService = class PythonMetricsService extends events_1.EventEmitter {
	constructor(logger) {
		super();
		this.logger = logger;
		this.executionMetrics = [];
		this.trendData = [];
		this.alerts = [];
		this.resourceHistory = [];
		this.maxMetricsHistory = 10000;
		this.maxTrendDataPoints = 1000;
		this.maxResourceHistoryPoints = 500;
		this.thresholds = {
			highLatency: parseInt(process.env.N8N_PYTHON_METRICS_HIGH_LATENCY_THRESHOLD || '5000', 10),
			memoryLeak: parseInt(process.env.N8N_PYTHON_METRICS_MEMORY_LEAK_THRESHOLD || '500', 10),
			highErrorRate: parseFloat(process.env.N8N_PYTHON_METRICS_HIGH_ERROR_RATE_THRESHOLD || '0.1'),
			cacheMissSpike: parseFloat(process.env.N8N_PYTHON_METRICS_CACHE_MISS_THRESHOLD || '0.3'),
		};
		this.logger.info('Python Metrics Service initialized', {
			thresholds: this.thresholds,
			maxMetricsHistory: this.maxMetricsHistory,
		});
		this.startResourceMonitoring();
		this.startAlertChecking();
		this.startCleanupTimer();
	}
	recordExecution(executionId, startTime, endTime, options) {
		const metrics = {
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
		if (this.executionMetrics.length > this.maxMetricsHistory) {
			this.executionMetrics.splice(0, this.executionMetrics.length - this.maxMetricsHistory);
		}
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
	getPerformanceStats(timeWindow) {
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
		const avgMemoryUsage =
			relevantMetrics.reduce(
				(sum, m) => sum + (m.memoryUsage.after.heapUsed - m.memoryUsage.before.heapUsed),
				0,
			) / totalExecutions;
		const memoryEfficiency = avgMemoryUsage / (avgMemoryUsage + 1000000);
		const timeSpan = timeWindow || Date.now() - relevantMetrics[0].timestamp.getTime();
		const throughput = (totalExecutions / timeSpan) * 1000;
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
	getCurrentResourceMetrics() {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();
		const start = perf_hooks_1.performance.now();
		setImmediate(() => {
			const delay = perf_hooks_1.performance.now() - start;
			this.emit('eventLoopDelay', delay);
		});
		return {
			cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
			memoryUsage: memUsage.heapUsed,
			gcStats: {
				collections: 0,
				duration: 0,
				freed: 0,
			},
			eventLoopDelay: 0,
			activeHandles: process._getActiveHandles().length,
			activeRequests: process._getActiveRequests().length,
		};
	}
	getTrendData(type, points) {
		let data = type ? this.trendData.filter((d) => d.type === type) : this.trendData;
		if (points && data.length > points) {
			const step = Math.floor(data.length / points);
			data = data.filter((_, index) => index % step === 0);
		}
		return data.slice(-1000);
	}
	getActiveAlerts() {
		return this.alerts.filter((alert) => !alert.resolved);
	}
	getAllAlerts() {
		return [...this.alerts];
	}
	resolveAlert(alertId) {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolved = true;
			this.emit('alertResolved', alert);
			return true;
		}
		return false;
	}
	getExecutionMetrics(startTime, endTime, limit) {
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
	getPerformanceComparison(period1Start, period1End, period2Start, period2End) {
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
	generatePerformanceReport() {
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
	recordTrendData(type, value) {
		this.trendData.push({
			timestamp: new Date(),
			value,
			type,
		});
		if (this.trendData.length > this.maxTrendDataPoints) {
			this.trendData.splice(0, this.trendData.length - this.maxTrendDataPoints);
		}
	}
	startResourceMonitoring() {
		this.resourceMonitorTimer = setInterval(() => {
			const metrics = this.getCurrentResourceMetrics();
			this.resourceHistory.push(metrics);
			if (this.resourceHistory.length > this.maxResourceHistoryPoints) {
				this.resourceHistory.splice(0, this.resourceHistory.length - this.maxResourceHistoryPoints);
			}
			this.emit('resourceMetrics', metrics);
		}, 10000);
	}
	startAlertChecking() {
		this.alertCheckTimer = setInterval(() => {
			this.checkForAlerts();
		}, 30000);
	}
	startCleanupTimer() {
		this.cleanupTimer = setInterval(() => {
			this.performCleanup();
		}, 300000);
	}
	checkForAlerts() {
		const recentStats = this.getPerformanceStats(600000);
		if (recentStats.averageExecutionTime > this.thresholds.highLatency) {
			this.createAlert(
				'high_latency',
				'high',
				`Average execution time is ${recentStats.averageExecutionTime.toFixed(0)}ms`,
				recentStats.averageExecutionTime,
				this.thresholds.highLatency,
			);
		}
		if (recentStats.errorRate > this.thresholds.highErrorRate) {
			this.createAlert(
				'high_error_rate',
				'medium',
				`Error rate is ${(recentStats.errorRate * 100).toFixed(1)}%`,
				recentStats.errorRate,
				this.thresholds.highErrorRate,
			);
		}
		if (recentStats.cacheHitRate < 1 - this.thresholds.cacheMissSpike) {
			this.createAlert(
				'cache_miss_spike',
				'medium',
				`Cache hit rate dropped to ${(recentStats.cacheHitRate * 100).toFixed(1)}%`,
				recentStats.cacheHitRate,
				1 - this.thresholds.cacheMissSpike,
			);
		}
		const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
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
	createAlert(type, severity, message, value, threshold) {
		const existingAlert = this.alerts.find(
			(a) => a.type === type && !a.resolved && Date.now() - a.timestamp.getTime() < 300000,
		);
		if (existingAlert) {
			return;
		}
		const alert = {
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
	generateRecommendations(stats) {
		const recommendations = [];
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
	calculateStatsForMetrics(metrics) {
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
	getEmptyStats() {
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
	performCleanup() {
		const cutoffTime = Date.now() - 86400000;
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
	async shutdown() {
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
};
exports.PythonMetricsService = PythonMetricsService;
exports.PythonMetricsService = PythonMetricsService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	PythonMetricsService,
);
//# sourceMappingURL=python-metrics.service.js.map
