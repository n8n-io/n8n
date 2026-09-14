import type { Database as Sqlite3Database } from 'sqlite3';
import { DatabaseConnectionLeaseAlreadyReleasedError } from '../../error/DatabaseConnectionLeaseAlreadyReleasedError';
import { DbLease, DbLeaseHolder, DbLeaseOwner } from './SqlitePooledTypes';

/**
 * Represents a leased database connection. The connection is
 * leased from the owner to the lease holder, and must be
 * released back to the owner when no longer needed.
 */
export class LeasedDbConnection implements DbLease {
	private isReleased = false;
	private _isInvalid = false;

	public get isInvalid() {
		return this._isInvalid;
	}

	public get connection(): Sqlite3Database {
		if (this.isReleased) {
			throw new DatabaseConnectionLeaseAlreadyReleasedError();
		}

		return this._connection;
	}

	constructor(
		private readonly _connection: Sqlite3Database,
		private readonly leaseOwner: DbLeaseOwner,
		private readonly leaseHolder: DbLeaseHolder,
	) {}

	public markAsInvalid() {
		this._isInvalid = true;
	}

	async release() {
		if (this.isReleased) {
			return;
		}

		this.leaseOwner.releaseConnection(this);
		this.isReleased = true;
	}

	public async requestRelease() {
		if (this.isReleased) {
			return;
		}

		this.leaseHolder.requestRelease();
	}
}
