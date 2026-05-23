/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import type { DataSource } from '@n8n/typeorm';
import { mock, mockDeep } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type TimersPromises from 'timers/promises';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { DbConnectionMonitor } from '../db-connection-monitor';

// The monitor uses `setTimeout` from `timers/promises` for recovery backoff.
// Mocking it lets us drive the recovery loop deterministically without juggling
// jest fake timers against async/await microtask ordering.
jest.mock('timers/promises', () => {
	const actual = jest.requireActual<typeof TimersPromises>('timers/promises');
	return { ...actual, setTimeout: jest.fn() };
});
const mockedSetTimeoutP = setTimeoutP as jest.MockedFunction<typeof setTimeoutP>;

const flushMicrotasks = async () => await new Promise((resolve) => setImmediate(resolve));

describe('DbConnectionMonitor', () => {
	let monitor: DbConnectionMonitor;
	let onConnectedChange: jest.MockedFunction<(connected: boolean) => void>;
	const errorReporter = mock<ErrorReporter>();
	const databaseConfig = mock<DatabaseConfig>({ pingTimeoutMs: 5_000 });
	const logger = mock<Logger>();
	const dataSource = mockDeep<DataSource>({ options: { type: 'postgres' } });

	beforeEach(() => {
		jest.resetAllMocks();
		// Default: never resolves, so query wins the ping timeout race and
		// recovery backoff stays suspended unless a test overrides it.
		mockedSetTimeoutP.mockImplementation(async () => await new Promise(() => {}));
		onConnectedChange = jest.fn();
		monitor = new DbConnectionMonitor(
			dataSource,
			onConnectedChange,
			databaseConfig,
			logger,
			errorReporter,
		);
	});

	describe('ping', () => {
		it('should update connection state on successful ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// eslint-disable-next-line @typescript-eslint/naming-convention
			dataSource.query.mockResolvedValue([{ '1': 1 }]);
			// @ts-expect-error private property
			monitor.connected = false;

			// @ts-expect-error private property
			await monitor.ping();

			expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
			expect(onConnectedChange).toHaveBeenLastCalledWith(true);
		});

		it('should report errors on failed ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			const error = new Error('Connection error');
			dataSource.query.mockRejectedValue(error);

			// @ts-expect-error private property
			await monitor.ping();

			expect(errorReporter.error).toHaveBeenCalledWith(error);
		});

		it('should not report OperationalError (ping timeout) to error reporter', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// Query never resolves; the timeout race wins and throws an OperationalError.
			dataSource.query.mockReturnValue(new Promise(() => {}));
			// Force the timeout side of the Promise.race to resolve immediately.
			mockedSetTimeoutP.mockResolvedValueOnce(undefined);

			// @ts-expect-error private property
			await monitor.ping();

			expect(errorReporter.error).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Database connection timed out'),
			);
		});

		it('should schedule next ping after execution', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// eslint-disable-next-line @typescript-eslint/naming-convention
			dataSource.query.mockResolvedValue([{ '1': 1 }]);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const scheduleNextPingSpy = jest.spyOn(monitor as any, 'scheduleNextPing');

			// @ts-expect-error private property
			await monitor.ping();

			expect(scheduleNextPingSpy).toHaveBeenCalled();
		});

		it('should not query if data source is not initialized', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = false;

			// @ts-expect-error private property
			await monitor.ping();

			expect(dataSource.query).not.toHaveBeenCalled();
		});

		it('should not query if monitor is stopped', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			monitor.stop();

			// @ts-expect-error private property
			await monitor.ping();

			expect(dataSource.query).not.toHaveBeenCalled();
		});

		it('should reset failure counter on successful ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.query
				.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
				// eslint-disable-next-line @typescript-eslint/naming-convention
				.mockResolvedValueOnce([{ '1': 1 }])
				.mockRejectedValueOnce(new Error('read ECONNRESET'))
				.mockRejectedValueOnce(
					new Error('Client has encountered a connection error and is not queryable'),
				);
			const recoverSpy = jest
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.spyOn(monitor as any, 'recoverDataSource')
				.mockResolvedValue(undefined);

			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();

			expect(recoverSpy).not.toHaveBeenCalled();
		});

		it('should trigger recovery after consecutive failures', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.query.mockRejectedValue(new Error('pool poisoned'));
			const recoverSpy = jest
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.spyOn(monitor as any, 'recoverDataSource')
				.mockResolvedValue(undefined);

			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();

			expect(recoverSpy).toHaveBeenCalledTimes(1);
		});

		it('should report unhandled errors from recoverDataSource via errorReporter', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.query.mockRejectedValue(new Error('pool poisoned'));
			const unhandled = new Error('synchronous failure outside try/catch');
			jest
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.spyOn(monitor as any, 'recoverDataSource')
				.mockRejectedValue(unhandled);

			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();

			// Let the .catch() handler attached to recoverDataSource() flush.
			await new Promise((resolve) => setImmediate(resolve));

			expect(errorReporter.error).toHaveBeenCalledWith(unhandled);
		});

		it('should skip query while recovery is in progress', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// @ts-expect-error private property
			monitor.recovering = true;

			// @ts-expect-error private property
			await monitor.ping();

			expect(dataSource.query).not.toHaveBeenCalled();
		});

		it('should execute ping on schedule', () => {
			jest.useFakeTimers();
			try {
				const scheduledMonitor = new DbConnectionMonitor(
					dataSource,
					onConnectedChange,
					mock<DatabaseConfig>({ pingIntervalSeconds: 1, pingTimeoutMs: 5_000 }),
					logger,
					errorReporter,
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const pingSpy = jest.spyOn(scheduledMonitor as any, 'ping');

				// @ts-expect-error private property
				scheduledMonitor.scheduleNextPing();
				jest.advanceTimersByTime(1000);

				expect(pingSpy).toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});

		it('should not schedule another ping after stop', () => {
			jest.useFakeTimers();
			try {
				const scheduledMonitor = new DbConnectionMonitor(
					dataSource,
					onConnectedChange,
					mock<DatabaseConfig>({ pingIntervalSeconds: 1, pingTimeoutMs: 5_000 }),
					logger,
					errorReporter,
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const pingSpy = jest.spyOn(scheduledMonitor as any, 'ping');

				scheduledMonitor.stop();
				// @ts-expect-error private property
				scheduledMonitor.scheduleNextPing();
				jest.advanceTimersByTime(1000);

				expect(pingSpy).not.toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe('recoverDataSource', () => {
		it('should destroy and reinitialize the DataSource', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize.mockResolvedValue(dataSource);
			// @ts-expect-error private property
			monitor.connected = false;

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(dataSource.destroy).toHaveBeenCalled();
			expect(dataSource.initialize).toHaveBeenCalled();
			expect(onConnectedChange).toHaveBeenLastCalledWith(true);
			// @ts-expect-error private property
			expect(monitor.consecutiveFailures).toBe(0);
			// @ts-expect-error private property
			expect(monitor.recovering).toBe(false);
		});

		it('should be a no-op when already recovering', async () => {
			// @ts-expect-error private property
			monitor.recovering = true;

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(dataSource.destroy).not.toHaveBeenCalled();
			expect(dataSource.initialize).not.toHaveBeenCalled();
		});

		it('should be a no-op when monitor is stopped', async () => {
			monitor.stop();

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(dataSource.destroy).not.toHaveBeenCalled();
			expect(dataSource.initialize).not.toHaveBeenCalled();
		});

		it('should back off between failed recovery attempts and eventually succeed', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize
				.mockRejectedValueOnce(new Error('still down'))
				.mockRejectedValueOnce(new Error('still down'))
				.mockResolvedValueOnce(dataSource);
			// Three iterations: two backoffs (1s, 2s) then success.
			mockedSetTimeoutP.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
			// Start from a known-disconnected state so the success transition fires.
			// @ts-expect-error private property
			monitor.connected = false;

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(dataSource.initialize).toHaveBeenCalledTimes(3);
			expect(onConnectedChange).toHaveBeenLastCalledWith(true);
			// First backoff = 1000ms (1s * 2^0); second = 2000ms (1s * 2^1).
			expect(mockedSetTimeoutP).toHaveBeenNthCalledWith(
				1,
				1_000,
				undefined,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
			expect(mockedSetTimeoutP).toHaveBeenNthCalledWith(
				2,
				2_000,
				undefined,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
			// @ts-expect-error private property
			expect(monitor.recovering).toBe(false);
		});

		it('should cap exponential backoff at the configured maximum', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			// Fail enough times to push past the 30s ceiling.
			dataSource.initialize
				.mockRejectedValueOnce(new Error('down'))
				.mockRejectedValueOnce(new Error('down'))
				.mockRejectedValueOnce(new Error('down'))
				.mockRejectedValueOnce(new Error('down'))
				.mockRejectedValueOnce(new Error('down'))
				.mockRejectedValueOnce(new Error('down'))
				.mockResolvedValueOnce(dataSource);
			mockedSetTimeoutP.mockResolvedValue(undefined);

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			// Backoffs: 1s, 2s, 4s, 8s, 16s, then capped at 30s.
			expect(mockedSetTimeoutP).toHaveBeenNthCalledWith(
				5,
				16_000,
				undefined,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
			expect(mockedSetTimeoutP).toHaveBeenNthCalledWith(
				6,
				30_000,
				undefined,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
		});

		it('should exit the recovery loop when stop() is called during backoff', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize.mockRejectedValue(new Error('db is gone forever'));

			// Suspend on the first backoff so we can call stop() in between.
			let resolveBackoff!: () => void;
			mockedSetTimeoutP.mockImplementationOnce(
				async () => await new Promise<void>((resolve) => (resolveBackoff = resolve)),
			);

			// @ts-expect-error private property
			const recoveryPromise = monitor.recoverDataSource();

			// Let attempt 1 run: destroy → initialize (rejects) → enter backoff.
			await flushMicrotasks();
			expect(dataSource.initialize).toHaveBeenCalledTimes(1);

			monitor.stop();
			resolveBackoff();
			await recoveryPromise;

			expect(dataSource.initialize).toHaveBeenCalledTimes(1);
			// @ts-expect-error private property
			expect(monitor.recovering).toBe(false);
		});

		it('should pass an AbortSignal to the backoff sleep so stop() interrupts it', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize.mockRejectedValueOnce(new Error('still down'));
			// Honor the abort signal the way `timers/promises` does in production:
			// reject with an AbortError as soon as the signal aborts.
			mockedSetTimeoutP.mockImplementationOnce(
				async (_ms, _value, options) =>
					await new Promise<undefined>((_resolve, reject) => {
						const signal = options?.signal;
						signal?.addEventListener('abort', () => {
							const abortError = new Error('The operation was aborted');
							abortError.name = 'AbortError';
							reject(abortError);
						});
					}),
			);

			// @ts-expect-error private property
			const recoveryPromise = monitor.recoverDataSource();

			await flushMicrotasks();
			expect(mockedSetTimeoutP).toHaveBeenCalledWith(
				expect.any(Number),
				undefined,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);

			monitor.stop();
			await recoveryPromise;

			// AbortError is swallowed; the loop exits on the next iteration without retrying.
			expect(dataSource.initialize).toHaveBeenCalledTimes(1);
			// @ts-expect-error private property
			expect(monitor.recovering).toBe(false);
		});

		it('should not reinitialize if stop() runs while destroy() is in flight', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// destroy resolves on next tick — gives us a window to call stop().
			dataSource.destroy.mockImplementation(
				async () => await new Promise((resolve) => setImmediate(resolve)),
			);

			// @ts-expect-error private property
			const recoveryPromise = monitor.recoverDataSource();

			// Stop while destroy is still pending.
			monitor.stop();

			await recoveryPromise;

			expect(dataSource.destroy).toHaveBeenCalled();
			expect(dataSource.initialize).not.toHaveBeenCalled();
		});
	});

	describe('attachPoolErrorHandler', () => {
		// DataSource['driver'] is a complex union of every driver TypeORM supports;
		// going through this minimal shape avoids TS2590 ("union type too complex")
		// and matches the unsafe cast the production code uses to reach driver.master.
		type DriverShape = {
			master?: { on?: (event: string, handler: (cause: unknown) => void) => void };
		};
		const setDriver = (driver: DriverShape) => {
			(dataSource as unknown as { driver: DriverShape }).driver = driver;
		};

		it('should attach an error listener to the Postgres driver pool', () => {
			const on = jest.fn();
			setDriver({ master: { on } });

			monitor.start();

			expect(on).toHaveBeenCalledWith('error', expect.any(Function));
		});

		it('should mark the connection unhealthy when the pool emits an error', () => {
			let handler: ((cause: unknown) => void) | undefined;
			const on = jest.fn((_event: string, h: (cause: unknown) => void) => {
				handler = h;
			});
			setDriver({ master: { on } });
			// @ts-expect-error private property
			monitor.connected = true;

			monitor.start();
			expect(handler).toBeDefined();

			handler?.(new Error('terminating connection due to administrator command'));

			expect(onConnectedChange).toHaveBeenLastCalledWith(false);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Postgres pool client error'),
			);
		});

		it('should skip attaching when the driver is not Postgres', () => {
			const sqliteDataSource = mockDeep<DataSource>({ options: { type: 'sqlite-pooled' } });
			const sqliteMonitor = new DbConnectionMonitor(
				sqliteDataSource,
				onConnectedChange,
				databaseConfig,
				logger,
				errorReporter,
			);

			sqliteMonitor.start();

			// driver.master is never read for non-postgres datasources.
			expect(logger.debug).not.toHaveBeenCalledWith(
				expect.stringContaining('Attached pool error listener'),
			);
		});

		it('should log a debug message when driver.master is unavailable on a Postgres datasource', () => {
			setDriver({});

			monitor.start();

			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('driver.master is unavailable'),
			);
		});
	});

	describe('stop', () => {
		it('should clear the ping timer', () => {
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
			// @ts-expect-error private property
			monitor.pingTimer = setTimeout(() => {}, 1000);

			monitor.stop();

			expect(clearTimeoutSpy).toHaveBeenCalled();
			// @ts-expect-error private property
			expect(monitor.pingTimer).toBeUndefined();
		});

		it('should latch `stopped` so future scheduling is skipped', () => {
			monitor.stop();

			// @ts-expect-error private property
			expect(monitor.stopped).toBe(true);
		});
	});

	describe('setConnected', () => {
		it('should only fire onConnectedChange on a transition', () => {
			// @ts-expect-error private property
			monitor.connected = true;

			// @ts-expect-error private property
			monitor.setConnected(true);
			expect(onConnectedChange).not.toHaveBeenCalled();

			// @ts-expect-error private property
			monitor.setConnected(false);
			expect(onConnectedChange).toHaveBeenCalledWith(false);

			// @ts-expect-error private property
			monitor.setConnected(false);
			expect(onConnectedChange).toHaveBeenCalledTimes(1);
		});
	});
});
