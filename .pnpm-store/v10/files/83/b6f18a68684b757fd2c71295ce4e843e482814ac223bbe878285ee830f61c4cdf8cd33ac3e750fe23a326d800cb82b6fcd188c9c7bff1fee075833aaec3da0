import type { Database as Sqlite3Database } from "sqlite3";
import { DbLease, DbLeaseHolder, DbLeaseOwner } from "./SqlitePooledTypes";
/**
 * Represents a leased database connection. The connection is
 * leased from the owner to the lease holder, and must be
 * released back to the owner when no longer needed.
 */
export declare class LeasedDbConnection implements DbLease {
    private readonly _connection;
    private readonly leaseOwner;
    private readonly leaseHolder;
    private isReleased;
    private _isInvalid;
    get isInvalid(): boolean;
    get connection(): Sqlite3Database;
    constructor(_connection: Sqlite3Database, leaseOwner: DbLeaseOwner, leaseHolder: DbLeaseHolder);
    markAsInvalid(): void;
    release(): Promise<void>;
    requestRelease(): Promise<void>;
}
