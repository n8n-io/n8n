import { DbLease, DbLeaseHolder, DbLeaseOwner, SqliteConnectionPool } from "./SqlitePooledTypes";
import { SqliteLibrary } from "./SqliteLibrary";
/**
 * A single write connection to the database.
 */
export declare class SqliteWriteConnection implements SqliteConnectionPool, DbLeaseOwner {
    private readonly sqliteLibrary;
    private readonly options;
    private writeConnectionPromise;
    private isReleased;
    /**
     * Mutex to control access to the write connection.
     */
    private readonly writeConnectionMutex;
    private dbLease;
    constructor(sqliteLibrary: SqliteLibrary, options: {
        acquireTimeout: number;
        destroyTimeout: number;
    });
    connect(): Promise<void>;
    close(): Promise<void>;
    runExclusive<T>(dbLeaseHolder: DbLeaseHolder, callback: (dbLease: DbLease) => Promise<T>): Promise<T>;
    leaseConnection(dbLeaseHolder: DbLeaseHolder): Promise<DbLease>;
    releaseConnection(leasedDbConnection: DbLease): Promise<void>;
    private createAndGetConnection;
    private createConnection;
    private assertNotReleased;
    private captureInvariantViolated;
    private throwLockTimeoutError;
}
