import type { sqlite3, Database as Sqlite3Database } from "sqlite3";
import { QueryResult } from "../../query-runner/QueryResult";
import { SqlitePooledConnectionOptions } from "./SqlitePooledConnectionOptions";
export type DatabasesMap = Map<string, {
    attachFilepathAbsolute: string;
    attachFilepathRelative: string;
    attachHandle: string;
}>;
/**
 * An adapter to the underlying SQLite library.
 */
export declare class SqliteLibrary {
    private readonly options;
    /**
     * SQLite underlying library.
     */
    sqlite: sqlite3;
    /**
     * Any attached databases (excepting default 'main')
     */
    attachedDatabases: DatabasesMap;
    constructor(options: SqlitePooledConnectionOptions);
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadLibrary(): void;
    /**
     * Creates connection with the database.
     *
     * @param {number} flags Flags, such as SQLITE_OPEN_READONLY, to pass to the sqlite3 database connection
     */
    createDatabaseConnection(flags?: number): Promise<Sqlite3Database>;
    destroyDatabaseConnection(dbConnection: Sqlite3Database): Promise<void>;
    runQuery(databaseConnection: Sqlite3Database, query: string, parameters?: any[], useStructuredResult?: boolean): Promise<QueryResult | any>;
    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    attachDatabases(connection: Sqlite3Database): Promise<void>;
    /**
     * Auto creates database directory if it does not exist.
     */
    private createDatabaseDirectory;
}
