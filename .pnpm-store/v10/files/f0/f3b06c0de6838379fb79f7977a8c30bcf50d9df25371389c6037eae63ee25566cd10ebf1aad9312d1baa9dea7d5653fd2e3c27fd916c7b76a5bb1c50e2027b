import type { Database as Sqlite3Database } from "sqlite3";
/**
 * Represents a pool of connections for SQLite databases.
 * The pool is responsible for managing the connections and
 * ensuring that connections are not leaked. Connections can
 * be leased from the pool for use and must be released back.
 */
export interface SqliteConnectionPool {
    runExclusive<T>(dbLeaseHolder: DbLeaseHolder, callback: (leasedDbConnection: DbLease) => Promise<T>): Promise<T>;
    leaseConnection(dbLeaseHolder: DbLeaseHolder): Promise<DbLease>;
    releaseConnection(leasedDbConnection: DbLease): void;
    close(): Promise<void>;
}
/**
 * Represents a leased database connection. The connection is
 * leased from the owner to the lease holder, and must be
 * released back to the owner when no longer needed.
 */
export interface DbLease {
    readonly connection: Sqlite3Database;
    readonly isInvalid: boolean;
    /**
     * Marks the connection as invalid. This will cause the
     * connection to be released and a new connection to be
     * created when the lease holder requests a new connection.
     */
    markAsInvalid(): void;
    /**
     * Releases the connection back to the pool
     */
    release(): void;
    /**
     * Signals that the lease holder should release the lease ASAP
     */
    requestRelease(): void;
}
export interface DbLeaseOwner {
    releaseConnection(leasedDbConnection: DbLease): void;
}
export interface DbLeaseHolder {
    /**
     * Signals that the lease holder should release the lease ASAP
     */
    requestRelease(): void;
}
