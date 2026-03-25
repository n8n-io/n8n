import type { Database as Sqlite3Database } from "sqlite3";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { DbLeaseHolder, SqliteConnectionPool } from "./SqlitePooledTypes";
import { DataSource } from "../../data-source/DataSource";
import { SqlitePooledConnectionOptions } from "./SqlitePooledConnectionOptions";
import { AbstractSqliteQueryRunner } from "../sqlite-abstract/AbstractSqliteQueryRunner";
import { SqliteLibrary } from "./SqliteLibrary";
import { QueryResult } from "../../query-runner/QueryResult";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
export declare class SqliteReadWriteQueryRunner extends AbstractSqliteQueryRunner implements QueryRunner, DbLeaseHolder {
    private readonly sqliteLibrary;
    private readonly writePool;
    private readonly readPool;
    private readonly options;
    private trxDbLease;
    private get logger();
    constructor(driver: AbstractSqliteDriver, connection: DataSource, sqliteLibrary: SqliteLibrary, writePool: SqliteConnectionPool, readPool: SqliteConnectionPool, options: SqlitePooledConnectionOptions);
    /**
     * Called before migrations are run.
     */
    beforeMigration(): Promise<void>;
    /**
     * Called after migrations are run.
     */
    afterMigration(): Promise<void>;
    connect(): Promise<void>;
    requestRelease(): void;
    release(): Promise<void>;
    /**
     * Starts transaction.
     */
    startTransaction(): Promise<void>;
    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    commitTransaction(): Promise<void>;
    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    rollbackTransaction(): Promise<void>;
    /**
     * Executes a given SQL query.
     */
    query(query: string, parameters?: unknown[], useStructuredResult?: boolean): Promise<any>;
    runQueryWithinConnection(connection: Sqlite3Database, query: string, parameters?: unknown[], useStructuredResult?: boolean): Promise<QueryResult | any>;
    private isReadQuery;
    private releaseTrxDbLease;
}
