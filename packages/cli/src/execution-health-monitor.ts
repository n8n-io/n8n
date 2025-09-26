import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import config from './config';
import { ActiveExecutions } from './active-executions';

/**
 * Health monitoring service to detect and prevent execution issues
 */
@Service()
export class ExecutionHealthMonitor {
	private readonly CHECK_INTERVAL_MS = 60000; // 1 minute
	private readonly MAX_EXECUTION_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
	private monitoringInterval?: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
	) {}

	/**
	 * Start health monitoring
	 */
	start(): void {
		if (this.monitoringInterval) {
			this.logger.warn('Execution health monitor already running');
			return;
		}

		this.logger.info('Starting execution health monitor');
		this.monitoringInterval = setInterval(() => {
			this.performHealthCheck();
		}, this.CHECK_INTERVAL_MS);
	}

	/**
	 * Stop health monitoring
	 */
	stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
			this.logger.info('Execution health monitor stopped');
		}
	}

	/**
	 * Perform comprehensive health check
	 */
	private performHealthCheck(): void {
		try {
			this.checkExecutionHealth();
			this.checkMemoryUsage();
			this.checkConcurrencyLimits();
		} catch (error) {
			this.logger.error('Error during health check', {
				error: (error as Error).message,
			});
		}
	}

	/**
	 * Check for long-running or stuck executions
	 */
	private checkExecutionHealth(): void {
		const activeExecutionsList = this.activeExecutions.getActiveExecutions();
		const now = Date.now();
		let longRunningCount = 0;

		for (const execution of activeExecutionsList) {
			const age = now - execution.startedAt.getTime();

			if (age > this.MAX_EXECUTION_AGE_MS && execution.status === 'running') {
				longRunningCount++;
				this.logger.warn('Long-running execution detected', {
					executionId: execution.id,
					workflowId: execution.workflowId,
					ageHours: Math.round(age / (60 * 60 * 1000)),
					status: execution.status,
				});
			}
		}

		if (longRunningCount > 0) {
			this.logger.warn(`Found ${longRunningCount} long-running executions`);
		}
	}

	/**
	 * Check memory usage and warn if high
	 */
	private checkMemoryUsage(): void {
		const memUsage = process.memoryUsage();
		const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
		const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
		const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

		if (memoryUsagePercent > 85) {
			this.logger.warn('High memory usage detected', {
				heapUsedMB,
				heapTotalMB,
				usagePercent: Math.round(memoryUsagePercent),
				activeExecutions: this.activeExecutions.getActiveExecutions().length,
			});
		}
	}

	/**
	 * Check if concurrency limits are being approached
	 */
	private checkConcurrencyLimits(): void {
		const maxConcurrency = config.getEnv('executions.concurrency.productionLimit');
		if (maxConcurrency <= 0) return;

		const activeCount = this.activeExecutions.getActiveExecutions().length;
		const usagePercent = (activeCount / maxConcurrency) * 100;

		if (usagePercent > 80) {
			this.logger.warn('High concurrency usage detected', {
				activeExecutions: activeCount,
				maxConcurrency,
				usagePercent: Math.round(usagePercent),
			});
		}
	}
}
