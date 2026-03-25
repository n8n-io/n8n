import { DataSource } from "../../data-source/DataSource";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import { ColumnType } from "../types/ColumnTypes";
import { SqlitePooledConnectionOptions } from "./SqlitePooledConnectionOptions";
import { SqliteReadWriteQueryRunner } from "./SqliteReadWriteQueryRunner";
import { SqliteLibrary } from "./SqliteLibrary";
/**
 * Database driver for sqlite that uses sqlite3 npm package and
 * pooled database connections.
 */
export declare class SqliteReadWriteDriver extends AbstractSqliteDriver {
    /**
     * Connection options.
     */
    options: SqlitePooledConnectionOptions;
    queryRunner?: never;
    databaseConnection: never;
    /**
     * SQLite underlying library.
     */
    sqlite: SqliteLibrary["sqlite"];
    /**
     * Represent transaction support by this driver. We intentionally
     * do NOT support nested transactions
     */
    transactionSupport: "simple" | "none";
    /**
     * Pool of read-only connections to the database.
     */
    private readonly readonlyPool;
    /**
     * A single write connection to the database.
     */
    private readonly writeConnection;
    private readonly sqliteLibrary;
    constructor(connection: DataSource);
    /**
     * Performs connection to the database.
     */
    connect(): Promise<void>;
    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void>;
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(): boolean;
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(): SqliteReadWriteQueryRunner;
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
