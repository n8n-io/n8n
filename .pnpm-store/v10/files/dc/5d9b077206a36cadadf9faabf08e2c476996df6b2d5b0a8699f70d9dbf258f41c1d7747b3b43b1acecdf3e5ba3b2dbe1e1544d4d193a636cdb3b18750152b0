import { AbstractSqliteConnectionOptions } from "../sqlite-abstract/AbstractSqliteConnectionOptions";
/**
 * Sqlite-specific connection options.
 */
export interface SqliteConnectionOptions extends AbstractSqliteConnectionOptions {
    /**
     * Database type.
     */
    readonly type: "sqlite";
    /**
     * In your SQLite application when you perform parallel writes its common to face SQLITE_BUSY error.
     * This error indicates that SQLite failed to write to the database file since someone else already writes into it.
     * Since SQLite cannot handle parallel saves this error cannot be avoided.
     *
     * To simplify life's of those who have this error this particular option sets a timeout within which ORM will try
     * to perform requested write operation again and again until it receives SQLITE_BUSY error.
     *
     * Enabling WAL can improve your app performance and face less SQLITE_BUSY issues.
     * Time in milliseconds.
     */
    readonly busyErrorRetry?: number;
    /**
     * Specifies the open file flags. By default its undefined.
     * @see https://www.sqlite.org/c3ref/c_open_autoproxy.html
     * @see https://github.com/TryGhost/node-sqlite3/blob/master/test/open_close.test.js
     */
    readonly flags?: number;
    /**
     * Query or change the setting of the busy timeout.
     * Time in milliseconds.
     *
     * @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
     */
    readonly busyTimeout?: number;
    readonly poolSize?: never;
}
