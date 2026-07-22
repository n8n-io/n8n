import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Memoized } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { DataSource, MigrationExecutor } from '@n8n/typeorm';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { computeBackoff } from './backoff';
import { DbConnectionMetrics } from './db-connection-metrics';
import { DbConnectionMonitor } from './db-connection-monitor';
import { DbConnectionOptions } from './db-connection-options';
import { readPoolStats, type DbPoolStats } from './db-pool-stats';
import { wrapMigration } from '../migrations/migration-helpers';
import type { Migration } from '../migrations/migration-types';
import { DbLock } from '../services/db-lock.service';
import { TransactionRunner } from '../services/transaction';
import { TypeOrmTransactionRunner } from '../services/typeorm-transaction';

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

@Service()
export class DbConnection {
	private dataSource: DataSource;

	private monitor: DbConnectionMonitor | undefined;

	readonly connectionState: ConnectionState = {
		connected: false,
		migrated: false,
	};

	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly connectionOptions: DbConnectionOptions,
		private readonly databaseConfig: DatabaseConfig,
		private readonly logger: Logger,
		private readonly dbConnectionMetrics: DbConnectionMetrics,
	) {
		this.dataSource = new DataSource(this.options);
		Container.set(DataSource, this.dataSource);
		// Bind the TransactionRunner port to its TypeORM implementation so business logic
		// can inject the abstract port without knowing the adapter.
		Container.set(TransactionRunner, Container.get(TypeOrmTransactionRunner));
	}

	@Memoized
	get options() {
		return this.connectionOptions.getOptions();
	}

	getPoolStats(): DbPoolStats | undefined {
		return readPoolStats(this.dataSource);
	}

	async init(): Promise<void> {
		const { connectionState } = this;
		if (connectionState.connected) return;

		// TODO(CAT-3314): Remove N8N_DB_PING_TIMEOUT fallback in v3.
		if (process.env.N8N_DB_PING_TIMEOUT) {
			this.logger.warn(
				'N8N_DB_PING_TIMEOUT is deprecated, use DB_PING_TIMEOUT_MS instead. The legacy variable will be removed in a future release.',
			);
		}

		await this.connectWithRetry();

		connectionState.connected = true;
		this.monitor = new DbConnectionMonitor(
			this.dataSource,
			(connected) => (this.connectionState.connected = connected),
			this.databaseConfig,
			this.logger,
			this.errorReporter,
			this.dbConnectionMetrics,
			connectionState.connected,
		);
		this.monitor.start();
	}

	async migrate() {
		const { dataSource, connectionState, options } = this;
		(dataSource.options.migrations as Migration[]).forEach(wrapMigration);
		if (options.type === 'postgres') {
			await this.migrateWithAdvisoryLock(options);
		} else {
			// SQLite is single-instance, so concurrent migrations aren't possible.
			await dataSource.runMigrations({ transaction: 'each' });
		}
		connectionState.migrated = true;
	}

	/**
	 * Runs migrations while holding a transaction-scoped Postgres advisory lock
	 * (`pg_advisory_xact_lock`), so instances starting concurrently against one
	 * database migrate one at a time instead of racing (deadlocks,
	 * `column ... already exists`, crash-looping pods).
	 *
	 * The lock transaction hosts the migrations themselves, on a single pooled
	 * connection: holding the lock on a second connection would deadlock startup
	 * when `DB_POSTGRESDB_POOL_SIZE=1`. All pending migrations therefore commit
	 * or roll back as one unit (instead of the previous per-migration commits),
	 * and the lock's lifetime is exactly the transaction's — released on
	 * commit/rollback, or by the server/pooler when the migrating instance dies,
	 * so a crash can never leave the lock behind (also under PgBouncer, which
	 * keeps server connections alive across client disconnects, where a
	 * session-scoped lock could be orphaned).
	 */
	private async migrateWithAdvisoryLock(options: {
		schema?: string;
		entityPrefix?: string;
		statementTimeout?: number;
	}) {
		const { dataSource } = this;
		// Scoped by schema+prefix so co-hosted tenants in one database don't block each other.
		const subKey = createHash('sha256')
			.update(`${options.schema ?? 'public'}:${options.entityPrefix ?? ''}`)
			.digest()
			.readInt32BE(0);
		const queryRunner = dataSource.createQueryRunner();
		try {
			this.logger.info('Acquiring database migration lock...');
			await queryRunner.startTransaction();
			try {
				// A waiter blocks inside pg_advisory_xact_lock() — a single statement —
				// so it must not be killed by the driver's statement_timeout (default
				// 5 min). The transaction also idles between statements while migration
				// JS runs, so it must not be reaped by an idle-in-transaction timeout.
				// SET LOCAL confines both overrides to this transaction.
				await queryRunner.query('SET LOCAL statement_timeout = 0');
				await queryRunner.query('SET LOCAL idle_in_transaction_session_timeout = 0');
				await queryRunner.query('SELECT pg_advisory_xact_lock($1, $2)', [
					DbLock.MIGRATIONS,
					subKey,
				]);
				if (options.statementTimeout) {
					// Lock acquired — restore the driver's per-statement cap for the
					// migration statements themselves.
					await queryRunner.query(
						`SET LOCAL statement_timeout = ${Number(options.statementTimeout)}`,
					);
				}

				const migrationExecutor = new MigrationExecutor(dataSource, queryRunner);
				// 'none': the executor manages no transactions and runs everything
				// inside ours, tying the migrations' fate to the lock's.
				migrationExecutor.transaction = 'none';
				await migrationExecutor.executePendingMigrations();

				await queryRunner.commitTransaction();
			} catch (error) {
				// Rethrow the original error even if the rollback itself fails.
				await queryRunner.rollbackTransaction().catch(() => {});
				throw error;
			}
		} finally {
			await queryRunner.release();
		}
	}

	async close() {
		await this.monitor?.stop();
		this.monitor = undefined;

		if (this.dataSource.isInitialized) {
			await this.dataSource.destroy();
			this.connectionState.connected = false;
		}
	}

	/**
	 * Opens the initial connection, retrying transient failures with exponential
	 * backoff before giving up. Throws once `startupConnectMaxRetries` is exhausted.
	 */
	private async connectWithRetry(): Promise<void> {
		const { options } = this;
		const { minRecoveryBackoffMs, maxRecoveryBackoffMs, startupConnectMaxRetries } =
			this.databaseConfig;
		const maxAttempts = startupConnectMaxRetries + 1;
		for (let attempt = 1; ; attempt++) {
			try {
				await this.dataSource.initialize();
				return;
			} catch (e) {
				let error = ensureError(e);
				if (
					options.type === 'postgres' &&
					error.message === 'Connection terminated due to connection timeout'
				) {
					error = new DbConnectionTimeoutError({
						cause: error,
						configuredTimeoutInMs: options.connectTimeoutMS!,
					});
				}
				if (attempt >= maxAttempts) throw error;

				const backoff = computeBackoff(attempt, minRecoveryBackoffMs, maxRecoveryBackoffMs);
				this.logger.warn(
					`Initial database connection attempt ${attempt} failed: ${error.message}. Retrying in ${backoff}ms`,
				);
				await setTimeoutP(backoff);
			}
		}
	}
}
