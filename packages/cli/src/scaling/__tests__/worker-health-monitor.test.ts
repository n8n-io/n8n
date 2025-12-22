import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import type { RedisClientService } from '@/services/redis-client.service';
import { CircuitBreakerOpen } from '@/utils/circuit-breaker';

import type { ScalingService } from '../scaling.service';
import { WorkerHealthMonitor } from '../worker-health-monitor';

describe('WorkerHealthMonitor', () => {
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	});

	const globalConfig = mock<GlobalConfig>({
		queue: {
			health: {
				active: true,
				checkInterval: 1000, // 1 second for faster tests
			},
		},
	});

	const dbConnection = mock<DbConnection>();
	const redisClientService = mock<RedisClientService>();
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });
	const scalingService = mock<ScalingService>();

	let monitor: WorkerHealthMonitor;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		// Default to healthy state
		dbConnection.connectionState = {
			connected: true,
			migrated: true,
		};
		redisClientService.isConnected.mockReturnValue(true);

		monitor = new WorkerHealthMonitor(
			logger,
			globalConfig,
			dbConnection,
			redisClientService,
			instanceSettings,
		);
	});

	afterEach(() => {
		monitor.stop();
		jest.useRealTimers();
	});

	describe('start', () => {
		it('should not start monitoring if health check is disabled', async () => {
			globalConfig.queue.health.active = false;

			await monitor.start(scalingService);

			expect(logger.debug).toHaveBeenCalledWith('Health monitoring is disabled');
			expect(scalingService.pauseQueue).not.toHaveBeenCalled();
		});

		it('should perform initial health check and start monitoring', async () => {
			globalConfig.queue.health.active = true;

			await monitor.start(scalingService);

			expect(logger.info).toHaveBeenCalledWith('Worker health monitoring started', {
				checkIntervalMs: 1000,
			});
			expect(scalingService.pauseQueue).not.toHaveBeenCalled();
			expect(scalingService.resumeQueue).not.toHaveBeenCalled();
		});

		it('should pause queue immediately if worker is unhealthy on startup', async () => {
			dbConnection.connectionState.connected = false;

			await monitor.start(scalingService);

			// Initial check should pause queue
			expect(scalingService.pauseQueue).toHaveBeenCalledTimes(1);
		});
	});

	describe('health checking', () => {
		beforeEach(async () => {
			await monitor.start(scalingService);
			jest.clearAllMocks();
		});

		it('should keep queue running when worker is healthy', async () => {
			// Advance time to trigger health check
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueue).not.toHaveBeenCalled();
			expect(scalingService.resumeQueue).not.toHaveBeenCalled();
		});

		it('should pause queue when database becomes unhealthy', async () => {
			// Make DB unhealthy
			dbConnection.connectionState.connected = false;

			// Trigger health checks - need 3 failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueue).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Paused queue due to unhealthy worker state', {
				circuitState: 'OPEN',
			});
		});

		it('should pause queue when Redis becomes unhealthy', async () => {
			// Make Redis unhealthy
			redisClientService.isConnected.mockReturnValue(false);

			// Trigger health checks - need 3 failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueue).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Database is not healthy', {
				connected: true,
				migrated: true,
			});
		});

		it('should resume queue when worker becomes healthy again', async () => {
			// Make worker unhealthy
			dbConnection.connectionState.connected = false;

			// Trigger 3 failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueue).toHaveBeenCalledTimes(1);
			jest.clearAllMocks();

			// Make worker healthy again
			dbConnection.connectionState.connected = true;

			// Wait for circuit breaker timeout (10 seconds)
			await jest.advanceTimersByTimeAsync(10_000);

			// Circuit breaker enters HALF_OPEN, need 2 successful checks
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.resumeQueue).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith('Resumed queue after worker became healthy', {
				circuitState: 'CLOSED',
			});
		});

		it('should not flap between paused and resumed on transient failures', async () => {
			// Simulate transient failure - 1 failure, then healthy
			dbConnection.connectionState.connected = false;
			await jest.advanceTimersByTimeAsync(1000);
			jest.clearAllMocks();

			dbConnection.connectionState.connected = true;
			await jest.advanceTimersByTimeAsync(1000);

			// Should not pause queue (only 1 failure, threshold is 3)
			expect(scalingService.pauseQueue).not.toHaveBeenCalled();
			expect(scalingService.resumeQueue).not.toHaveBeenCalled();
		});
	});

	describe('circuit breaker behavior', () => {
		beforeEach(async () => {
			await monitor.start(scalingService);
			jest.clearAllMocks();
		});

		it('should use circuit breaker to prevent flapping', async () => {
			// Make worker unhealthy
			dbConnection.connectionState.connected = false;

			// First failure
			await jest.advanceTimersByTimeAsync(1000);
			expect(monitor.getState().circuitState).toBe('CLOSED');

			// Second failure
			await jest.advanceTimersByTimeAsync(1000);
			expect(monitor.getState().circuitState).toBe('CLOSED');

			// Third failure - circuit should open
			await jest.advanceTimersByTimeAsync(1000);
			expect(monitor.getState().circuitState).toBe('OPEN');
			expect(monitor.getState().isQueuePaused).toBe(true);
		});

		it('should test recovery after circuit breaker timeout', async () => {
			// Open circuit
			dbConnection.connectionState.connected = false;
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(monitor.getState().circuitState).toBe('OPEN');
			jest.clearAllMocks();

			// Make healthy and wait for timeout
			dbConnection.connectionState.connected = true;
			await jest.advanceTimersByTimeAsync(10_000);

			// Should attempt recovery check
			await jest.advanceTimersByTimeAsync(1000);
			expect(monitor.getState().circuitState).toBe('HALF_OPEN');

			// Need 2 successful checks to close circuit
			await jest.advanceTimersByTimeAsync(1000);
			expect(monitor.getState().circuitState).toBe('CLOSED');
			expect(monitor.getState().isQueuePaused).toBe(false);
		});
	});

	describe('stop', () => {
		it('should stop monitoring when stopped', async () => {
			await monitor.start(scalingService);

			monitor.stop();

			// Advance time - no more health checks should occur
			jest.clearAllMocks();
			await jest.advanceTimersByTimeAsync(10_000);

			expect(scalingService.pauseQueue).not.toHaveBeenCalled();
		});
	});

	describe('getState', () => {
		it('should return current monitoring state', async () => {
			await monitor.start(scalingService);

			const state = monitor.getState();

			expect(state).toEqual({
				isQueuePaused: false,
				circuitState: 'CLOSED',
			});
		});
	});

	describe('error handling', () => {
		beforeEach(async () => {
			await monitor.start(scalingService);
			jest.clearAllMocks();
		});

		it('should handle pause queue errors gracefully', async () => {
			scalingService.pauseQueue.mockRejectedValue(new Error('Pause failed'));
			dbConnection.connectionState.connected = false;

			// Trigger failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(logger.error).toHaveBeenCalledWith('Failed to pause queue', {
				error: expect.any(Error),
			});
		});

		it('should handle resume queue errors gracefully', async () => {
			scalingService.resumeQueue.mockRejectedValue(new Error('Resume failed'));

			// Open circuit
			dbConnection.connectionState.connected = false;
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			jest.clearAllMocks();

			// Recover
			dbConnection.connectionState.connected = true;
			await jest.advanceTimersByTimeAsync(10_000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(logger.error).toHaveBeenCalledWith('Failed to resume queue', {
				error: expect.any(Error),
			});
		});
	});
});
