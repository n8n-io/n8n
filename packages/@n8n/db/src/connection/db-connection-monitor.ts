import { inTest, type Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { DataSource } from '@n8n/typeorm';
import type { PostgresDriver } from '@n8n/typeorm/driver/postgres/PostgresDriver';
import type { ErrorReporter } from 'n8n-core';
import { ensureError, OperationalError } from 'n8n-workflow';
import { setTimeout as setTimeoutP } from 'timers/promises';

import type { DbConnectionMetrics } from './db-connection-metrics';

/** The chokepoint every TypeORM query funnels through to acquire a master connection. */
type ObtainMasterConnection = PostgresDriver['obtainMasterConnection'];

/**
 * Error messages a connection acquisition throws when it reaches a pool that recovery
 * has already torn down. These are matched by text because neither pg-pool nor TypeORM
 * surfaces a stable error code for them; the strings are pinned by the integration test
 * against a real driver, so a driver upgrade that renamed them would fail loudly there.
 */
const POOL_TORN_DOWN_MESSAGE = 'Cannot use a pool after calling end on the pool';
const DRIVER_NOT_CONNECTED_MESSAGE = 'Driver not Connected';

/**
 * Minimal view of the pg-pool internals we reach into when force-closing a pool
 * whose graceful teardown has timed out. `_clients` is private, so we type only
 * the shape we touch and stay defensive about it at the call site.
 *
 * Each entry is a pooled client. `release(err)` is the per-client release function
 * pg-pool installs while the client is checked out; passing an error makes the pool
 * discard the client instead of returning it, which is what lets a stuck `end()`
 * (waiting on an un-drained checked-out client) finish. `connection.stream` is the
 * underlying socket, hard-closed as a backstop for clients with no `release`
 * (e.g. ones still mid-connect) and to free the socket promptly.
 */
interface PgPoolClient {
	release?: (error?: Error) => void;
	connection?: { stream?: { destroy?: () => void } };
}
interface PgPoolInternals {
	_clients?: PgPoolClient[];
}

/**
 * Watches a DataSource and recovers it when the connection goes bad.
 * - Pings on `databaseConfig.pingIntervalSeconds`, races against `databaseConfig.pingTimeoutMs`.
 * - After `databaseConfig.pingMaxFailuresBeforeRecovery` consecutive failures, destroys
 *   and reinitializes the DataSource with exponential backoff
 *   (`databaseConfig.minRecoveryBackoffMs` .. `databaseConfig.maxRecoveryBackoffMs`).
 * - Attaches an error listener to the pg pool (Postgres only) so terminated
 *   idle clients are caught instead of crashing the process.
 * - Suspends connection acquisition during recovery so in-flight queries wait
 *   for the new pool instead of hitting the torn-down one.
 *   Recovery destroys and recreates the shared pool.
 *   Without this, any query acquiring a connection in that window throws
 *   `Cannot use a pool after calling end on the pool` / `Driver not Connected`.
 *   The wait is applied at `driver.obtainMasterConnection`
 *   (the single chokepoint every TypeORM query funnels through).
 *
 * Notifies the owner of connection transitions via `onConnectedChange`.
 * The owner is responsible for supplying the initial state via `initialConnected`,
 * because `onConnectedChange` only fires on state *transitions*.
 */
export class DbConnectionMonitor {
	private pingTimer: NodeJS.Timeout | undefined;
	private consecutiveFailures = 0;
	private recovering = false;
	private connected: boolean;
	private stopped = false; // Latched on stop()
	private stopAbortController = new AbortController();

	/**
	 * Pending while a recovery is in progress.
	 * Queued connection acquisitions await it.
	 * `undefined` when no recovery is running, so queries pass straight through with no added latency.
	 */
	private pendingRecovery: Promise<void> | undefined;
	private resolvePendingRecovery: (() => void) | undefined;

	/**
	 * Handle on the in-flight recovery loop launched fire-and-forget from `ping()`.
	 * `stop()` awaits it after aborting so the owner's teardown is ordered
	 * after the loop's `destroy()`/`initialize()` rather than racing it.
	 * recoverDataSource` owns its own try/catch and never rejects.
	 */
	private recoveryPromise: Promise<void> | undefined;

	/**
	 * The current driver's *unwrapped* `obtainMasterConnection`, refreshed on every (re)initialize.
	 * `initialize()` builds a brand-new driver instance,
	 * so a query still holding the previous driver retries against this reference.
	 */
	private liveObtainMasterConnection: ObtainMasterConnection | undefined;

	constructor(
		private readonly dataSource: DataSource,
		private readonly onConnectedChange: (connected: boolean) => void,
		private readonly databaseConfig: DatabaseConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly dbConnectionMetrics: DbConnectionMetrics,
		initialConnected = true,
	) {
		this.connected = initialConnected;
	}

	start() {
		this.attachPoolErrorHandler();
		this.wrapConnectionAcquisition();
		if (this.databaseConfig.maxRecoveryBackoffMs < this.databaseConfig.minRecoveryBackoffMs) {
			this.logger.warn(
				`DB_RECOVERY_BACKOFF_MAX_MS (${this.databaseConfig.maxRecoveryBackoffMs}) is below DB_RECOVERY_BACKOFF_MIN_MS (${this.databaseConfig.minRecoveryBackoffMs}); recovery will retry at a constant ${this.databaseConfig.minRecoveryBackoffMs}ms instead of backing off. Set max >= min.`,
			);
		}
		this.logger.debug(
			`Database connection monitor started (pingIntervalSeconds=${this.databaseConfig.pingIntervalSeconds}, pingTimeoutMs=${this.databaseConfig.pingTimeoutMs}, recoveryThreshold=${this.databaseConfig.pingMaxFailuresBeforeRecovery})`,
		);
		if (!inTest) {
			this.scheduleNextPing();
		}
	}

	async stop() {
		this.stopped = true;
		this.stopRecovery();
		this.stopAbortController.abort();
		if (this.pingTimer) {
			clearTimeout(this.pingTimer);
			this.pingTimer = undefined;
		}
		// Await any in-flight recovery so it has fully unwound (its `!this.stopped` guard exits the loop) before the caller tears down the DataSource.
		await this.recoveryPromise;
		this.logger.debug('Database connection monitor stopped');
	}

	private scheduleNextPing() {
		if (!this.stopped) {
			this.pingTimer = setTimeout(
				async () => await this.ping(),
				this.databaseConfig.pingIntervalSeconds * Time.seconds.toMilliseconds,
			);
		}
	}

	private async ping() {
		if (this.stopped || !this.dataSource.isInitialized) {
			return;
		}

		if (this.recovering) {
			this.scheduleNextPing();
			return;
		}

		const abortController = new AbortController();

		try {
			await Promise.race([
				this.dataSource.query('SELECT 1'),
				setTimeoutP(this.databaseConfig.pingTimeoutMs, undefined, {
					signal: abortController.signal,
				}).then(() => {
					throw new OperationalError('Database connection timed out');
				}),
			]);

			if (!this.connected) {
				this.logger.info('Database connection recovered');
			}

			this.setConnected(true);
			this.consecutiveFailures = 0;
			return;
		} catch (error) {
			this.setConnected(false);
			this.consecutiveFailures += 1;
			this.logger.warn(
				`Database ping failed (${this.consecutiveFailures}/${this.databaseConfig.pingMaxFailuresBeforeRecovery}): ${ensureError(error).message}`,
			);
			if (!(error instanceof OperationalError)) {
				this.errorReporter.error(error);
			}

			if (this.consecutiveFailures >= this.databaseConfig.pingMaxFailuresBeforeRecovery) {
				this.logger.warn(
					`Triggering database connection recovery after ${this.consecutiveFailures} consecutive ping failures`,
				);
				// Fire-and-forget; recoverDataSource owns its own try/catch/finally and never rejects.
				this.recoveryPromise = this.recoverDataSource();
			}
		} finally {
			abortController.abort();
			this.scheduleNextPing();
		}
	}

	private async recoverDataSource() {
		if (this.recovering || this.stopped) {
			return;
		}
		this.startRecovery();

		try {
			const recoveryStart = Date.now();
			let attempt = 0;
			let recovered = false;

			while (!recovered && !this.stopped) {
				attempt += 1;
				this.logger.warn(`Attempting to recover database connection (attempt ${attempt})`);

				try {
					if (this.dataSource.isInitialized) {
						await this.destroyDataSource();
					}

					if (this.stopped) {
						break;
					}
					await this.dataSource.initialize();
					this.attachPoolErrorHandler();
					this.wrapConnectionAcquisition();
					this.setConnected(true);
					this.consecutiveFailures = 0;
					recovered = true;
				} catch (error) {
					const wrapped = ensureError(error);
					this.errorReporter.error(wrapped);
					const backoff = this.computeBackoff(attempt);
					this.logger.warn(
						`Recovery attempt ${attempt} failed: ${wrapped.message}. Retrying in ${backoff}ms`,
					);
					try {
						await setTimeoutP(backoff, undefined, {
							signal: this.stopAbortController.signal,
						});
					} catch {
						// AbortError from stop() — the while loop's `!this.stopped` guard exits next iteration.
					}
				}
			}

			if (recovered) {
				this.logger.info(
					`Database connection recovered after ${attempt} attempt(s) in ${Date.now() - recoveryStart}ms`,
				);
			} else {
				this.logger.warn(
					`Database connection recovery aborted after ${attempt} attempt(s) (monitor stopped)`,
				);
			}
		} catch (error) {
			this.errorReporter.error(ensureError(error));
		} finally {
			this.stopRecovery();
		}
	}

	/**
	 * Tears down the DataSource, bounding the Postgres pool drain so recovery can't
	 * hang forever at this step.
	 *
	 * `pool.end()` (which `destroy()` awaits) only resolves once every pooled client
	 * has been removed. A client whose query is frozen against an unreachable backend
	 * (e.g. a SHUNNED proxy or a paused process: TCP open but unresponsive) is never
	 * released, so `end()`, and therefore `destroy()`, blocks indefinitely and the
	 * recovery loop is pinned at attempt 1.
	 *
	 * For Postgres we race the drain against `destroyTimeoutMs`; if it elapses we
	 * force-close the pool's sockets, which lets the abandoned `end()` settle (and so
	 * the original `destroy()` resolves and clears `isInitialized`, unblocking the
	 * `initialize()` that follows). SQLite already bounds teardown with the
	 * sqlite-pooled driver's own `destroyTimeout`, so it takes the plain path.
	 * `destroyTimeoutMs <= 0` disables the bound (legacy behavior).
	 */
	private async destroyDataSource() {
		const destroyPromise = this.dataSource.destroy();

		const timeoutMs = Number(this.databaseConfig.postgresdb?.destroyTimeoutMs);
		if (!this.isPostgres || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
			await destroyPromise;
			return;
		}

		// Capture the pool before destroy() nulls `driver.master`, so we can still
		// force-close it on timeout.
		const pool = this.postgresDriver.master;
		// If the timeout wins the race, destroyPromise is still pending; force-closing
		// settles it, but guard against an unhandled rejection should it ever throw.
		destroyPromise.catch(() => {});

		const abortController = new AbortController();
		let timedOut = false;
		try {
			await Promise.race([
				destroyPromise,
				setTimeoutP(timeoutMs, undefined, { signal: abortController.signal }).then(() => {
					timedOut = true;
					throw new OperationalError(`Database pool teardown timed out after ${timeoutMs}ms`);
				}),
			]);
		} catch (error) {
			if (!timedOut) {
				throw error; // a genuine destroy() failure, not our timeout
			}
			this.logger.warn(
				`Database pool teardown exceeded ${timeoutMs}ms; force-closing connection sockets to continue recovery`,
			);
			this.forceClosePostgresPool(pool);
			// Force-closing fires pg-pool's pending `client.end()` callbacks, so the
			// original destroy() now resolves and flips `isInitialized` to false.
			await destroyPromise;
		} finally {
			abortController.abort();
		}
	}

	/**
	 * Forcibly discards every client in the given pg pool so a stuck `pool.end()` can
	 * finish. `pool.end()` only resolves once `_clients` is empty; a checked-out client
	 * whose query won't drain against a frozen backend keeps it non-empty forever, and
	 * destroying the socket alone does not remove it (a checked-out client has no
	 * pool-level error listener). Releasing it *with an error* makes the pool discard
	 * it, which empties `_clients`. The socket is then hard-closed as a backstop for
	 * clients with no `release` (e.g. still mid-connect) and to free it promptly.
	 *
	 * Defensive about shape because `_clients`/`release` are pg-pool internals a driver
	 * upgrade could rename; each call is isolated so one bad client can't abort the rest.
	 * If those internals ever change, the recovery integration test (which freezes a real
	 * pooled connection) stops unblocking and fails loudly — that is the guardrail, the
	 * same way the POOL_TORN_DOWN_MESSAGE strings above are pinned by the integration test.
	 */
	private forceClosePostgresPool(pool: PostgresDriver['master']) {
		const clients = (pool as unknown as PgPoolInternals | undefined)?._clients;
		if (!Array.isArray(clients)) {
			this.logger.warn(
				'Cannot force-close Postgres pool: pool._clients is unavailable (pg-pool internals may have changed)',
			);
			return;
		}
		// Snapshot: release(err) mutates the pool's own `_clients` array as it discards.
		for (const client of [...clients]) {
			try {
				client?.release?.(new OperationalError('Connection force-closed during database recovery'));
			} catch {
				// Already released / double-release guard — the socket destroy below still applies.
			}
			try {
				client?.connection?.stream?.destroy?.();
			} catch {
				// Best-effort socket teardown.
			}
		}
	}

	/**
	 * Exponential backoff for the given (1-based) recovery attempt, ramping from
	 * `minRecoveryBackoffMs` and capped at `maxRecoveryBackoffMs`.
	 *
	 * The cap is clamped to never fall below the floor, so a misconfiguration
	 * (`maxRecoveryBackoffMs < minRecoveryBackoffMs`) degrades to a constant
	 * `minRecoveryBackoffMs` delay rather than silently collapsing every retry
	 * onto the smaller max value (which would defeat the floor). The
	 * misconfiguration is warned about once at `start()`.
	 */
	private computeBackoff(attempt: number) {
		const { minRecoveryBackoffMs, maxRecoveryBackoffMs } = this.databaseConfig;
		const ceiling = Math.max(minRecoveryBackoffMs, maxRecoveryBackoffMs);
		return Math.min(minRecoveryBackoffMs * 2 ** (attempt - 1), ceiling);
	}

	private get isPostgres(): boolean {
		return this.dataSource.options.type === 'postgres';
	}

	/**
	 * Single cast site to the Postgres driver. Only called once `isPostgres`
	 * is confirmed. Returns a view of the *current* driver, which
	 * `initialize()` swaps on every recovery.
	 */
	private get postgresDriver(): PostgresDriver {
		return this.dataSource.driver as PostgresDriver;
	}

	// pg-pool emits 'error' for idle clients that fail (e.g. server-side pg_terminate_backend or RDS failover).
	// Without a listener Node treats these as unhandled and crashes the process.
	private attachPoolErrorHandler() {
		// Postgres-only: the other supported driver (sqlite-pooled) does not expose a pool-level error stream.
		if (!this.isPostgres) {
			return;
		}

		const pool = this.postgresDriver.master;
		if (!pool || typeof pool.on !== 'function') {
			// Defensive: TypeORM may have renamed `driver.master` in a future release.
			this.logger.warn(
				'Skipping Postgres pool error listener: driver.master is unavailable (TypeORM internals may have changed)',
			);
			return;
		}

		pool.on('error', (cause: unknown) => {
			if (!this.isPostgres || this.postgresDriver.master !== pool) {
				this.logger.debug('Ignoring Postgres pool error from a pool replaced by recovery');
				return;
			}
			this.setConnected(false);
			this.logger.warn(`Postgres pool client error: ${ensureError(cause).message}`);
		});
		this.logger.debug('Attached pool error listener to Postgres driver');
	}

	/**
	 * Wraps the driver's `obtainMasterConnection` so connection acquisition waits
	 * out an in-progress recovery instead of racing the torn-down pool.
	 * Re-run on every (re)initialize because `initialize()` swaps in a fresh driver instance.
	 *
	 * Only master connections are guarded. TypeORM read-replica reads go through a
	 * separate `obtainSlaveConnection` chokepoint that we don't wrap, because n8n does
	 * not configure TypeORM replication.
	 * If it ever does, replica reads would need the same treatment.
	 */
	private wrapConnectionAcquisition() {
		if (!this.isPostgres) {
			return;
		}

		const driver = this.postgresDriver;
		// Capture the unwrapped acquisition fn before we replace it below (bind keeps `this`).
		// `bind` widens to `any` here, so we reassert TypeORM's own signature.
		const original = driver.obtainMasterConnection.bind(driver) as ObtainMasterConnection;
		this.liveObtainMasterConnection = original;
		driver.obtainMasterConnection = async () => await this.acquireConnection(original);
	}

	/**
	 * Awaits any in-progress recovery, then acquires a connection.
	 * If acquisition still loses a race with `destroy()` (recovery began just after this call passed it),
	 * retry once against the live driver once recovery completes.
	 */
	private async acquireConnection(original: ObtainMasterConnection) {
		await this.awaitRecovery();

		try {
			return await this.timeAcquisition(original);
		} catch (error) {
			if (!this.isRecoverableConnectionError(error)) {
				throw error;
			}

			const liveObtainMasterConnection = this.liveObtainMasterConnection;
			const isRecoveryRace =
				this.recovering ||
				this.pendingRecovery !== undefined ||
				(liveObtainMasterConnection !== undefined && liveObtainMasterConnection !== original);
			if (!isRecoveryRace) {
				throw error;
			}

			await this.awaitRecovery();
			// `original` may be bound to the previous (destroyed) driver.
			// Prefer the live one refreshed by the latest wrapConnectionAcquisition().
			return await this.timeAcquisition(this.liveObtainMasterConnection ?? original);
		}
	}

	private async timeAcquisition(acquire: ObtainMasterConnection) {
		const observer = this.dbConnectionMetrics.acquireDurationObserver;
		if (!observer) return await acquire();

		const start = process.hrtime.bigint();
		const connection = await acquire();
		const elapsedSeconds = Number(process.hrtime.bigint() - start) * Time.nanoseconds.toSeconds;
		try {
			observer(elapsedSeconds);
		} catch (error) {
			// Metrics must never break or leak a pooled connection, but report so it isn't silent.
			this.errorReporter.error(ensureError(error));
		}
		return connection;
	}

	/**
	 * Waits out an in-progress recovery before a connection is acquired, bounded by `connectionAcquisitionTimeoutMs`.
	 * Resolves immediately when no recovery is pending.
	 *
	 * The bound matters under load: during a long outage every query parks here, so an
	 * unbounded wait would pile up parked acquirers for the whole outage. Once the timeout
	 * elapses the query rejects with an `OperationalError` (fail fast) instead of holding
	 * the request open. `0` disables the timeout (wait indefinitely).
	 *
	 * `stop()` resolves `pendingRecovery`, so a parked acquirer is also released by teardown.
	 */
	private async awaitRecovery() {
		const pending = this.pendingRecovery;
		if (!pending) {
			return;
		}

		const timeoutMs = this.databaseConfig.connectionAcquisitionTimeoutMs;
		if (timeoutMs <= 0) {
			await pending;
			return;
		}

		// AbortController clears the timeout timer once recovery (or stop) wins the race
		const abortController = new AbortController();
		try {
			await Promise.race([
				pending,
				setTimeoutP(timeoutMs, undefined, { signal: abortController.signal }).then(() => {
					throw new OperationalError(
						`Timed out after ${timeoutMs}ms waiting for database connection recovery`,
					);
				}),
			]);
		} finally {
			abortController.abort();
		}
	}

	private startRecovery() {
		this.recovering = true;
		this.markRecoveryPending();
	}

	private markRecoveryPending() {
		this.pendingRecovery ??= new Promise<void>(
			(resolve) => (this.resolvePendingRecovery = resolve),
		);
	}

	private stopRecovery() {
		this.recovering = false;
		this.clearPendingRecovery();
	}

	private clearPendingRecovery() {
		this.resolvePendingRecovery?.();
		this.resolvePendingRecovery = undefined;
		this.pendingRecovery = undefined;
	}

	private isRecoverableConnectionError(error: unknown): boolean {
		const { message } = ensureError(error);
		return (
			message.includes(POOL_TORN_DOWN_MESSAGE) || message.includes(DRIVER_NOT_CONNECTED_MESSAGE)
		);
	}

	private setConnected(connected: boolean) {
		if (this.connected === connected) {
			return;
		}
		this.connected = connected;
		this.onConnectedChange(connected);
	}
}
