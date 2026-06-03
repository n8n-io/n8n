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
const PING_QUERY = 'SELECT 1';

// Minimal structural views of the pg pool/client reached via `driver.master`.
// Mirrors the inline-shape + defensive-cast approach already used by
// attachPoolErrorHandler, and avoids adding a `pg` dependency edge to this package.
interface PgPoolClient {
	query: (config: { text: string; query_timeout?: number }) => Promise<unknown>;
	// pg destroys (removes from the pool) the client when release is called with a truthy error.
	release: (error?: Error | boolean) => void;
}
interface PgPool {
	connect: () => Promise<PgPoolClient>;
}

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

		try {
			await this.runPing();

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
				// Fire-and-forget; recoverDataSource owns its own try/catch/finally and never rejects.
				void this.recoverDataSource();
			}
		} finally {
			this.scheduleNextPing();
		}
	}

	/**
	 * Runs the health-check query, bounded by `pingTimeoutMs`.
	 *
	 * For Postgres we go straight to the pg pool (`driver.master`) so that, when the
	 * ping times out, we can DESTROY the specific pool client (`release(err)`) and
	 * reclaim its slot immediately — instead of leaking it until the query settles on
	 * its own (which, on a connection stalled mid-response behind a proxy, may be
	 * effectively forever). `dataSource.query('SELECT 1')` offers no such handle.
	 *
	 * Non-Postgres drivers (sqlite-pooled) have no such pool and don't suffer the
	 * cross-network stall, so they keep the original `dataSource.query` path.
	 *
	 * Throws OperationalError on timeout (not reported to Sentry) and rethrows any
	 * other driver error verbatim, preserving the error-handling semantics in `ping()`.
	 */
	private async runPing(): Promise<void> {
		const pool = this.getPgPool();
		if (!pool) {
			await this.raceTimeout(this.dataSource.query(PING_QUERY));
			return;
		}

		let bailed = false;
		// If the timeout wins the connect race, a client may still resolve afterwards.
		// Destroy that late arrival rather than silently parking it back in the pool.
		const connectPromise = pool.connect().then((client) => {
			if (bailed) {
				this.safeDestroy(client);
			}
			return client;
		});

		let client: PgPoolClient;
		try {
			client = await this.raceTimeout(connectPromise);
		} catch (error) {
			bailed = true;
			throw error;
		}

		// The ping timeout is enforced by raceTimeout (throws OperationalError, not reported to
		// Sentry). We deliberately do NOT set pg's `query_timeout`: it rejects with a generic
		// "Query read timeout" Error that would be reported as an unexpected failure on every
		// outage. On timeout we abandon this query promise and destroy the connection below, so
		// attach a no-op catch to swallow its eventual rejection (avoids an unhandled rejection).
		const queryPromise = client.query({ text: PING_QUERY });
		queryPromise.catch(() => {});

		try {
			await this.raceTimeout(queryPromise);
			client.release(); // success: return the connection to the pool
		} catch (error) {
			this.safeDestroy(client); // timeout or error: destroy the connection to free the slot now
			throw error;
		}
	}

	/**
	 * Races `work` against the ping timeout. The timeout branch throws the same
	 * OperationalError sentinel the original ping used, so the "don't report timeouts
	 * to Sentry" rule in `ping()` still applies. The timer is always cancelled in
	 * `finally` so it never leaks when `work` wins.
	 */
	private async raceTimeout<T>(work: Promise<T>): Promise<T> {
		const abortController = new AbortController();
		try {
			return await Promise.race([
				work,
				setTimeoutP(this.databaseConfig.pingTimeoutMs, undefined, {
					signal: abortController.signal,
				}).then(() => {
					throw new OperationalError('Database connection timed out');
				}),
			]);
		} finally {
			abortController.abort();
		}
	}

	/** Destroy a pg pool client, removing it from the pool. Never throws. */
	private safeDestroy(client: PgPoolClient): void {
		try {
			client.release(new Error('n8n ping timed out; destroying connection to free pool slot'));
		} catch (error) {
			this.logger.warn(
				`Failed to release timed-out ping connection: ${ensureError(error).message}`,
			);
		}
	}

	/**
	 * Returns the pg pool (`driver.master`) for a Postgres datasource, or undefined for
	 * non-postgres OR if TypeORM internals have shifted. Mirrors the defensive checks in
	 * attachPoolErrorHandler so a renamed internal degrades to the legacy
	 * `dataSource.query` path instead of crashing.
	 */
	private getPgPool(): PgPool | undefined {
		if (this.dataSource.options.type !== 'postgres') {
			return undefined;
		}
		const driver = this.dataSource.driver as unknown as { master?: PgPool };
		const pool = driver.master;
		if (!pool || typeof pool.connect !== 'function') {
			this.logger.warn(
				'Falling back to dataSource.query for ping: driver.master is unavailable (TypeORM internals may have changed)',
			);
			return undefined;
		}
		return pool;
	}

	private async recoverDataSource() {
		if (this.recovering || this.stopped) {
			return;
		}
		this.recovering = true;

		try {
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
			this.recovering = false;
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
			this.logger.warn(
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
