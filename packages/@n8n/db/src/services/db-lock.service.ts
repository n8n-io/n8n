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
	TRUSTED_KEY_REFRESH = 1002,
	/** Reserved for integration tests — never use in production code */
	TEST = 9999,
}

type ReleaseFn = () => void;

/**
 * Opaque ownership token created on lock acquisition. The release function
 * captures this token and only releases if it still matches `held`, which
 * prevents a stale release (from acquisition A) from corrupting a later
 * acquisition B's lock state.
 */
type OwnerToken = Record<string, never>;

interface LockState {
	held: OwnerToken | null;
	queue: Array<(token: OwnerToken) => void>;
}

/**
 * Provides serialized execution of critical sections across concurrent
 * callers using database-level advisory locks (Postgres) or an in-process
 * async mutex (SQLite).
 *
 * ## Postgres: transaction-scoped advisory locks
 *
 * This service uses `pg_advisory_xact_lock` / `pg_try_advisory_xact_lock`,
 * which are **transaction-scoped**. These locks are automatically released
 * when the transaction ends (COMMIT or ROLLBACK) and cannot be released
 * manually. This is in contrast to session-scoped advisory locks
 * (`pg_advisory_lock`) which are bound to the database connection and
 * persist across transaction boundaries until explicitly unlocked.
 *
 * Transaction-scoped locks are the safer choice in connection-pooled
 * environments (like TypeORM): a session-scoped lock that is not
 * explicitly released before the connection returns to the pool would
 * remain held when the pool hands that connection to the next caller,
 * causing unexpected blocking or deadlocks.
 *
 * ## SQLite: in-process async mutex
 *
 * SQLite has no advisory lock mechanism. A database transaction alone is
 * not sufficient because the protected function may be triggered
 * concurrently within the same process by independent sources (API
 * requests, timers, webhooks, etc.). Without an application-level lock,
 * two async calls can interleave inside the critical section even though
 * each runs in its own transaction.
 *
 * The in-process mutex serializes callers the same way
 * `pg_advisory_xact_lock` does in Postgres: only one caller at a time
 * may execute the protected function for a given lock ID.
 *
 * ## Ownership model
 *
 * Each acquisition creates an opaque ownership token. The returned release
 * function captures that token and will only release the lock if the token
 * still matches the current holder. This makes double-release a safe no-op
 * and prevents a stale release from corrupting a subsequent acquisition.
 *
 * On release, if a waiter is queued, ownership transfers atomically: the
 * new token is created and assigned to `held` before the waiter's promise
 * resolves. This ensures `held` is never `null` while the lock is logically
 * owned, eliminating a microtask-width window where a concurrent
 * `tryAcquireLock` could bypass the queue.
 */
@Service()
export class DbLockService {
	private readonly locks = new Map<number, LockState>();

	constructor(
		private readonly dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {}

	/**
	 * Execute `fn` inside a database transaction, serialized by a
	 * Postgres advisory lock or an in-process mutex (SQLite).
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
		if (this.databaseConfig.type !== 'postgresdb') {
			const release = await this.acquireLock(lockId, options?.timeoutMs);
			try {
				return await this.dataSource.manager.transaction(async (tx) => await fn(tx));
			} finally {
				release();
			}
		}

		return await this.dataSource.manager.transaction(async (tx) => {
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
			return await fn(tx);
		});
	}

	/**
	 * Execute `fn` inside a database transaction, but only if the advisory
	 * lock (Postgres) or in-process mutex (SQLite) can be acquired immediately.
	 *
	 * @throws {OperationalError} if the lock is already held by another process
	 */
	async tryWithLock<T>(lockId: DbLock, fn: (tx: EntityManager) => Promise<T>): Promise<T> {
		if (this.databaseConfig.type !== 'postgresdb') {
			const release = this.tryAcquireLock(lockId);
			try {
				return await this.dataSource.manager.transaction(async (tx) => await fn(tx));
			} finally {
				release();
			}
		}

		return await this.dataSource.manager.transaction(async (tx) => {
			const result: Array<{ pg_try_advisory_xact_lock: boolean }> = await tx.query(
				'SELECT pg_try_advisory_xact_lock($1)',
				[lockId],
			);
			if (!result[0].pg_try_advisory_xact_lock) {
				throw new OperationalError(`DbLock ${lockId} is already held by another process`);
			}
			return await fn(tx);
		});
	}

	/**
	 * Acquire the in-process lock, blocking until available.
	 * Returns a one-shot release function bound to this specific acquisition.
	 */
	private async acquireLock(lockId: number, timeoutMs?: number): Promise<ReleaseFn> {
		const lockState = this.getOrCreateLockState(lockId);

		if (!lockState.held) {
			const token: OwnerToken = {} as OwnerToken;
			lockState.held = token;
			return this.createReleaseFn(lockState, token);
		}

		// Race the lock-release signal against an optional timeout.
		//
		// Node.js is single-threaded: `resolver` (called by releaseLock) and
		// the setTimeout callback each run to completion before the other can
		// start. Only one of them will settle the Promise first; the second
		// call to resolve/reject on an already-settled Promise is a no-op per
		// the Promise spec. clearTimeout on an already-fired timer is likewise
		// a harmless no-op.
		const token = await new Promise<OwnerToken>((resolve, reject) => {
			let timer: ReturnType<typeof setTimeout> | undefined;

			const resolver = (ownerToken: OwnerToken) => {
				if (timer !== undefined) clearTimeout(timer);
				resolve(ownerToken);
			};

			lockState.queue.push(resolver);

			if (timeoutMs !== undefined) {
				timer = setTimeout(() => {
					const idx = lockState.queue.indexOf(resolver);
					if (idx !== -1) {
						lockState.queue.splice(idx, 1);
					}
					reject(
						new OperationalError(`Timed out waiting for DbLock ${lockId} after ${timeoutMs}ms`),
					);
				}, timeoutMs);
			}
		});

		return this.createReleaseFn(lockState, token);
	}

	/**
	 * Try to acquire the in-process lock without blocking.
	 * Returns a one-shot release function bound to this specific acquisition.
	 *
	 * @throws {OperationalError} if the lock is already held
	 */
	private tryAcquireLock(lockId: number): ReleaseFn {
		const lockState = this.getOrCreateLockState(lockId);

		if (!lockState.held) {
			const token: OwnerToken = {} as OwnerToken;
			lockState.held = token;
			return this.createReleaseFn(lockState, token);
		}

		throw new OperationalError(`DbLock ${lockId} is already held by another process`);
	}

	/**
	 * Create a one-shot release function for the given lock state.
	 *
	 * The release function captures the ownership token and only acts if
	 * it still matches the current holder. This ensures that:
	 * - Double-release is a safe no-op (token no longer matches after first release).
	 * - A stale release from a previous acquisition cannot corrupt a later one.
	 */
	private createReleaseFn(lockState: LockState, token: OwnerToken): ReleaseFn {
		return () => {
			if (lockState.held !== token) return;

			const next = lockState.queue.shift();
			if (next) {
				// Transfer ownership atomically: set held to the new token
				// *before* resolving the waiter's promise. This ensures held
				// is never null while the lock is logically owned, preventing
				// a concurrent tryAcquireLock from sneaking in during the
				// microtask gap between resolve and the waiter's continuation.
				const nextToken: OwnerToken = {} as OwnerToken;
				lockState.held = nextToken;
				next(nextToken);
			} else {
				lockState.held = null;
			}
		};
	}

	private getOrCreateLockState(lockId: number): LockState {
		let lockState = this.locks.get(lockId);
		if (!lockState) {
			lockState = { held: null, queue: [] };
			this.locks.set(lockId, lockState);
		}
		return lockState;
	}
}
