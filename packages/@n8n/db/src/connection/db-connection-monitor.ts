import { inTest, type Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { DataSource } from '@n8n/typeorm';
import type { ErrorReporter } from 'n8n-core';
import { ensureError, OperationalError } from 'n8n-workflow';
import { setTimeout as setTimeoutP } from 'timers/promises';

const MAX_PING_FAILURES_BEFORE_RECOVERY = 3;
const MIN_RECOVERY_BACKOFF_MS = 1_000;
const MAX_RECOVERY_BACKOFF_MS = 30_000;

/**
 * Watches a DataSource and recovers it when the connection goes bad.
 * - Pings on `databaseConfig.pingIntervalSeconds`, races against `databaseConfig.pingTimeoutMs`.
 * - After `MAX_PING_FAILURES_BEFORE_RECOVERY` consecutive failures, destroys
 *   and reinitializes the DataSource with exponential backoff.
 * - Attaches an error listener to the pg pool (Postgres only) so terminated
 *   idle clients are caught instead of crashing the process.
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

	constructor(
		private readonly dataSource: DataSource,
		private readonly onConnectedChange: (connected: boolean) => void,
		private readonly databaseConfig: DatabaseConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		initialConnected = true,
	) {
		this.connected = initialConnected;
	}

	start() {
		this.attachPoolErrorHandler();
		this.logger.debug(
			`Database connection monitor started (pingIntervalSeconds=${this.databaseConfig.pingIntervalSeconds}, pingTimeoutMs=${this.databaseConfig.pingTimeoutMs}, recoveryThreshold=${MAX_PING_FAILURES_BEFORE_RECOVERY})`,
		);
		if (!inTest) {
			this.scheduleNextPing();
		}
	}

	stop() {
		this.stopped = true;
		this.recovering = false;
		this.stopAbortController.abort();
		if (this.pingTimer) {
			clearTimeout(this.pingTimer);
			this.pingTimer = undefined;
		}
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
				`Database ping failed (${this.consecutiveFailures}/${MAX_PING_FAILURES_BEFORE_RECOVERY}): ${ensureError(error).message}`,
			);
			if (!(error instanceof OperationalError)) {
				this.errorReporter.error(error);
			}

			if (this.consecutiveFailures >= MAX_PING_FAILURES_BEFORE_RECOVERY) {
				this.logger.warn(
					`Triggering database connection recovery after ${this.consecutiveFailures} consecutive ping failures`,
				);
				// Fire-and-forget recovery, but attach a catch so that an unexpected throw from *outside* recoverDataSource's own
				// try/catch (e.g. a driver getter that throws) doesn't become an unhandled promise rejection.
				this.recoverDataSource().catch((cause) => {
					this.errorReporter.error(ensureError(cause));
				});
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
		this.recovering = true;

		const recoveryStart = Date.now();
		let attempt = 0;
		let recovered = false;

		while (!recovered && !this.stopped) {
			attempt += 1;
			this.logger.warn(`Attempting to recover database connection (attempt ${attempt})`);

			try {
				if (this.dataSource.isInitialized) {
					await this.dataSource.destroy();
				}

				if (this.stopped) {
					break;
				}
				await this.dataSource.initialize();
				this.attachPoolErrorHandler();
				this.setConnected(true);
				this.consecutiveFailures = 0;
				recovered = true;
			} catch (error) {
				const wrapped = ensureError(error);
				this.errorReporter.error(wrapped);
				const backoff = Math.min(
					MIN_RECOVERY_BACKOFF_MS * 2 ** (attempt - 1),
					MAX_RECOVERY_BACKOFF_MS,
				);
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

		this.recovering = false;
		if (recovered) {
			this.logger.info(
				`Database connection recovered after ${attempt} attempt(s) in ${Date.now() - recoveryStart}ms`,
			);
		} else {
			this.logger.debug(
				`Database connection recovery aborted after ${attempt} attempt(s) (monitor stopped)`,
			);
		}
	}

	// pg-pool emits 'error' for idle clients that fail (e.g. server-side pg_terminate_backend or RDS failover).
	// Without a listener Node treats these as unhandled and crashes the process.
	private attachPoolErrorHandler() {
		// Postgres-only: the other supported driver (sqlite-pooled) does not expose a pool-level error stream.
		if (this.dataSource.options.type !== 'postgres') {
			return;
		}

		const driver = this.dataSource.driver as unknown as {
			master?: { on?: (event: string, handler: (cause: unknown) => void) => void };
		};

		const pool = driver.master;
		if (!pool || typeof pool.on !== 'function') {
			// Defensive: TypeORM may have renamed `driver.master` in a future release.
			this.logger.debug(
				'Skipping Postgres pool error listener: driver.master is unavailable (TypeORM internals may have changed)',
			);
			return;
		}

		pool.on('error', (cause: unknown) => {
			this.setConnected(false);
			this.logger.warn(`Postgres pool client error: ${ensureError(cause).message}`);
		});
		this.logger.debug('Attached pool error listener to Postgres driver');
	}

	private setConnected(connected: boolean) {
		if (this.connected === connected) {
			return;
		}
		this.connected = connected;
		this.onConnectedChange(connected);
	}
}
