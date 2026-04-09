export = Database;
/**
 * Database represents a connection that can prepare and execute SQL statements.
 */
declare class Database {
    /**
     * Creates a new database connection. If the database file pointed to by `path` does not exists, it will be created.
     *
     * @constructor
     * @param {string} path - Path to the database file.
     */
    constructor(path: string, opts: any);
    db: any;
    memory: boolean;
    readonly: boolean;
    name: string;
    open: boolean;
    sync(): any;
    syncUntil(replicationIndex: any): any;
    /**
     * Prepares a SQL statement for execution.
     *
     * @param {string} sql - The SQL statement string to prepare.
     */
    prepare(sql: string): any;
    /**
     * Returns a function that executes the given function in a transaction.
     *
     * @param {function} fn - The function to wrap in a transaction.
     */
    transaction(fn: Function): (...bindParameters: any[]) => Promise<any>;
    pragma(source: any, options: any): any;
    backup(filename: any, options: any): void;
    serialize(options: any): void;
    function(name: any, options: any, fn: any): void;
    aggregate(name: any, options: any): void;
    table(name: any, factory: any): void;
    authorizer(rules: any): void;
    loadExtension(...args: any[]): void;
    maxWriteReplicationIndex(): any;
    /**
     * Executes a SQL statement.
     *
     * @param {string} sql - The SQL statement string to execute.
     */
    exec(sql: string): any;
    /**
     * Interrupts the database connection.
     */
    interrupt(): void;
    /**
     * Closes the database connection.
     */
    close(): void;
    /**
     * Toggle 64-bit integer support.
     */
    defaultSafeIntegers(toggle: any): this;
    unsafeMode(...args: any[]): void;
}
declare namespace Database {
    export { Authorization, SqliteError };
}
import Authorization = require("./auth");
import SqliteError = require("./sqlite-error");
//# sourceMappingURL=promise.d.ts.map