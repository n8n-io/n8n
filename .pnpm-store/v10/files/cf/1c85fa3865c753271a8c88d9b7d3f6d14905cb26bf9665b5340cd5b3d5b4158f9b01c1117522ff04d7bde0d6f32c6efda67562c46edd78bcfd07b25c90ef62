import { BaseDataSourceOptions } from "../../data-source/BaseDataSourceOptions";
export interface AbstractSqliteConnectionOptions extends BaseDataSourceOptions {
    /**
     * Database type.
     */
    readonly type: "sqlite" | "sqlite-pooled";
    /**
     * Storage type or path to the storage.
     */
    readonly database: string;
    /**
     * The driver object
     * This defaults to require("sqlite3")
     */
    readonly driver?: any;
    /**
     * Encryption key for for SQLCipher.
     */
    readonly key?: string;
    /**
     * Enables WAL mode. By default its disabled.
     *
     * @see https://www.sqlite.org/wal.html
     */
    readonly enableWAL?: boolean;
}
