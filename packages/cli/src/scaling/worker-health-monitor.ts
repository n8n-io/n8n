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
 * - `QUEUE_HEALTH_CHECK_INTERVAL`: How often to check health (default: 10 seconds)
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

		// Default to 10 seconds if not configured
		this.checkIntervalMs = this.globalConfig.queue.health.checkInterval ?? 10_000;

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
			this.logger.debug('Health monitoring is disabled');
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
				const isHealthy = await this.checkHealth();
				if (!isHealthy) {
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

	/**
	 * Check if worker is healthy by verifying connectivity to critical dependencies.
	 *
	 * @returns true if worker is healthy, false otherwise
	 */
	private async checkHealth(): Promise<boolean> {
		const { connectionState } = this.dbConnection;

		// Check database connectivity
		const isDbHealthy = connectionState.connected && connectionState.migrated;
		if (!isDbHealthy) {
			this.logger.warn('Database is not healthy', {
				connected: connectionState.connected,
				migrated: connectionState.migrated,
			});
			return false;
		}

		// Check Redis connectivity
		const isRedisHealthy = this.redisClientService.isConnected();
		if (!isRedisHealthy) {
			this.logger.warn('Redis is not healthy');
			return false;
		}

		this.logger.debug('Worker health check passed', {
			dbConnected: connectionState.connected,
			dbMigrated: connectionState.migrated,
			redisConnected: isRedisHealthy,
		});

		return true;
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
