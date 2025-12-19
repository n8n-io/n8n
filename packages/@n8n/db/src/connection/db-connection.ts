import { inTest, Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Memoized } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { BinaryDataConfig, ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, ensureError, OperationalError } from 'n8n-workflow';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { DbConnectionOptions } from './db-connection-options';
import { wrapMigration } from '../migrations/migration-helpers';
import type { Migration } from '../migrations/migration-types';

/**
 * Advisory lock key used to prevent concurrent database operations in multi-main setups.
 * This ensures only one n8n instance runs migrations and initialization at a time.
 * The number is arbitrary but should be unique to n8n.
 */
const ADVISORY_LOCK_KEY = 1850;

/**
 * Default timeout for acquiring advisory locks (in milliseconds).
 * If the lock cannot be acquired within this time, an error is thrown.
 */
const ADVISORY_LOCK_TIMEOUT_MS = 30_000;

/**
 * Interval between lock acquisition attempts (in milliseconds).
 */
const ADVISORY_LOCK_RETRY_INTERVAL_MS = 500;

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

@Service()
export class DbConnection {
	private dataSource: DataSource;

	private pingTimer: NodeJS.Timeout | undefined;

	readonly connectionState: ConnectionState = {
		connected: false,
		migrated: false,
	};

	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly connectionOptions: DbConnectionOptions,
		private readonly databaseConfig: DatabaseConfig,
		private readonly logger: Logger,
		private readonly binaryDataConfig: BinaryDataConfig,
	) {
		this.dataSource = new DataSource(this.options);
		Container.set(DataSource, this.dataSource);
	}

	@Memoized
	get options() {
		return this.connectionOptions.getOptions();
	}

	async init(): Promise<void> {
		const { connectionState, options } = this;
		if (connectionState.connected) return;
		try {
			await this.dataSource.initialize();
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
			throw error;
		}

		if (
			(options.type === 'mysql' || options.type === 'mariadb') &&
			this.binaryDataConfig.availableModes.includes('database')
		) {
			const maxAllowedPacket = this.binaryDataConfig.dbMaxFileSize * 1024 * 1024;
			try {
				await this.dataSource.query(`SET GLOBAL max_allowed_packet = ${maxAllowedPacket}`);
			} catch {
				this.logger.warn(
					`Failed to set \`max_allowed_packet\` to ${maxAllowedPacket} bytes on your MySQL server. ` +
						`Please set \`max_allowed_packet\` to at least ${this.binaryDataConfig.dbMaxFileSize} MiB in your MySQL server configuration.`,
				);
			}
		}

		connectionState.connected = true;
		if (!inTest) this.scheduleNextPing();
	}

	async migrate() {
		const { dataSource, connectionState } = this;

		await this.withAdvisoryLock(async () => {
			(dataSource.options.migrations as Migration[]).forEach(wrapMigration);
			await dataSource.runMigrations({ transaction: 'each' });
			connectionState.migrated = true;
		});
	}

	/**
	 * Execute an async function with a PostgreSQL session-level advisory lock.
	 * This ensures only one n8n instance executes the function at a time in multi-main setups.
	 * For non-PostgreSQL databases, the function is executed without locking.
	 *
	 * Uses a QueryRunner to maintain a dedicated connection for the entire lock lifecycle.
	 * This ensures the same connection is used for both lock acquisition and release,
	 * which is required for session-level advisory locks to work correctly with connection pooling.
	 *
	 * When pool size is 1, advisory locking is skipped because:
	 * 1. The pool itself acts as a natural lock - only one connection can exist at a time
	 * 2. The QueryRunner would hold the only connection, leaving none for the function to use
	 *
	 * The lock has a timeout to prevent indefinite blocking if another instance holds the lock.
	 * If the lock cannot be acquired within the timeout, an error is thrown.
	 */
	async withAdvisoryLock<T>(fn: () => Promise<T>): Promise<T> {
		const { dataSource, options } = this;
		const isPostgres = options.type === 'postgres';
		const poolSize = 'poolSize' in options ? (options.poolSize as number) : undefined;

		// Skip advisory lock for non-PostgreSQL databases
		if (!isPostgres) {
			return await fn();
		}

		// Skip advisory lock when pool size is 1 - the pool itself acts as a lock,
		// and using a QueryRunner would consume the only available connection
		if (poolSize === 1) {
			return await fn();
		}

		// Use a QueryRunner to maintain a dedicated connection for lock/unlock
		const queryRunner = dataSource.createQueryRunner();
		let lockAcquired = false;

		try {
			const startTime = Date.now();

			// Try to acquire the session-level lock with timeout
			while (!lockAcquired) {
				const result = await queryRunner.query(`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY})`);
				lockAcquired = result[0]?.pg_try_advisory_lock ?? false;

				if (!lockAcquired) {
					const elapsed = Date.now() - startTime;
					if (elapsed >= ADVISORY_LOCK_TIMEOUT_MS) {
						throw new OperationalError(
							`Failed to acquire database advisory lock (key: ${ADVISORY_LOCK_KEY}) after ${ADVISORY_LOCK_TIMEOUT_MS}ms. ` +
								'Another n8n instance may be holding the lock. ' +
								'The lock will auto-release when that instance completes or its connection drops. ' +
								'If you believe this is an error, you can identify and terminate the blocking session with: ' +
								`SELECT pg_terminate_backend(pid) FROM pg_locks WHERE objid = ${ADVISORY_LOCK_KEY} AND locktype = 'advisory';`,
						);
					}
					await setTimeoutP(ADVISORY_LOCK_RETRY_INTERVAL_MS);
				}
			}

			// Lock acquired, execute the function
			return await fn();
		} finally {
			// Only unlock if we successfully acquired the lock
			if (lockAcquired) {
				try {
					await queryRunner.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`);
				} catch {
					// Ignore unlock errors - connection may have dropped, which auto-releases the lock
				}
			}
			// Always release the QueryRunner to return connection to pool
			await queryRunner.release();
		}
	}

	async close() {
		if (this.pingTimer) {
			clearTimeout(this.pingTimer);
			this.pingTimer = undefined;
		}

		if (this.dataSource.isInitialized) {
			await this.dataSource.destroy();
			this.connectionState.connected = false;
		}
	}

	/** Ping DB connection every `pingIntervalSeconds` seconds to check if it is still alive. */
	private scheduleNextPing() {
		this.pingTimer = setTimeout(
			async () => await this.ping(),
			this.databaseConfig.pingIntervalSeconds * Time.seconds.toMilliseconds,
		);
	}

	private async ping() {
		if (!this.dataSource.isInitialized) return;
		const abortController = new AbortController();

		try {
			await Promise.race([
				this.dataSource.query('SELECT 1'),
				setTimeoutP(5000, undefined, { signal: abortController.signal }).then(() => {
					throw new OperationalError('Database connection timed out');
				}),
			]);

			if (!this.connectionState.connected) {
				this.logger.info('Database connection recovered');
			}

			this.connectionState.connected = true;
			return;
		} catch (error) {
			this.connectionState.connected = false;
			if (error instanceof OperationalError) {
				this.logger.warn(error.message);
			} else {
				this.errorReporter.error(error);
			}
		} finally {
			abortController.abort();
			this.scheduleNextPing();
		}
	}
}
