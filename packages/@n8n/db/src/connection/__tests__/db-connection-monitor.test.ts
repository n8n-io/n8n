/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import type { DataSource } from '@n8n/typeorm';
import type { ErrorReporter } from 'n8n-core';
import type TimersPromises from 'timers/promises';
import { setTimeout as setTimeoutP } from 'timers/promises';
import type { Mock, MockedFunction } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import { DbConnectionMetrics } from '../db-connection-metrics';
import { DbConnectionMonitor } from '../db-connection-monitor';

// The monitor uses `setTimeout` from `timers/promises` for recovery backoff.
// Mocking it lets us drive the recovery loop deterministically without juggling
// fake timers against async/await microtask ordering.
vi.mock('timers/promises', async () => {
	const actual = await vi.importActual<typeof TimersPromises>('timers/promises');
	return { ...actual, setTimeout: vi.fn() };
});
const mockedSetTimeoutP = setTimeoutP as MockedFunction<typeof setTimeoutP>;

const flushMicrotasks = async () => await new Promise((resolve) => setImmediate(resolve));

describe('DbConnectionMonitor', () => {
	let monitor: DbConnectionMonitor;
	let onConnectedChange: MockedFunction<(connected: boolean) => void>;
	const errorReporter = mock<ErrorReporter>();
	const databaseConfig = mock<DatabaseConfig>({
		pingTimeoutMs: 5_000,
		pingMaxFailuresBeforeRecovery: 3,
		minRecoveryBackoffMs: 1_000,
		maxRecoveryBackoffMs: 30_000,
		connectionAcquisitionTimeoutMs: 30_000,
	});
	const logger = mock<Logger>();
	const dbConnectionMetrics = mock<DbConnectionMetrics>();
	const dataSource = mockDeep<DataSource>({ options: { type: 'postgres' } });

	beforeEach(() => {
		vi.resetAllMocks();
		// Default: never resolves, so query wins the ping timeout race and
		// recovery backoff stays suspended unless a test overrides it.
		mockedSetTimeoutP.mockImplementation(async () => await new Promise(() => {}));
		onConnectedChange = vi.fn();
		monitor = new DbConnectionMonitor(
			dataSource,
			onConnectedChange,
			databaseConfig,
			logger,
			errorReporter,
			dbConnectionMetrics,
		);
	});

	describe('ping', () => {
		// Mock pg pool and client used by the Postgres ping path.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const poolClient: { query: Mock; release: Mock } = { query: vi.fn(), release: vi.fn() };
		const pool = { connect: vi.fn() };

		beforeEach(() => {
			pool.connect.mockResolvedValue(poolClient);
			// eslint-disable-next-line @typescript-eslint/naming-convention
			poolClient.query.mockResolvedValue([{ '1': 1 }]);
			poolClient.release.mockReturnValue(undefined);
			(
				dataSource as unknown as {
					driver: { master: typeof pool; obtainMasterConnection: () => Promise<unknown> };
				}
			).driver = {
				master: pool,
				obtainMasterConnection: vi.fn().mockResolvedValue(undefined),
			};
			// Prevent runaway timer cascades: `pingIntervalSeconds` defaults to 0 in the mock,
			// making every scheduleNextPing() fire immediately and compound across `await` points.
			// Timer scheduling is covered by the dedicated 'should execute ping on schedule' test
			// which uses its own monitor instance with fake timers.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.spyOn(monitor as any, 'scheduleNextPing').mockImplementation(() => {});
		});

		it('should update connection state on successful ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// @ts-expect-error private property
			monitor.connected = false;

			// @ts-expect-error private property
			await monitor.ping();

			expect(poolClient.query).toHaveBeenCalledWith({ text: 'SELECT 1' });
			expect(onConnectedChange).toHaveBeenLastCalledWith(true);
		});

		it('should release the pool client back to the pool on a successful ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;

			// @ts-expect-error private property
			await monitor.ping();

			expect(poolClient.release).toHaveBeenCalledOnce();
			expect(poolClient.release).not.toHaveBeenCalledWith(expect.any(Error));
		});

		it('should mark connection as disconnected when a ping fails', async () => {
			// The owner's connectionState.connected drives the /healthz/readiness endpoint and
			// the 503-fast-fail middleware in abstract-server. If a failed ping doesn't propagate
			// disconnected=false, in-flight requests keep hitting a poisoned pool instead of bailing.
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// @ts-expect-error private property
			monitor.connected = true;
			poolClient.query.mockRejectedValue(new Error('pool dead'));

			// @ts-expect-error private property
			await monitor.ping();

			expect(onConnectedChange).toHaveBeenLastCalledWith(false);
		});

		it('should report errors on failed ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			const error = new Error('Connection error');
			poolClient.query.mockRejectedValue(error);

			// @ts-expect-error private property
			await monitor.ping();

			expect(errorReporter.error).toHaveBeenCalledWith(error);
		});

		it('should not report OperationalError (ping timeout) to error reporter', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// connect never resolves; the connect-timeout race wins and throws an OperationalError.
			pool.connect.mockReturnValue(new Promise(() => {}));
			// Force the timeout side of the race to resolve immediately.
			mockedSetTimeoutP.mockResolvedValueOnce(undefined);

			// @ts-expect-error private property
			await monitor.ping();

			expect(errorReporter.error).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Database connection timed out'),
			);
		});

		test.each(['Cannot use a pool after calling end on the pool', 'Driver not Connected'])(
			'should not report recoverable ping error "%s" to error reporter',
			async (message) => {
				// @ts-expect-error readonly property
				dataSource.isInitialized = true;
				pool.connect.mockRejectedValue(new Error(message));

				// @ts-expect-error private property
				await monitor.ping();

				expect(errorReporter.error).not.toHaveBeenCalled();
				expect(onConnectedChange).toHaveBeenLastCalledWith(false);
			},
		);

		it('should destroy the pool client when the query times out', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			poolClient.query.mockReturnValue(new Promise(() => {})); // query hangs forever
			// First raceTimeout (connect): default impl never resolves → connect wins.
			// Second raceTimeout (query): this override resolves → timeout wins.
			mockedSetTimeoutP
				.mockImplementationOnce(async () => await new Promise(() => {}))
				.mockResolvedValueOnce(undefined);

			// @ts-expect-error private property
			await monitor.ping();

			// Client was destroyed (release with error) rather than returned to the pool.
			expect(poolClient.release).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should destroy the pool client when query creation throws', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			const error = new Error('query failed before returning a promise');
			poolClient.query.mockImplementation(() => {
				throw error;
			});

			// @ts-expect-error private property
			await monitor.ping();

			expect(poolClient.release).toHaveBeenCalledWith(expect.any(Error));
			expect(errorReporter.error).toHaveBeenCalledWith(error);
		});

		it('should destroy a late-arriving pool client when the connect timeout fires first', async () => {
			// When the timeout wins the connect race, a client that arrives afterward must be
			// destroyed to avoid a silent pool leak (the connect promise is not awaited again).
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;

			let resolveConnect!: (client: typeof poolClient) => void;
			pool.connect.mockReturnValue(
				new Promise<typeof poolClient>((resolve) => (resolveConnect = resolve)),
			);
			// Connect timeout fires immediately.
			mockedSetTimeoutP.mockResolvedValueOnce(undefined);

			// @ts-expect-error private property
			await monitor.ping();

			// Now the connect resolves late — the bailed flag must trigger a destroy.
			resolveConnect(poolClient);
			await flushMicrotasks();

			expect(poolClient.release).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should suppress a late connect rejection when the connect timeout fires first', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;

			let rejectConnect!: (error: Error) => void;
			pool.connect.mockReturnValue(
				new Promise<typeof poolClient>((_, reject) => (rejectConnect = reject)),
			);
			mockedSetTimeoutP.mockResolvedValueOnce(undefined);
			const unhandledRejection = vi.fn();
			process.on('unhandledRejection', unhandledRejection);

			try {
				// @ts-expect-error private property
				await monitor.ping();

				rejectConnect(new Error('late connect failure'));
				await flushMicrotasks();

				expect(unhandledRejection).not.toHaveBeenCalled();
			} finally {
				process.off('unhandledRejection', unhandledRejection);
			}
		});

		it('should fall back to dataSource.query when driver.master.connect is unavailable', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			(
				dataSource as unknown as {
					driver: { master: object; obtainMasterConnection: () => Promise<unknown> };
				}
			).driver = {
				master: { on: vi.fn() }, // has .on but no .connect
				obtainMasterConnection: vi.fn().mockResolvedValue(undefined),
			};
			// eslint-disable-next-line @typescript-eslint/naming-convention
			dataSource.query.mockResolvedValue([{ '1': 1 }]);

			// @ts-expect-error private property
			await monitor.ping();

			expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Falling back to dataSource.query for ping'),
			);
		});

		it('should use dataSource.query for non-Postgres datasources', async () => {
			const sqliteDataSource = mockDeep<DataSource>({ options: { type: 'sqlite-pooled' } });
			// @ts-expect-error readonly property
			sqliteDataSource.isInitialized = true;
			// eslint-disable-next-line @typescript-eslint/naming-convention
			sqliteDataSource.query.mockResolvedValue([{ '1': 1 }]);
			const sqliteMonitor = new DbConnectionMonitor(
				sqliteDataSource,
				onConnectedChange,
				databaseConfig,
				logger,
				errorReporter,
				dbConnectionMetrics,
			);

			// @ts-expect-error private method
			await sqliteMonitor.ping();

			expect(sqliteDataSource.query).toHaveBeenCalledWith('SELECT 1');
		});

		it('should schedule next ping after execution', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const scheduleNextPingSpy = vi.spyOn(monitor as any, 'scheduleNextPing');

			// @ts-expect-error private property
			await monitor.ping();

			expect(scheduleNextPingSpy).toHaveBeenCalled();
		});

		it('should not query if data source is not initialized', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = false;

			// @ts-expect-error private property
			await monitor.ping();

			expect(pool.connect).not.toHaveBeenCalled();
		});

		it('should not query if monitor is stopped', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			void monitor.stop();

			// @ts-expect-error private property
			await monitor.ping();

			expect(pool.connect).not.toHaveBeenCalled();
		});

		it('should reset failure counter on successful ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			poolClient.query
				.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
				// eslint-disable-next-line @typescript-eslint/naming-convention
				.mockResolvedValueOnce([{ '1': 1 }])
				.mockRejectedValueOnce(new Error('read ECONNRESET'))
				.mockRejectedValueOnce(
					new Error('Client has encountered a connection error and is not queryable'),
				);
			const recoverSpy = vi
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
			poolClient.query.mockRejectedValue(new Error('pool poisoned'));
			const recoverSpy = vi
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

		it('should not trigger recovery for non-Postgres datasources after consecutive failures', async () => {
			// Sqlite is a local file: a timed-out ping means a saturated pool, not a lost connection.
			const sqliteDataSource = mockDeep<DataSource>({ options: { type: 'sqlite-pooled' } });
			// @ts-expect-error readonly property
			sqliteDataSource.isInitialized = true;
			sqliteDataSource.query.mockRejectedValue(new Error('Database connection timed out'));
			const sqliteMonitor = new DbConnectionMonitor(
				sqliteDataSource,
				onConnectedChange,
				databaseConfig,
				logger,
				errorReporter,
				dbConnectionMetrics,
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.spyOn(sqliteMonitor as any, 'scheduleNextPing').mockImplementation(() => {});
			const recoverSpy = vi
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.spyOn(sqliteMonitor as any, 'recoverDataSource')
				.mockResolvedValue(undefined);

			// @ts-expect-error private property
			await sqliteMonitor.ping();
			// @ts-expect-error private property
			await sqliteMonitor.ping();
			// @ts-expect-error private property
			await sqliteMonitor.ping();
			// @ts-expect-error private property
			await sqliteMonitor.ping();

			expect(recoverSpy).not.toHaveBeenCalled();
			// Readiness state still tracks the failure.
			expect(onConnectedChange).toHaveBeenLastCalledWith(false);
			// The failure log shows a plain count, not a "/threshold" that implies a teardown.
			expect(logger.warn).toHaveBeenLastCalledWith(
				expect.stringContaining('Database ping failed (4):'),
			);
		});

		it('should report and recover from an unexpected throw inside recoverDataSource', async () => {
			// If something throws between `this.recovering = true` and the inner try/catch
			// inside recoverDataSource (e.g. a broken logger), the outer try/catch/finally
			// must (a) surface the error via errorReporter and (b) clear the `recovering`
			// flag so subsequent pings can keep probing.
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			poolClient.query.mockRejectedValue(new Error('pool poisoned'));
			// Throw from the "Attempting to recover" warn — this fires after recovering=true
			// but before the inner try/catch that protects destroy/initialize.
			const loggerError = new Error('logger broke');
			logger.warn.mockImplementation((msg: unknown) => {
				if (typeof msg === 'string' && msg.includes('Attempting to recover')) {
					throw loggerError;
				}
			});

			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();
			// @ts-expect-error private property
			await monitor.ping();
			// Let the fire-and-forget recoverDataSource() promise settle.
			await flushMicrotasks();

			// @ts-expect-error private property
			await monitor.ping();

			// Outer catch surfaces the unexpected throw to Sentry.
			expect(errorReporter.error).toHaveBeenCalledWith(loggerError);
			// Finally clears `recovering` so the 4th ping runs instead of early-returning.
			expect(pool.connect).toHaveBeenCalledTimes(4);
		});

		it('should skip query while recovery is in progress', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// @ts-expect-error private property
			monitor.recovering = true;

			// @ts-expect-error private property
			await monitor.ping();

			expect(pool.connect).not.toHaveBeenCalled();
		});

		it('should execute ping on schedule', () => {
			vi.useFakeTimers();
			try {
				const scheduledMonitor = new DbConnectionMonitor(
					dataSource,
					onConnectedChange,
					mock<DatabaseConfig>({ pingIntervalSeconds: 1, pingTimeoutMs: 5_000 }),
					logger,
					errorReporter,
					dbConnectionMetrics,
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const pingSpy = vi.spyOn(scheduledMonitor as any, 'ping');

				// @ts-expect-error private property
				scheduledMonitor.scheduleNextPing();
				vi.advanceTimersByTime(1000);

				expect(pingSpy).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should not schedule another ping after stop', () => {
			vi.useFakeTimers();
			try {
				const scheduledMonitor = new DbConnectionMonitor(
					dataSource,
					onConnectedChange,
					mock<DatabaseConfig>({ pingIntervalSeconds: 1, pingTimeoutMs: 5_000 }),
					logger,
					errorReporter,
					dbConnectionMetrics,
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const pingSpy = vi.spyOn(scheduledMonitor as any, 'ping');

				void scheduledMonitor.stop();
				// @ts-expect-error private property
				scheduledMonitor.scheduleNextPing();
				vi.advanceTimersByTime(1000);

				expect(pingSpy).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
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
			void monitor.stop();

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(dataSource.destroy).not.toHaveBeenCalled();
			expect(dataSource.initialize).not.toHaveBeenCalled();
		});

		it('should be a no-op for non-Postgres datasources', async () => {
			const sqliteDataSource = mockDeep<DataSource>({ options: { type: 'sqlite-pooled' } });
			// @ts-expect-error readonly property
			sqliteDataSource.isInitialized = true;
			const sqliteMonitor = new DbConnectionMonitor(
				sqliteDataSource,
				onConnectedChange,
				databaseConfig,
				logger,
				errorReporter,
				dbConnectionMetrics,
			);

			// @ts-expect-error private property
			await sqliteMonitor.recoverDataSource();

			expect(sqliteDataSource.destroy).not.toHaveBeenCalled();
			expect(sqliteDataSource.initialize).not.toHaveBeenCalled();
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

		it('should report each failed recovery attempt to errorReporter', async () => {
			// Recovery is a fire-and-forget background loop; without Sentry visibility on each
			// attempt, a database that's hard-down for hours produces silence in the dashboards.
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			const firstError = new Error('still down 1');
			const secondError = new Error('still down 2');
			dataSource.initialize
				.mockRejectedValueOnce(firstError)
				.mockRejectedValueOnce(secondError)
				.mockResolvedValueOnce(dataSource);
			mockedSetTimeoutP.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(errorReporter.error).toHaveBeenCalledWith(firstError);
			expect(errorReporter.error).toHaveBeenCalledWith(secondError);
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

		it('should not drop below the floor when max backoff is misconfigured below min', async () => {
			// A misconfiguration (max < min) must degrade to a constant `min` delay rather
			// than collapsing every retry onto the smaller max value, which would defeat the floor.
			const misconfigured = mock<DatabaseConfig>({
				pingTimeoutMs: 5_000,
				pingMaxFailuresBeforeRecovery: 3,
				minRecoveryBackoffMs: 1_000,
				maxRecoveryBackoffMs: 100,
			});
			const misconfiguredMonitor = new DbConnectionMonitor(
				dataSource,
				onConnectedChange,
				misconfigured,
				logger,
				errorReporter,
				dbConnectionMetrics,
			);

			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize
				.mockRejectedValueOnce(new Error('down'))
				.mockRejectedValueOnce(new Error('down'))
				.mockResolvedValueOnce(dataSource);
			mockedSetTimeoutP.mockResolvedValue(undefined);

			// @ts-expect-error private property
			await misconfiguredMonitor.recoverDataSource();

			// Both backoffs clamp to the floor (1s) instead of the bogus 100ms max.
			expect(mockedSetTimeoutP).toHaveBeenNthCalledWith(
				1,
				1_000,
				undefined,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
			expect(mockedSetTimeoutP).toHaveBeenNthCalledWith(
				2,
				1_000,
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

			void monitor.stop();
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

			void monitor.stop();
			await recoveryPromise;

			// AbortError is swallowed; the loop exits on the next iteration without retrying.
			expect(dataSource.initialize).toHaveBeenCalledTimes(1);
			// @ts-expect-error private property
			expect(monitor.recovering).toBe(false);
		});

		it('should re-attach the pool error listener after a successful recovery', async () => {
			// The driver is swapped on destroy+initialize, so the listener attached at start()
			// is tied to the old driver instance. Without re-attaching, idle-client errors
			// on the new pool become unhandled — which is exactly the crash this PR prevents.
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize.mockResolvedValue(dataSource);
			const on = vi.fn();
			(
				dataSource as unknown as {
					driver: { master: { on: Mock }; obtainMasterConnection: () => Promise<unknown> };
				}
			).driver = {
				master: { on },
				// start()/recoverDataSource() wrap obtainMasterConnection unconditionally.
				obtainMasterConnection: vi.fn().mockResolvedValue(undefined),
			};

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			expect(on).toHaveBeenCalledWith('error', expect.any(Function));
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
			void monitor.stop();

			await recoveryPromise;

			expect(dataSource.destroy).toHaveBeenCalled();
			expect(dataSource.initialize).not.toHaveBeenCalled();
		});

		it('should await the in-flight recovery so teardown is ordered after it', async () => {
			// stop() must not resolve until the fire-and-forget recovery launched by ping()
			// has unwound, so the owner can destroy the DataSource without racing the loop.
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			let resolveDestroy: () => void = () => {};
			let destroyResolved = false;
			dataSource.destroy.mockImplementation(
				async () =>
					await new Promise<void>((resolve) => {
						resolveDestroy = () => {
							destroyResolved = true;
							resolve();
						};
					}),
			);

			// Launch recovery exactly as a failed ping() does (`this.recoveryPromise =
			// this.recoverDataSource()`), without driving the ping loop itself: the mock
			// config has no pingIntervalSeconds, so scheduleNextPing() would spin a
			// runaway ~1ms setTimeout while recovery is parked, which starves the event
			// loop and times the test out under CI load.
			// @ts-expect-error private property
			monitor.recoveryPromise = monitor.recoverDataSource();
			await flushMicrotasks();
			// Recovery is parked inside the slow destroy().
			expect(dataSource.destroy).toHaveBeenCalled();

			const stopPromise = monitor.stop();
			let stopResolved = false;
			void stopPromise.then(() => (stopResolved = true));

			// stop() cannot resolve while recovery is still draining destroy().
			await flushMicrotasks();
			expect(stopResolved).toBe(false);

			resolveDestroy();
			await stopPromise;

			expect(destroyResolved).toBe(true);
			expect(stopResolved).toBe(true);
			// The post-destroy `if (this.stopped) break;` prevents reinitialization.
			expect(dataSource.initialize).not.toHaveBeenCalled();
		});
	});

	describe('recoverDataSource destroy timeout (Postgres)', () => {
		// When a frozen backend leaves `pool.end()` (inside `destroy()`) unable to drain,
		// the monitor must bound `destroy()` and force-close the pool so recovery can rebuild it.
		type StreamShape = { destroy: Mock };
		type ClientShape = { release: Mock; connection: { stream: StreamShape } };
		type PoolShape = {
			_clients: ClientShape[];
			on: Mock;
		};
		type DriverShape = {
			master: PoolShape;
			obtainMasterConnection: Mock;
		};

		const buildPgConfig = (destroyTimeoutMs: number) =>
			mock<DatabaseConfig>({
				pingTimeoutMs: 5_000,
				pingMaxFailuresBeforeRecovery: 3,
				minRecoveryBackoffMs: 1_000,
				maxRecoveryBackoffMs: 30_000,
				connectionAcquisitionTimeoutMs: 30_000,
				postgresdb: mock<DatabaseConfig['postgresdb']>({ destroyTimeoutMs }),
			});

		// One un-drained client whose `destroy()` resolves only once it is both released
		// with an error and has its socket destroyed, mirroring pg-pool where neither step
		// alone unblocks `pool.end()`. So the test goes red if either step is dropped.
		const setupFrozenPool = () => {
			let resolveDestroy!: () => void;
			const destroyPromise = new Promise<void>((resolve) => (resolveDestroy = resolve));
			let releasedWithError = false;
			let socketDestroyed = false;
			const settleIfForceClosed = () => {
				if (releasedWithError && socketDestroyed) resolveDestroy();
			};
			const stream: StreamShape = {
				destroy: vi.fn(() => {
					socketDestroyed = true;
					settleIfForceClosed();
				}),
			};
			const client: ClientShape = {
				release: vi.fn((error?: Error) => {
					if (error) releasedWithError = true;
					settleIfForceClosed();
				}),
				connection: { stream },
			};
			const driver: DriverShape = {
				master: { _clients: [client], on: vi.fn() },
				obtainMasterConnection: vi.fn().mockResolvedValue(undefined),
			};
			(dataSource as unknown as { driver: DriverShape }).driver = driver;
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockReturnValue(destroyPromise);
			dataSource.initialize.mockResolvedValue(dataSource);
			return { stream, client };
		};

		it('should force-close the pool and continue recovery when destroy() exceeds the timeout', async () => {
			const pgMonitor = new DbConnectionMonitor(
				dataSource,
				onConnectedChange,
				buildPgConfig(10_000),
				logger,
				errorReporter,
				dbConnectionMetrics,
			);
			const { stream, client } = setupFrozenPool();
			// @ts-expect-error private property
			pgMonitor.connected = false;
			// Fire the timeout immediately so it wins the race against `destroy()`.
			mockedSetTimeoutP.mockResolvedValueOnce(undefined);

			// @ts-expect-error private property
			await pgMonitor.recoverDataSource();

			// Timeout fired: the client was force-released and its socket destroyed, so the
			// stuck `destroy()` resolved and recovery rebuilt the pool.
			expect(client.release).toHaveBeenCalledTimes(1);
			expect(client.release).toHaveBeenCalledWith(expect.any(Error));
			expect(stream.destroy).toHaveBeenCalledTimes(1);
			expect(dataSource.initialize).toHaveBeenCalledTimes(1);
			expect(onConnectedChange).toHaveBeenLastCalledWith(true);
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('force-clos'));
			// @ts-expect-error private property
			expect(pgMonitor.recovering).toBe(false);
		});

		it('should not force-close the pool when destroy() resolves before the timeout', async () => {
			const pgMonitor = new DbConnectionMonitor(
				dataSource,
				onConnectedChange,
				buildPgConfig(10_000),
				logger,
				errorReporter,
				dbConnectionMetrics,
			);
			const { stream, client } = setupFrozenPool();
			// `destroy()` resolves on its own here, before the never-resolving timeout.
			dataSource.destroy.mockResolvedValue();
			// @ts-expect-error private property
			pgMonitor.connected = false;

			// @ts-expect-error private property
			await pgMonitor.recoverDataSource();

			expect(client.release).not.toHaveBeenCalled();
			expect(stream.destroy).not.toHaveBeenCalled();
			expect(dataSource.initialize).toHaveBeenCalledTimes(1);
			expect(onConnectedChange).toHaveBeenLastCalledWith(true);
		});

		it('should wait indefinitely for destroy() when the destroy timeout is 0', async () => {
			const pgMonitor = new DbConnectionMonitor(
				dataSource,
				onConnectedChange,
				buildPgConfig(0),
				logger,
				errorReporter,
				dbConnectionMetrics,
			);
			const { stream, client } = setupFrozenPool();
			// `destroy()` never resolves and the timeout is disabled, so recovery stays parked.
			dataSource.destroy.mockReturnValue(new Promise<void>(() => {}));

			// @ts-expect-error private property
			const recovery = pgMonitor.recoverDataSource();
			await flushMicrotasks();

			expect(client.release).not.toHaveBeenCalled();
			expect(stream.destroy).not.toHaveBeenCalled();
			expect(dataSource.initialize).not.toHaveBeenCalled();

			// Unwind the parked recovery so the test doesn't leak it.
			void pgMonitor.stop();
			void recovery;
		});
	});

	describe('start', () => {
		it('should warn once when max recovery backoff is configured below min', () => {
			const misconfigured = mock<DatabaseConfig>({
				pingTimeoutMs: 5_000,
				pingMaxFailuresBeforeRecovery: 3,
				minRecoveryBackoffMs: 1_000,
				maxRecoveryBackoffMs: 100,
			});
			const misconfiguredMonitor = new DbConnectionMonitor(
				dataSource,
				onConnectedChange,
				misconfigured,
				logger,
				errorReporter,
				dbConnectionMetrics,
			);

			misconfiguredMonitor.start();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('DB_RECOVERY_BACKOFF_MAX_MS'),
			);
		});

		it('should not warn when backoff bounds are valid', () => {
			monitor.start();

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('DB_RECOVERY_BACKOFF_MAX_MS'),
			);
		});
	});

	describe('attachPoolErrorHandler', () => {
		// DataSource['driver'] is a complex union of every driver TypeORM supports;
		// going through this minimal shape avoids TS2590 ("union type too complex")
		// and matches the unsafe cast the production code uses to reach driver.master.
		type DriverShape = {
			master?: { on?: (event: string, handler: (cause: unknown) => void) => void };
			obtainMasterConnection?: () => Promise<unknown>;
		};
		// start() wraps obtainMasterConnection unconditionally, so every driver needs it present
		// or wrapConnectionAcquisition throws. Default it; tests override what they assert on.
		const setDriver = (driver: DriverShape) => {
			(dataSource as unknown as { driver: DriverShape }).driver = {
				obtainMasterConnection: vi.fn().mockResolvedValue(undefined),
				...driver,
			};
		};

		it('should attach an error listener to the Postgres driver pool', () => {
			const on = vi.fn();
			setDriver({ master: { on } });

			monitor.start();

			expect(on).toHaveBeenCalledWith('error', expect.any(Function));
		});

		it('should mark the connection unhealthy when the pool emits an error', () => {
			let handler: ((cause: unknown) => void) | undefined;
			const on = vi.fn((_event: string, h: (cause: unknown) => void) => {
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

		it('should ignore errors from a pool that recovery has since replaced', () => {
			// Recovery swaps in a fresh driver+pool but the old pool can still emit a late
			// 'error' while tearing down. Acting on it would mark the just-recovered instance
			// unhealthy, so the stale pool's handler must be inert.
			let staleHandler: ((cause: unknown) => void) | undefined;
			const on = vi.fn((_event: string, h: (cause: unknown) => void) => {
				staleHandler = h;
			});
			const stalePool = { on };
			setDriver({ master: stalePool });
			// @ts-expect-error private property
			monitor.connected = true;

			monitor.start();
			expect(staleHandler).toBeDefined();

			// A recovery replaced the driver's master with a brand-new pool.
			(dataSource as unknown as { driver: DriverShape }).driver.master = {
				on: vi.fn(),
			};

			staleHandler?.(new Error('terminating connection due to administrator command'));

			expect(onConnectedChange).not.toHaveBeenCalledWith(false);
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Ignoring Postgres pool error'),
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
				dbConnectionMetrics,
			);

			sqliteMonitor.start();

			// driver.master is never read for non-postgres datasources.
			expect(logger.debug).not.toHaveBeenCalledWith(
				expect.stringContaining('Attached pool error listener'),
			);
		});

		it('should log a warning when driver.master is unavailable on a Postgres datasource', () => {
			setDriver({});

			monitor.start();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('driver.master is unavailable'),
			);
		});
	});

	describe('connection acquisition during recovery', () => {
		// Minimal driver shape, same rationale as the attachPoolErrorHandler block:
		// avoids TS2590 on the full driver union and mirrors the production cast.
		type AcquisitionDriverShape = {
			master?: { on?: (event: string, handler: (cause: unknown) => void) => void };
			obtainMasterConnection?: () => Promise<unknown>;
		};
		const setDriver = (driver: AcquisitionDriverShape) => {
			(dataSource as unknown as { driver: AcquisitionDriverShape }).driver = driver;
		};
		// The private recovery helpers, reached the same way the rest of this file
		// pokes at internals.
		const internals = () =>
			monitor as unknown as {
				acquireConnection: (original: () => Promise<unknown>) => Promise<unknown>;
				markRecoveryPending: () => void;
				clearPendingRecovery: () => void;
				recovering: boolean;
				liveObtainMasterConnection: (() => Promise<unknown>) | undefined;
			};

		const POOL_ENDED = 'Cannot use a pool after calling end on the pool';

		it('should wrap driver.obtainMasterConnection on start for Postgres', async () => {
			const original = vi.fn().mockResolvedValue('connection');
			setDriver({ obtainMasterConnection: original });

			monitor.start();

			const driver = (dataSource as unknown as { driver: AcquisitionDriverShape }).driver;
			// The instance method is now a wrapper, not the original.
			expect(driver.obtainMasterConnection).not.toBe(original);
			await expect(driver.obtainMasterConnection?.()).resolves.toBe('connection');
			expect(original).toHaveBeenCalledTimes(1);
		});

		it('should pass connection acquisition straight through when idle', async () => {
			const original = vi.fn().mockResolvedValue('connection');

			await expect(internals().acquireConnection(original)).resolves.toBe('connection');
			expect(original).toHaveBeenCalledTimes(1);
		});

		it('should hold connection acquisition while a recovery is in progress', async () => {
			const original = vi.fn().mockResolvedValue('connection');
			internals().markRecoveryPending();

			let settled = false;
			const pending = internals()
				.acquireConnection(original)
				.then((result) => {
					settled = true;
					return result;
				});

			await flushMicrotasks();
			// Recovery is pending: acquisition must not have run yet.
			expect(settled).toBe(false);
			expect(original).not.toHaveBeenCalled();

			internals().clearPendingRecovery();

			await expect(pending).resolves.toBe('connection');
			expect(original).toHaveBeenCalledTimes(1);
		});

		it('should retry against the live driver when acquisition loses the destroy race', async () => {
			// A query holding the previous (destroyed) driver hits the ended pool; once
			// recovery has swapped in a new driver, the retry must reach the live pool.
			const stale = vi.fn().mockRejectedValue(new Error(POOL_ENDED));
			const live = vi.fn().mockResolvedValue('fresh-connection');
			internals().recovering = true;
			internals().liveObtainMasterConnection = live;

			await expect(internals().acquireConnection(stale)).resolves.toBe('fresh-connection');
			expect(stale).toHaveBeenCalledTimes(1);
			expect(live).toHaveBeenCalledTimes(1);
		});

		it('should retry stale acquisition errors after recovery has completed', async () => {
			const stale = vi.fn().mockRejectedValue(new Error(POOL_ENDED));
			const live = vi.fn().mockResolvedValue('fresh-connection');
			internals().recovering = false;
			internals().liveObtainMasterConnection = live;

			await expect(internals().acquireConnection(stale)).resolves.toBe('fresh-connection');
			expect(stale).toHaveBeenCalledTimes(1);
			expect(live).toHaveBeenCalledTimes(1);
		});

		it('should retry on a "Driver not Connected" error during recovery', async () => {
			const stale = vi.fn().mockRejectedValue(new Error('Driver not Connected'));
			const live = vi.fn().mockResolvedValue('fresh-connection');
			internals().recovering = true;
			internals().liveObtainMasterConnection = live;

			await expect(internals().acquireConnection(stale)).resolves.toBe('fresh-connection');
			expect(live).toHaveBeenCalledTimes(1);
		});

		it('should surface a pool error when no recovery is in progress', async () => {
			// Outside a recovery window the pool is genuinely unavailable; masking it
			// with a retry would hide a real outage.
			const original = vi.fn().mockRejectedValue(new Error(POOL_ENDED));
			internals().recovering = false;
			internals().liveObtainMasterConnection = original;

			await expect(internals().acquireConnection(original)).rejects.toThrow(POOL_ENDED);
			expect(original).toHaveBeenCalledTimes(1);
		});

		it('should not retry an unrelated error even during recovery', async () => {
			const original = vi.fn().mockRejectedValue(new Error('syntax error at or near "FROM"'));
			const live = vi.fn().mockResolvedValue('fresh-connection');
			internals().recovering = true;
			internals().liveObtainMasterConnection = live;

			await expect(internals().acquireConnection(original)).rejects.toThrow('syntax error');
			expect(live).not.toHaveBeenCalled();
		});

		it('should fail fast with an OperationalError when recovery exceeds the acquisition timeout', async () => {
			// A long outage parks every query here; without the bound they would pile up for
			// the whole outage. Once the timeout elapses the query must reject instead.
			const original = vi.fn().mockResolvedValue('connection');
			internals().markRecoveryPending();
			// Fire the timeout side of the race immediately.
			mockedSetTimeoutP.mockResolvedValueOnce(undefined);

			await expect(internals().acquireConnection(original)).rejects.toThrow(
				'Timed out after 30000ms waiting for database connection recovery',
			);
			// The query never reached the pool.
			expect(original).not.toHaveBeenCalled();
		});

		it('should acquire normally when recovery completes before the acquisition timeout', async () => {
			// The timeout must not fire when recovery wins the race.
			const original = vi.fn().mockResolvedValue('connection');
			internals().markRecoveryPending();

			const pending = internals().acquireConnection(original);
			await flushMicrotasks();
			expect(original).not.toHaveBeenCalled();

			// Recovery completes before the (never-resolving) timeout.
			internals().clearPendingRecovery();

			await expect(pending).resolves.toBe('connection');
			expect(original).toHaveBeenCalledTimes(1);
		});

		it('should wait indefinitely when the acquisition timeout is 0', async () => {
			const noTimeoutMonitor = new DbConnectionMonitor(
				dataSource,
				onConnectedChange,
				mock<DatabaseConfig>({
					pingTimeoutMs: 5_000,
					pingMaxFailuresBeforeRecovery: 3,
					minRecoveryBackoffMs: 1_000,
					maxRecoveryBackoffMs: 30_000,
					connectionAcquisitionTimeoutMs: 0,
				}),
				logger,
				errorReporter,
				dbConnectionMetrics,
			);
			const noTimeoutInternals = noTimeoutMonitor as unknown as {
				acquireConnection: (original: () => Promise<unknown>) => Promise<unknown>;
				markRecoveryPending: () => void;
				clearPendingRecovery: () => void;
			};
			const original = vi.fn().mockResolvedValue('connection');
			noTimeoutInternals.markRecoveryPending();
			// Behavioural proof that no timeout is armed: if `awaitRecovery` ever raced a timeout here it would reject.
			// Asserting on the shared `setTimeoutP` call count is unreliable because other tests leave a fire-and-forget ping loop calling it.
			mockedSetTimeoutP.mockImplementation(async () => {
				await Promise.resolve();
				throw new Error('timeout should not be armed when the acquisition timeout is 0');
			});

			let settled = false;
			const pending = noTimeoutInternals.acquireConnection(original).then((result) => {
				settled = true;
				return result;
			});

			await flushMicrotasks();
			// The acquisition stays parked on recovery rather than failing fast.
			expect(settled).toBe(false);

			noTimeoutInternals.clearPendingRecovery();

			// Resolves cleanly once recovery completes; never rejects on a timeout.
			await expect(pending).resolves.toBe('connection');
		});

		it('should release queued acquisitions when stop() is called', async () => {
			const original = vi.fn().mockResolvedValue('connection');
			internals().markRecoveryPending();

			const pending = internals().acquireConnection(original);
			await flushMicrotasks();
			expect(original).not.toHaveBeenCalled();

			void monitor.stop();

			await expect(pending).resolves.toBe('connection');
		});

		it('should re-wrap obtainMasterConnection after a successful recovery', async () => {
			// initialize() builds a fresh driver instance, so the wrapper installed at
			// start() is gone; without re-wrapping, the new pool would not wait during recovery.
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.destroy.mockResolvedValue();
			dataSource.initialize.mockResolvedValue(dataSource);
			const original = vi.fn().mockResolvedValue('connection');
			setDriver({ obtainMasterConnection: original });

			// @ts-expect-error private property
			await monitor.recoverDataSource();

			const driver = (dataSource as unknown as { driver: AcquisitionDriverShape }).driver;
			expect(driver.obtainMasterConnection).not.toBe(original);
		});
	});

	describe('stop', () => {
		it('should clear the ping timer', () => {
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
			// @ts-expect-error private property
			monitor.pingTimer = setTimeout(() => {}, 1000);

			void monitor.stop();

			expect(clearTimeoutSpy).toHaveBeenCalled();
			// @ts-expect-error private property
			expect(monitor.pingTimer).toBeUndefined();
		});

		it('should latch `stopped` so future scheduling is skipped', () => {
			void monitor.stop();

			// @ts-expect-error private property
			expect(monitor.stopped).toBe(true);
		});
	});

	describe('constructor', () => {
		it('should default `initialConnected` to true so the first observed failure transitions', async () => {
			// DbConnection only creates the monitor after a successful init(), so the assumed
			// initial state is "connected". If the default flipped to false, the first failed
			// ping would be a no-op transition (false → false) and the owner's state machine
			// would stay stuck at the manually-set `true` while reality is `false`.
			const freshOnConnectedChange = vi.fn();
			const freshMonitor = new DbConnectionMonitor(
				dataSource,
				freshOnConnectedChange,
				databaseConfig,
				logger,
				errorReporter,
				dbConnectionMetrics,
			);
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			const poolClient = { query: vi.fn(), release: vi.fn() };
			const pool = { connect: vi.fn().mockResolvedValue(poolClient) };
			poolClient.query.mockRejectedValue(new Error('pool dead'));
			(
				dataSource as unknown as {
					driver: { master: typeof pool; obtainMasterConnection: () => Promise<unknown> };
				}
			).driver = {
				master: pool,
				obtainMasterConnection: vi.fn().mockResolvedValue(undefined),
			};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.spyOn(freshMonitor as any, 'scheduleNextPing').mockImplementation(() => {});

			// @ts-expect-error private property
			await freshMonitor.ping();

			expect(freshOnConnectedChange).toHaveBeenCalledWith(false);
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

	describe('acquire latency', () => {
		const buildPostgresMonitor = (metrics: DbConnectionMetrics, obtain: () => Promise<unknown>) => {
			const driver = { obtainMasterConnection: vi.fn(obtain), master: { on: vi.fn() } };
			const ds = {
				options: { type: 'postgres' },
				isInitialized: true,
				driver,
			} as unknown as DataSource;
			const freshMonitor = new DbConnectionMonitor(
				ds,
				vi.fn(),
				databaseConfig,
				logger,
				errorReporter,
				metrics,
			);
			// start() installs the obtainMasterConnection wrapper on the live driver.
			freshMonitor.start();
			return { driver };
		};

		it('records the acquisition duration through the observer', async () => {
			const metrics = new DbConnectionMetrics();
			const observed: number[] = [];
			metrics.acquireDurationObserver = (seconds) => observed.push(seconds);

			const { driver } = buildPostgresMonitor(metrics, async () => 'connection');

			const result = await driver.obtainMasterConnection();

			expect(result).toBe('connection');
			expect(observed).toHaveLength(1);
			expect(observed[0]).toBeGreaterThanOrEqual(0);
		});

		it('acquires without timing when no observer is registered', async () => {
			const metrics = new DbConnectionMetrics(); // observer left undefined
			const { driver } = buildPostgresMonitor(metrics, async () => 'connection');

			await expect(driver.obtainMasterConnection()).resolves.toBe('connection');
		});
	});
});
