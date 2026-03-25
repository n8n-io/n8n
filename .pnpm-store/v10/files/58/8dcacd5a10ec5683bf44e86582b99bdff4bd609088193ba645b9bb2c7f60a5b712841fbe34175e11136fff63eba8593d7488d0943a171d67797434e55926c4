import type { DbLease, DbLeaseHolder, SqliteConnectionPool } from "./SqlitePooledTypes";
import { LeasedDbConnection } from "./LeasedDbConnection";
import { SqliteLibrary } from "./SqliteLibrary";
/**
 * Pool of read-only connections to the database.
 */
export declare class SqliteReadonlyConnectionPool implements SqliteConnectionPool {
    private readonly sqlite;
    private readonly options;
    private readonly pool;
    /**
     * Connections that are marked as invalid and should be destroyed
     */
    private readonly invalidConnections;
    /** Currently leased connections */
    private readonly dbLeases;
    /** Has the pool been released */
    private isReleased;
    constructor(sqlite: SqliteLibrary, options: {
        poolSize: number;
        acquireTimeout: number;
        destroyTimeout: number;
    });
    connect(): Promise<void>;
    close(): Promise<void>;
    runExclusive<T>(dbLeaseHolder: DbLeaseHolder, callback: (leasedDbConnection: DbLease) => Promise<T>): Promise<T>;
    leaseConnection(dbLeaseHolder: DbLeaseHolder): Promise<LeasedDbConnection>;
    releaseConnection(leasedDbConnection: DbLease): void;
    private validateDatabaseConnection;
    private createReadonlyPool;
}
