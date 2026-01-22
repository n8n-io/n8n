import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { strict as assert } from 'node:assert';

import { RedisClientService } from '@/services/redis-client.service';
import { CircuitBreaker, CircuitBreakerOpen } from '@/utils/circuit-breaker';

import type { ScalingService } from './scaling.service';
import { checkWorkerReadiness } from './worker-readiness';

/**
 * Monitors worker health and automatically pauses/resumes queue processing
 * based on connectivity to critical dependencies (database and Redis).
 *
 * This prevents unhealthy workers from pulling jobs they cannot successfully process.
 *
 * ## How it works
 *
 * 1. Periodically checks worker health (DB and Redis connectivity)
 * 2. If unhealthy: pauses queue to stop pulling new jobs
 * 3. If healthy again: resumes queue processing
 * 4. Uses circuit breaker pattern to prevent flapping
 *
 * ## Configuration
 *
 * - `QUEUE_HEALTH_CHECK_INTERVAL`: How often to check health (0 to disable, default: 0)
 * - `QUEUE_HEALTH_CHECK_ACTIVE`: Must be enabled for health monitoring
 *
 * @example
 * ```typescript
 * // Automatically started when worker is initialized
 * const monitor = Container.get(WorkerHealthMonitor);
 * await monitor.start(scalingService);
 * ```
 */
@Service()
export class WorkerHealthMonitor {
	private healthCheckInterval: NodeJS.Timeout | undefined;

	private isQueuePaused = false;

	private scalingService: ScalingService | undefined;

	private circuitBreaker: CircuitBreaker;

	private readonly checkIntervalMs: number;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly dbConnection: DbConnection,
		private readonly redisClientService: RedisClientService,
		private readonly instanceSettings: InstanceSettings,
	) {
		assert(this.instanceSettings.instanceType === 'worker');

		this.logger = this.logger.scoped('scaling');

		this.checkIntervalMs = this.globalConfig.queue.health.checkInterval;

		// Circuit breaker prevents flapping between healthy/unhealthy states
		// - Opens after 3 failures within 60 seconds
		// - Tests recovery after 10 seconds
		// - Requires 2 successful checks to close
		this.circuitBreaker = new CircuitBreaker({
			timeout: 10_000, // Wait 10s before testing recovery
			maxFailures: 3, // Pause queue after 3 consecutive health check failures
			halfOpenRequests: 2, // Need 2 successful checks to resume
			failureWindow: 60_000, // Count failures within 60s window
		});
	}

	/**
	 * Start monitoring worker health.
	 * Must be called after ScalingService.setupQueue() and setupWorker().
	 */
	async start(scalingService: ScalingService) {
		if (!this.globalConfig.queue.health.active) {
			this.logger.debug('Health monitoring is disabled (health check endpoints not active)');
			return;
		}

		if (this.checkIntervalMs === 0) {
			this.logger.debug('Health monitoring is disabled (check interval is 0)');
			return;
		}

		this.scalingService = scalingService;

		// Perform initial health check immediately
		await this.checkHealthAndUpdateQueue();

		// Schedule periodic health checks
		this.healthCheckInterval = setInterval(async () => {
			await this.checkHealthAndUpdateQueue();
		}, this.checkIntervalMs);

		this.logger.info('Worker health monitoring started', {
			checkIntervalMs: this.checkIntervalMs,
		});
	}

	/**
	 * Check worker health and pause/resume queue accordingly.
	 */
	private async checkHealthAndUpdateQueue() {
		try {
			// Use circuit breaker to check health
			// If circuit is open, checkHealth throws CircuitBreakerOpen
			await this.circuitBreaker.execute(async () => {
				if (!this.checkHealth()) {
					throw new Error('Worker is unhealthy');
				}
			});

			// Health check passed - ensure queue is running
			if (this.isQueuePaused) {
				await this.resumeQueue();
			}
		} catch (error) {
			if (error instanceof CircuitBreakerOpen) {
				// Circuit breaker is open - worker is considered unhealthy
				this.logger.warn('Health check circuit breaker is open, worker is unhealthy');
			} else {
				this.logger.error('Health check failed', { error });
			}

			// Pause queue if not already paused
			if (!this.isQueuePaused) {
				await this.pauseQueue();
			}
		}
	}

	private checkHealth(): boolean {
		return checkWorkerReadiness(this.dbConnection, this.redisClientService);
	}

	/**
	 * Pause queue processing to prevent pulling new jobs.
	 */
	private async pauseQueue() {
		if (!this.scalingService) {
			throw new Error('ScalingService not initialized');
		}

		try {
			await this.scalingService.pauseQueue();
			this.isQueuePaused = true;
			this.logger.warn('Paused queue due to unhealthy worker state', {
				circuitState: this.circuitBreaker.currentState(),
			});
		} catch (error) {
			this.logger.error('Failed to pause queue', { error });
		}
	}

	/**
	 * Resume queue processing after worker becomes healthy again.
	 */
	private async resumeQueue() {
		if (!this.scalingService) {
			throw new Error('ScalingService not initialized');
		}

		try {
			await this.scalingService.resumeQueue();
			this.isQueuePaused = false;
			this.logger.info('Resumed queue after worker became healthy', {
				circuitState: this.circuitBreaker.currentState(),
			});
		} catch (error) {
			this.logger.error('Failed to resume queue', { error });
		}
	}

	/**
	 * Stop health monitoring and cleanup.
	 */
	@OnShutdown()
	stop() {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = undefined;
			this.logger.debug('Worker health monitoring stopped');
		}
	}

	/**
	 * Get current health monitoring state (for testing/debugging).
	 */
	getState() {
		return {
			isQueuePaused: this.isQueuePaused,
			circuitState: this.circuitBreaker.currentState(),
		};
	}
}
