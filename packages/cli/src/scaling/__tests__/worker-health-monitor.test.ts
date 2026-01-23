import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { ScalingService } from '../scaling.service';
import { WorkerHealthMonitor } from '../worker-health-monitor';

import type { RedisClientService } from '@/services/redis-client.service';

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

	const redisClientService = mock<RedisClientService>();
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });
	const scalingService = mock<ScalingService>();

	let monitor: WorkerHealthMonitor;
	let dbConnectionState: { connected: boolean; migrated: boolean };
	let dbConnection: DbConnection;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		// Default to healthy state
		dbConnectionState = {
			connected: true,
			migrated: true,
		};
		dbConnection = mock<DbConnection>();
		Object.defineProperty(dbConnection, 'connectionState', {
			get: () => dbConnectionState,
		});
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

			expect(scalingService.pauseQueueLocal).not.toHaveBeenCalled();
		});

		it('should not start monitoring if check interval is 0', async () => {
			globalConfig.queue.health.active = true;
			globalConfig.queue.health.checkInterval = 0;

			// Need to create a new monitor instance with the updated config
			const monitorWithZeroInterval = new WorkerHealthMonitor(
				logger,
				globalConfig,
				dbConnection,
				redisClientService,
				instanceSettings,
			);

			await monitorWithZeroInterval.start(scalingService);

			expect(scalingService.pauseQueueLocal).not.toHaveBeenCalled();

			// Restore for other tests
			globalConfig.queue.health.checkInterval = 1000;
		});

		it('should perform initial health check and start monitoring', async () => {
			globalConfig.queue.health.active = true;

			await monitor.start(scalingService);

			expect(logger.info).toHaveBeenCalledWith('Worker health monitoring started', {
				checkIntervalMs: 1000,
			});
			expect(scalingService.pauseQueueLocal).not.toHaveBeenCalled();
			expect(scalingService.resumeQueueLocal).not.toHaveBeenCalled();
		});

		it('should pause queue immediately if worker is unhealthy on startup', async () => {
			dbConnectionState.connected = false;

			await monitor.start(scalingService);

			// Initial check should pause queue
			expect(scalingService.pauseQueueLocal).toHaveBeenCalledTimes(1);
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

			expect(scalingService.pauseQueueLocal).not.toHaveBeenCalled();
			expect(scalingService.resumeQueueLocal).not.toHaveBeenCalled();
		});

		it('should pause queue when database becomes unhealthy', async () => {
			// Make DB unhealthy
			dbConnectionState.connected = false;

			// First health check - should pause queue immediately
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueueLocal).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Paused queue due to unhealthy worker state', {
				circuitState: 'CLOSED',
			});
		});

		it('should pause queue when Redis becomes unhealthy', async () => {
			// Make Redis unhealthy
			redisClientService.isConnected.mockReturnValue(false);

			// Trigger health checks - need 3 failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueueLocal).toHaveBeenCalledTimes(1);
		});

		it('should resume queue when worker becomes healthy again', async () => {
			// Make worker unhealthy
			dbConnectionState.connected = false;

			// Trigger 3 failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.pauseQueueLocal).toHaveBeenCalledTimes(1);
			jest.clearAllMocks();

			// Make worker healthy again
			dbConnectionState.connected = true;

			// Wait for circuit breaker timeout (10 seconds)
			await jest.advanceTimersByTimeAsync(10_000);

			// Circuit breaker enters HALF_OPEN, first successful check resumes queue
			await jest.advanceTimersByTimeAsync(1000);

			expect(scalingService.resumeQueueLocal).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith('Resumed queue after worker became healthy', {
				circuitState: 'HALF_OPEN',
			});
		});

		it('should pause and resume on transient failures', async () => {
			// Simulate transient failure - 1 failure, then healthy
			dbConnectionState.connected = false;
			await jest.advanceTimersByTimeAsync(1000);

			// Queue should be paused after first failure
			expect(scalingService.pauseQueueLocal).toHaveBeenCalledTimes(1);
			jest.clearAllMocks();

			dbConnectionState.connected = true;
			await jest.advanceTimersByTimeAsync(1000);

			// Queue should be resumed when healthy again
			expect(scalingService.pauseQueueLocal).not.toHaveBeenCalled();
			expect(scalingService.resumeQueueLocal).toHaveBeenCalledTimes(1);
		});
	});

	describe('circuit breaker behavior', () => {
		beforeEach(async () => {
			await monitor.start(scalingService);
			jest.clearAllMocks();
		});

		it('should use circuit breaker to prevent flapping', async () => {
			// Make worker unhealthy
			dbConnectionState.connected = false;

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
			dbConnectionState.connected = false;
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(monitor.getState().circuitState).toBe('OPEN');
			jest.clearAllMocks();

			// Make healthy and wait for timeout
			dbConnectionState.connected = true;
			// Advance time by exactly the timeout period - the check at t=13s will
			// be the first one after timeout, transitioning to HALF_OPEN and succeeding
			await jest.advanceTimersByTimeAsync(10_000);

			// After the 10s advance, the check at t=13s has run successfully in HALF_OPEN
			// (halfOpenCount = 1), circuit is still HALF_OPEN
			expect(monitor.getState().circuitState).toBe('HALF_OPEN');
			expect(monitor.getState().isQueuePaused).toBe(false);

			// Need one more successful check to close the circuit
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

			expect(scalingService.pauseQueueLocal).not.toHaveBeenCalled();
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
			scalingService.pauseQueueLocal.mockRejectedValue(new Error('Pause failed'));
			dbConnectionState.connected = false;

			// Trigger failures to open circuit
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			expect(logger.error).toHaveBeenCalledWith('Failed to pause queue', {
				error: expect.any(Error),
			});
		});

		it('should handle resume queue errors gracefully', async () => {
			// Reset pauseQueue mock from previous test and make it succeed
			scalingService.pauseQueueLocal.mockResolvedValue(undefined);
			scalingService.resumeQueueLocal.mockRejectedValue(new Error('Resume failed'));

			// Open circuit
			dbConnectionState.connected = false;
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);
			await jest.advanceTimersByTimeAsync(1000);

			jest.clearAllMocks();

			// Recover
			dbConnectionState.connected = true;
			await jest.advanceTimersByTimeAsync(10_000);

			expect(logger.error).toHaveBeenCalledWith('Failed to resume queue', {
				error: expect.any(Error),
			});
		});
	});
});
