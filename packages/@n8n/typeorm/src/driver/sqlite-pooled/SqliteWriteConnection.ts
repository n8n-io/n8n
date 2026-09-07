import { Database as Sqlite3Database } from 'sqlite3';
import { DbLease, DbLeaseHolder, DbLeaseOwner, SqliteConnectionPool } from './SqlitePooledTypes';
import { Mutex, MutexInterface, withTimeout, E_TIMEOUT } from 'async-mutex';
import assert from 'assert';
import { DriverAlreadyReleasedError } from '../../error/DriverAlreadyReleasedError';
import { SqliteLibrary } from './SqliteLibrary';
import { LeasedDbConnection } from './LeasedDbConnection';
import { TimeoutTimer } from './Timer';
import { InvariantViolatedError } from '../../error/InvariantViolatedError';
import { LockAcquireTimeoutError } from '../../error/LockAcquireTimeoutError';

/**
 * A single write connection to the database.
 */
export class SqliteWriteConnection implements SqliteConnectionPool, DbLeaseOwner {
	private writeConnectionPromise: Promise<Sqlite3Database> | null = null;

	private isReleased = false;

	/**
	 * Mutex to control access to the write connection.
	 */
	private readonly writeConnectionMutex: MutexInterface;

	private dbLease: DbLease | undefined;

	constructor(
		private readonly sqliteLibrary: SqliteLibrary,
		private readonly options: {
			acquireTimeout: number;
			destroyTimeout: number;
		},
	) {
		const acquireTimeout = options.acquireTimeout;

		this.writeConnectionMutex = withTimeout(new Mutex(), acquireTimeout);
	}

	public async connect() {
		this.assertNotReleased();

		await this.writeConnectionMutex.runExclusive(async () => await this.createConnection());
	}

	public async close(): Promise<void> {
		if (this.isReleased) return;

		this.isReleased = true;

		// Cancel any pending acquires
		this.writeConnectionMutex.cancel();
		// If there is an existing lease, request it to be released
		if (this.dbLease) {
			this.dbLease.requestRelease();
		}

		const timeoutTimer = TimeoutTimer.start(this.options.destroyTimeout);
		await Promise.race([this.writeConnectionMutex.acquire(), timeoutTimer.promise]).finally(() => {
			timeoutTimer.clear();
		});

		if (this.writeConnectionPromise) {
			const dbConnection = await this.writeConnectionPromise;
			this.sqliteLibrary.destroyDatabaseConnection(dbConnection);
		}
	}

	public async runExclusive<T>(
		dbLeaseHolder: DbLeaseHolder,
		callback: (dbLease: DbLease) => Promise<T>,
	): Promise<T> {
		this.assertNotReleased();

		try {
			return await this.writeConnectionMutex.runExclusive(async () => {
				this.dbLease = await this.createAndGetConnection(dbLeaseHolder);

				const result = await callback(this.dbLease).finally(() => {
					// runExclusive will make sure the mutex is released. Make
					// sure we also mark the lease as released
					const dbLease = this.dbLease;
					this.dbLease = undefined;

					if (dbLease && dbLease.isInvalid) {
						this.sqliteLibrary.destroyDatabaseConnection(dbLease.connection);
						this.writeConnectionPromise = null;
					}
				});

				return result;
			});
		} catch (error) {
			if (error === E_TIMEOUT) {
				this.throwLockTimeoutError(error);
			}

			throw error;
		}
	}

	public async leaseConnection(dbLeaseHolder: DbLeaseHolder) {
		this.assertNotReleased();

		try {
			await this.writeConnectionMutex.acquire();
		} catch (error) {
			if (error === E_TIMEOUT) {
				this.throwLockTimeoutError(error);
			}
			throw error;
		}

		this.dbLease = await this.createAndGetConnection(dbLeaseHolder);
		return this.dbLease;
	}

	public async releaseConnection(leasedDbConnection: DbLease) {
		if (leasedDbConnection !== this.dbLease) {
			// Someone is trying to release a connection that is no longer be
			// the active connection. This is most likely a bug somewhere. In
			// this case we can't release it, since it might have been already
			// acquired by someone else. The best we can do is capture the
			// exception and hope for the best.
			this.captureInvariantViolated({
				method: 'releaseConnection',
				givenConnectionMatches: this.dbLease === leasedDbConnection,
				mutexIsLocked: this.writeConnectionMutex.isLocked(),
				hasWriteConnection: !!this.writeConnectionPromise,
			});
			return;
		}

		try {
			assert(this.writeConnectionPromise);
			const connection = await this.writeConnectionPromise;
			if (leasedDbConnection.isInvalid) {
				this.sqliteLibrary.destroyDatabaseConnection(connection);
				this.writeConnectionPromise = null;
			}
		} finally {
			this.dbLease = undefined;
			this.writeConnectionMutex.release();
		}
	}

	private async createAndGetConnection(dbLeaseHolder: DbLeaseHolder): Promise<LeasedDbConnection> {
		if (!this.writeConnectionPromise) {
			this.writeConnectionPromise = this.sqliteLibrary.createDatabaseConnection();
		}

		const dbConnection = await this.writeConnectionPromise;

		assert(!this.dbLease);
		return new LeasedDbConnection(dbConnection, this, dbLeaseHolder);
	}

	private async createConnection() {
		this.assertNotReleased();

		if (this.writeConnectionPromise) {
			throw new Error('Connection already created');
		}

		this.writeConnectionPromise = this.sqliteLibrary.createDatabaseConnection();
		return this.writeConnectionPromise;
	}

	private assertNotReleased() {
		if (this.isReleased) {
			throw new DriverAlreadyReleasedError();
		}
	}

	private captureInvariantViolated(extra: Record<string, string | boolean>) {
		const error = new InvariantViolatedError();
		console.error(
			'Invariant violated:',
			Object.keys(extra)
				.map((key) => `${key}=${extra[key]}`)
				.join(', '),
		);
		console.error(error);
	}

	private throwLockTimeoutError(cause: Error) {
		throw new LockAcquireTimeoutError('SqliteWriteConnectionMutex', {
			cause,
		});
	}
}
