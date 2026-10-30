import assert from 'node:assert';
import type { Database as Sqlite3Database } from 'sqlite3';
import { Pool, TimeoutError } from 'tarn';
import type { DbLease, DbLeaseHolder, SqliteConnectionPool } from './SqlitePooledTypes';
import { DriverAlreadyReleasedError } from '../../error/DriverAlreadyReleasedError';
import { LockAcquireTimeoutError } from '../../error/LockAcquireTimeoutError';
import { LeasedDbConnection } from './LeasedDbConnection';
import { SqliteLibrary } from './SqliteLibrary';

const SQLITE_OPEN_READONLY = 1;

/**
 * Pool of read-only connections to the database.
 */
export class SqliteReadonlyConnectionPool implements SqliteConnectionPool {
	private readonly pool: Pool<Sqlite3Database>;

	/**
	 * Connections that are marked as invalid and should be destroyed
	 */
	private readonly invalidConnections = new WeakSet<Sqlite3Database>();

	/** Currently leased connections */
	private readonly dbLeases = new Set<DbLease>();

	/** Has the pool been released */
	private isReleased = false;

	constructor(
		private readonly sqlite: SqliteLibrary,
		private readonly options: {
			poolSize: number;
			acquireTimeout: number;
			destroyTimeout: number;
		},
	) {
		assert(this.options.poolSize > 0);
		this.pool = this.createReadonlyPool();
	}

	public async connect() {
		// Do nothing, connections are acquired on demand
	}

	public async close() {
		for (const dbLease of this.dbLeases) {
			dbLease.requestRelease();
		}

		await this.pool.destroy();
	}

	public getStats(): {
		used: number;
		free: number;
		pendingAcquires: number;
	} {
		return {
			used: this.pool.numUsed(),
			free: this.pool.numFree(),
			pendingAcquires: this.pool.numPendingAcquires(),
		};
	}

	public async runExclusive<T>(
		dbLeaseHolder: DbLeaseHolder,
		callback: (leasedDbConnection: DbLease) => Promise<T>,
	): Promise<T> {
		if (this.isReleased) {
			throw new DriverAlreadyReleasedError();
		}

		const dbConnection = await this.acquireConnection();
		const dbLease = new LeasedDbConnection(dbConnection, this, dbLeaseHolder);

		this.dbLeases.add(dbLease);

		try {
			return await callback(dbLease);
		} finally {
			this.releaseConnection(dbLease);
		}
	}

	public async leaseConnection(dbLeaseHolder: DbLeaseHolder): Promise<LeasedDbConnection> {
		if (this.isReleased) {
			throw new DriverAlreadyReleasedError();
		}

		const dbConnection = await this.acquireConnection();
		const dbLease = new LeasedDbConnection(dbConnection, this, dbLeaseHolder);

		// Track the lease so `close()` can ask its holder to release it.
		this.dbLeases.add(dbLease);

		return dbLease;
	}

	public releaseConnection(leasedDbConnection: DbLease) {
		if (leasedDbConnection.isInvalid) {
			this.invalidConnections.add(leasedDbConnection.connection);
		}
		this.dbLeases.delete(leasedDbConnection);
		this.pool.release(leasedDbConnection.connection);
	}

	/**
	 * Names the pool in the timeout error, as the write side does for its mutex,
	 * so an exhausted read pool is told apart from a held write lock.
	 */
	private async acquireConnection(): Promise<Sqlite3Database> {
		try {
			return await this.pool.acquire().promise;
		} catch (error) {
			if (error instanceof TimeoutError) {
				throw new LockAcquireTimeoutError(
					`SqliteReadonlyConnectionPool (${this.pool.numUsed()}/${this.options.poolSize} leased)`,
					{ cause: error },
				);
			}
			throw error;
		}
	}

	private validateDatabaseConnection(dbConnection: Sqlite3Database) {
		return !this.invalidConnections.has(dbConnection);
	}

	private createReadonlyPool(): Pool<Sqlite3Database> {
		const pool = new Pool<Sqlite3Database>({
			acquireTimeoutMillis: this.options.acquireTimeout,
			destroyTimeoutMillis: this.options.destroyTimeout,
			create: async () => {
				return await this.sqlite.createDatabaseConnection(SQLITE_OPEN_READONLY);
			},
			validate: (dbConnection) => {
				return this.validateDatabaseConnection(dbConnection);
			},
			destroy: async (dbConnection) => {
				this.invalidConnections.delete(dbConnection);

				return await this.sqlite.destroyDatabaseConnection(dbConnection);
			},
			min: 1,
			max: this.options.poolSize,
		});

		return pool;
	}
}
