import type { sqlite3, Database as Sqlite3Database } from "sqlite3";
import { DataSource } from "../../data-source/DataSource";
import { SqliteConnectionOptions } from "./SqliteConnectionOptions";
import { ColumnType } from "../types/ColumnTypes";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import { ReplicationMode } from "../types/ReplicationMode";
/**
 * Organizes communication with sqlite DBMS.
 */
export declare class SqliteDriver extends AbstractSqliteDriver {
    /**
     * Connection options.
     */
    options: SqliteConnectionOptions;
    /**
     * SQLite underlying library.
     */
    sqlite: sqlite3;
    constructor(connection: DataSource);
    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void>;
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner;
    normalizeType(column: {
        type?: ColumnType;
        length?: number | string;
        precision?: number | null;
        scale?: number;
    }): string;
    afterConnect(): Promise<void>;
    /**
     * For SQLite, the database may be added in the decorator metadata. It will be a filepath to a database file.
     */
    buildTableName(tableName: string, _schema?: string, database?: string): string;
    /**
     * Creates connection with the database.
     */
    protected createDatabaseConnection(): Promise<Sqlite3Database>;
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void;
    /**
     * Auto creates database directory if it does not exist.
     */
    protected createDatabaseDirectory(fullPath: string): Promise<void>;
    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    protected attachDatabases(): Promise<void>;
    protected getMainDatabasePath(): string;
}
