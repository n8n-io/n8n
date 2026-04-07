import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource, QueryFailedError } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';

/**
 * Centrally managed advisory lock IDs. Every Postgres advisory lock
 * used in the application MUST be registered here to prevent collisions.
 */
export const enum DbLock {
	AUTH_ROLES_SYNC = 1001,
	/** Reserved for integration tests — never use in production code */
	TEST = 9999,
}

@Service()
export class DbLockService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {}

	/**
	 * Execute `fn` inside a database transaction, serialized by a
	 * Postgres advisory lock. On SQLite the transaction alone provides
	 * serialization (single-process only).
	 *
	 * The lock is automatically released when the transaction commits
	 * or rolls back. Concurrent callers block until the lock is available.
	 *
	 * @param options.timeoutMs - Maximum time in milliseconds to wait for the lock.
	 *   If not provided, waits indefinitely.
	 */
	async withLock<T>(
		lockId: DbLock,
		fn: (tx: EntityManager) => Promise<T>,
		options?: { timeoutMs?: number },
	): Promise<T> {
		return await this.dataSource.manager.transaction(async (tx) => {
			if (this.databaseConfig.type === 'postgresdb') {
				if (options?.timeoutMs !== undefined) {
					// SET doesn't support parameterized queries ($1) in Postgres.
					// Number() coercion is safe here since timeoutMs is typed as number.
					await tx.query(`SET LOCAL lock_timeout = '${Number(options.timeoutMs)}'`);
				}
				try {
					await tx.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
				} catch (error) {
					if (error instanceof QueryFailedError && error.message.includes('lock timeout')) {
						throw new OperationalError(
							`Timed out waiting for DbLock ${lockId} after ${options?.timeoutMs}ms`,
							{ cause: error },
						);
					}
					throw error;
				}
			}
			return await fn(tx);
		});
	}

	/**
	 * Execute `fn` inside a database transaction, but only if the advisory
	 * lock can be acquired immediately. On SQLite the transaction alone
	 * provides serialization.
	 *
	 * @throws {OperationalError} if the lock is already held by another process
	 */
	async tryWithLock<T>(lockId: DbLock, fn: (tx: EntityManager) => Promise<T>): Promise<T> {
		return await this.dataSource.manager.transaction(async (tx) => {
			if (this.databaseConfig.type === 'postgresdb') {
				const result: Array<{ pg_try_advisory_xact_lock: boolean }> = await tx.query(
					'SELECT pg_try_advisory_xact_lock($1)',
					[lockId],
				);
				if (!result[0].pg_try_advisory_xact_lock) {
					throw new OperationalError(`DbLock ${lockId} is already held by another process`);
				}
			}
			return await fn(tx);
		});
	}
}
