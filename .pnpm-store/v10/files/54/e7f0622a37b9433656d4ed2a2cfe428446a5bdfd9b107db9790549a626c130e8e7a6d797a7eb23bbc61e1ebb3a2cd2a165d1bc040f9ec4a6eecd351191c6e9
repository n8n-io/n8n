/** Configuration object for {@link createClient}. */
export interface Config {
    /** The database URL.
     *
     * The client supports `libsql:`, `http:`/`https:`, `ws:`/`wss:` and `file:` URL. For more infomation,
     * please refer to the project README:
     *
     * https://github.com/libsql/libsql-client-ts#supported-urls
     */
    url: string;
    /** Authentication token for the database. */
    authToken?: string;
    /** Encryption key for the database. */
    encryptionKey?: string;
    /** Encryption key for encryption in Turso Cloud. */
    remoteEncryptionKey?: string;
    /** URL of a remote server to synchronize database with. */
    syncUrl?: string;
    /** Sync interval in seconds. */
    syncInterval?: number;
    /** Read your writes */
    readYourWrites?: boolean;
    /** Enable offline writes */
    offline?: boolean;
    /** Enables or disables TLS for `libsql:` URLs.
     *
     * By default, `libsql:` URLs use TLS. You can set this option to `false` to disable TLS.
     */
    tls?: boolean;
    /** How to convert SQLite integers to JavaScript values:
     *
     * - `"number"` (default): returns SQLite integers as JavaScript `number`-s (double precision floats).
     * `number` cannot precisely represent integers larger than 2^53-1 in absolute value, so attempting to read
     * larger integers will throw a `RangeError`.
     * - `"bigint"`: returns SQLite integers as JavaScript `bigint`-s (arbitrary precision integers). Bigints can
     * precisely represent all SQLite integers.
     * - `"string"`: returns SQLite integers as strings.
     */
    intMode?: IntMode;
    /** Custom `fetch` function to use for the HTTP client.
     *
     * By default, the HTTP client uses `fetch` from the `@libsql/isomorphic-fetch` package, but you can pass
     * your own function here. The argument to this function will be `Request` from
     * `@libsql/isomorphic-fetch`, and it must return a promise that resolves to an object that is compatible
     * with the Web `Response`.
     */
    fetch?: Function;
    /** Concurrency limit.
     *
     * By default, the client performs up to 20 concurrent requests. You can set this option to a higher
     * number to increase the concurrency limit or set it to 0 to disable concurrency limits completely.
     */
    concurrency?: number | undefined;
}
/** Representation of integers from database as JavaScript values. See {@link Config.intMode}. */
export type IntMode = "number" | "bigint" | "string";
/** Client object for a remote or local database.
 *
 * After you are done with the client, you **should** close it by calling {@link close}.
 */
export interface Client {
    /** Execute a single SQL statement.
     *
     * Every statement executed with this method is executed in its own logical database connection. If you
     * want to execute a group of statements in a transaction, use the {@link batch} or the {@link
     * transaction} methods.
     *
     * ```javascript
     * // execute a statement without arguments
     * const rs = await client.execute("SELECT * FROM books");
     *
     * // execute a statement with positional arguments
     * const rs = await client.execute({
     *     sql: "SELECT * FROM books WHERE author = ?",
     *     args: ["Jane Austen"],
     * });
     *
     * // execute a statement with named arguments
     * const rs = await client.execute({
     *     sql: "SELECT * FROM books WHERE published_at > $year",
     *     args: {year: 1719},
     * });
     * ```
     */
    execute(stmt: InStatement): Promise<ResultSet>;
    execute(sql: string, args?: InArgs): Promise<ResultSet>;
    /** Execute a batch of SQL statements in a transaction.
     *
     * The batch is executed in its own logical database connection and the statements are wrapped in a
     * transaction. This ensures that the batch is applied atomically: either all or no changes are applied.
     *
     * The `mode` parameter selects the transaction mode for the batch; please see {@link TransactionMode} for
     * details. The default transaction mode is `"deferred"`.
     *
     * If any of the statements in the batch fails with an error, the batch is aborted, the transaction is
     * rolled back and the returned promise is rejected.
     *
     * This method provides non-interactive transactions. If you need interactive transactions, please use the
     * {@link transaction} method.
     *
     * ```javascript
     * const rss = await client.batch([
     *     // batch statement without arguments
     *     "DELETE FROM books WHERE name LIKE '%Crusoe'",
     *
     *     // batch statement with positional arguments
     *     {
     *         sql: "INSERT INTO books (name, author, published_at) VALUES (?, ?, ?)",
     *         args: ["First Impressions", "Jane Austen", 1813],
     *     },
     *
     *     // batch statement with named arguments
     *     {
     *         sql: "UPDATE books SET name = $new WHERE name = $old",
     *         args: {old: "First Impressions", new: "Pride and Prejudice"},
     *     },
     * ], "write");
     * ```
     */
    batch(stmts: Array<InStatement | [string, InArgs?]>, mode?: TransactionMode): Promise<Array<ResultSet>>;
    /** Execute a batch of SQL statements in a transaction with PRAGMA foreign_keys=off; before and PRAGMA foreign_keys=on; after.
     *
     * The batch is executed in its own logical database connection and the statements are wrapped in a
     * transaction. This ensures that the batch is applied atomically: either all or no changes are applied.
     *
     * The transaction mode is `"deferred"`.
     *
     * If any of the statements in the batch fails with an error, the batch is aborted, the transaction is
     * rolled back and the returned promise is rejected.
     *
     * ```javascript
     * const rss = await client.migrate([
     *     // statement without arguments
     *     "CREATE TABLE test (a INT)",
     *
     *     // statement with positional arguments
     *     {
     *         sql: "INSERT INTO books (name, author, published_at) VALUES (?, ?, ?)",
     *         args: ["First Impressions", "Jane Austen", 1813],
     *     },
     *
     *     // statement with named arguments
     *     {
     *         sql: "UPDATE books SET name = $new WHERE name = $old",
     *         args: {old: "First Impressions", new: "Pride and Prejudice"},
     *     },
     * ]);
     * ```
     */
    migrate(stmts: Array<InStatement>): Promise<Array<ResultSet>>;
    /** Start an interactive transaction.
     *
     * Interactive transactions allow you to interleave execution of SQL statements with your application
     * logic. They can be used if the {@link batch} method is too restrictive, but please note that
     * interactive transactions have higher latency.
     *
     * The `mode` parameter selects the transaction mode for the interactive transaction; please see {@link
     * TransactionMode} for details. The default transaction mode is `"deferred"`.
     *
     * You **must** make sure that the returned {@link Transaction} object is closed, by calling {@link
     * Transaction.close}, {@link Transaction.commit} or {@link Transaction.rollback}. The best practice is
     * to call {@link Transaction.close} in a `finally` block, as follows:
     *
     * ```javascript
     * const transaction = client.transaction("write");
     * try {
     *     // do some operations with the transaction here
     *     await transaction.execute({
     *         sql: "INSERT INTO books (name, author) VALUES (?, ?)",
     *         args: ["First Impressions", "Jane Austen"],
     *     });
     *     await transaction.execute({
     *         sql: "UPDATE books SET name = ? WHERE name = ?",
     *         args: ["Pride and Prejudice", "First Impressions"],
     *     });
     *
     *     // if all went well, commit the transaction
     *     await transaction.commit();
     * } finally {
     *     // make sure to close the transaction, even if an exception was thrown
     *     transaction.close();
     * }
     * ```
     */
    transaction(mode?: TransactionMode): Promise<Transaction>;
    /** Start an interactive transaction in `"write"` mode.
     *
     * Please see {@link transaction} for details.
     *
     * @deprecated Please specify the `mode` explicitly. The default `"write"` will be removed in the next
     * major release.
     */
    transaction(): Promise<Transaction>;
    /** Execute a sequence of SQL statements separated by semicolons.
     *
     * The statements are executed sequentially on a new logical database connection. If a statement fails,
     * further statements are not executed and this method throws an error. All results from the statements
     * are ignored.
     *
     * We do not wrap the statements in a transaction, but the SQL can contain explicit transaction-control
     * statements such as `BEGIN` and `COMMIT`.
     *
     * This method is intended to be used with existing SQL scripts, such as migrations or small database
     * dumps. If you want to execute a sequence of statements programmatically, please use {@link batch}
     * instead.
     *
     * ```javascript
     * await client.executeMultiple(`
     *     CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL, author_id INTEGER NOT NULL);
     *     CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
     * `);
     * ```
     */
    executeMultiple(sql: string): Promise<void>;
    sync(): Promise<Replicated>;
    /** Close the client and release resources.
     *
     * This method closes the client (aborting any operations that are currently in progress) and releases any
     * resources associated with the client (such as a WebSocket connection).
     */
    close(): void;
    /** Reconnect after the client has been closed.
     */
    reconnect(): void;
    /** Is the client closed?
     *
     * This is set to `true` after a call to {@link close} or if the client encounters an unrecoverable
     * error.
     */
    closed: boolean;
    /** Which protocol does the client use?
     *
     * - `"http"` if the client connects over HTTP
     * - `"ws"` if the client connects over WebSockets
     * - `"file"` if the client works with a local file
     */
    protocol: string;
}
/** Interactive transaction.
 *
 * A transaction groups multiple SQL statements together, so that they are applied atomically: either all
 * changes are applied, or none are. Other SQL statements on the database (including statements executed on
 * the same {@link Client} object outside of this transaction) will not see any changes from the transaction
 * until the transaction is committed by calling {@link commit}. You can also use {@link rollback} to abort
 * the transaction and roll back the changes.
 *
 * You **must** make sure that the {@link Transaction} object is closed, by calling {@link close}, {@link
 * commit} or {@link rollback}. The best practice is to call {@link close} in a `finally` block, as follows:
 *
 * ```javascript
 * const transaction = client.transaction("write");
 * try {
 *     // do some operations with the transaction here
 *     await transaction.execute({
 *         sql: "INSERT INTO books (name, author) VALUES (?, ?)",
 *         args: ["First Impressions", "Jane Austen"],
 *     });
 *     await transaction.execute({
 *         sql: "UPDATE books SET name = ? WHERE name = ?",
 *         args: ["Pride and Prejudice", "First Impressions"],
 *     });
 *
 *     // if all went well, commit the transaction
 *     await transaction.commit();
 * } finally {
 *     // make sure to close the transaction, even if an exception was thrown
 *     transaction.close();
 * }
 * ```
 */
export interface Transaction {
    /** Execute an SQL statement in this transaction.
     *
     * If the statement makes any changes to the database, these changes won't be visible to statements
     * outside of this transaction until you call {@link rollback}.
     *
     * ```javascript
     * await transaction.execute({
     *     sql: "INSERT INTO books (name, author) VALUES (?, ?)",
     *     args: ["First Impressions", "Jane Austen"],
     * });
     * ```
     */
    execute(stmt: InStatement): Promise<ResultSet>;
    /** Execute a batch of SQL statements in this transaction.
     *
     * If any of the statements in the batch fails with an error, further statements are not executed and the
     * returned promise is rejected with an error, but the transaction is not rolled back.
     */
    batch(stmts: Array<InStatement>): Promise<Array<ResultSet>>;
    /** Execute a sequence of SQL statements separated by semicolons.
     *
     * The statements are executed sequentially in the transaction. If a statement fails, further statements
     * are not executed and this method throws an error, but the transaction won't be rolled back. All results
     * from the statements are ignored.
     *
     * This method is intended to be used with existing SQL scripts, such as migrations or small database
     * dumps. If you want to execute statements programmatically, please use {@link batch} instead.
     */
    executeMultiple(sql: string): Promise<void>;
    /** Roll back any changes from this transaction.
     *
     * This method closes the transaction and undoes any changes done by the previous SQL statements on this
     * transaction. You cannot call this method after calling {@link commit}, though.
     */
    rollback(): Promise<void>;
    /** Commit changes from this transaction to the database.
     *
     * This method closes the transaction and applies all changes done by the previous SQL statement on this
     * transaction. Once the returned promise is resolved successfully, the database guarantees that the
     * changes were applied.
     */
    commit(): Promise<void>;
    /** Close the transaction.
     *
     * This method closes the transaction and releases any resources associated with the transaction. If the
     * transaction is already closed (perhaps by a previous call to {@link commit} or {@link rollback}), then
     * this method does nothing.
     *
     * If the transaction wasn't already committed by calling {@link commit}, the transaction is rolled
     * back.
     */
    close(): void;
    /** Is the transaction closed?
     *
     * This is set to `true` after a call to {@link close}, {@link commit} or {@link rollback}, or if we
     * encounter an unrecoverable error.
     */
    closed: boolean;
}
/** Transaction mode.
 *
 * The client supports multiple modes for transactions:
 *
 * - `"write"` is a read-write transaction, started with `BEGIN IMMEDIATE`. This transaction mode supports
 * both read statements (`SELECT`) and write statements (`INSERT`, `UPDATE`, `CREATE TABLE`, etc). The libSQL
 * server cannot process multiple write transactions concurrently, so if there is another write transaction
 * already started, our transaction will wait in a queue before it can begin.
 *
 * - `"read"` is a read-only transaction, started with `BEGIN TRANSACTION READONLY` (a libSQL extension). This
 * transaction mode supports only reads (`SELECT`) and will not accept write statements. The libSQL server can
 * handle multiple read transactions at the same time, so we don't need to wait for other transactions to
 * complete. A read-only transaction can also be executed on a local replica, so it provides lower latency.
 *
 * - `"deferred"` is a transaction started with `BEGIN DEFERRED`, which starts as a read transaction, but the
 * first write statement will try to upgrade it to a write transaction. However, this upgrade may fail if
 * there already is a write transaction executing on the server, so you should be ready to handle these
 * failures.
 *
 * If your transaction includes only read statements, `"read"` is always preferred over `"deferred"` or
 * `"write"`, because `"read"` transactions can be executed more efficiently and don't block other
 * transactions.
 *
 * If your transaction includes both read and write statements, you should be using the `"write"` mode most of
 * the time. Use the `"deferred"` mode only if you prefer to fail the write transaction instead of waiting for
 * the previous write transactions to complete.
 */
export type TransactionMode = "write" | "read" | "deferred";
/** Result of executing an SQL statement.
 *
 * ```javascript
 * const rs = await client.execute("SELECT name, title FROM books");
 * console.log(`Found ${rs.rows.length} books`);
 * for (const row in rs.rows) {
 *     console.log(`Book ${row[0]} by ${row[1]}`);
 * }
 *
 * const rs = await client.execute("DELETE FROM books WHERE author = 'Jane Austen'");
 * console.log(`Deleted ${rs.rowsAffected} books`);
 * ```
 */
export interface ResultSet {
    /** Names of columns.
     *
     * Names of columns can be defined using the `AS` keyword in SQL:
     *
     * ```sql
     * SELECT author AS author, COUNT(*) AS count FROM books GROUP BY author
     * ```
     */
    columns: Array<string>;
    /** Types of columns.
     *
     * The types are currently shown for types declared in a SQL table. For
     * column types of function calls, for example, an empty string is
     * returned.
     */
    columnTypes: Array<string>;
    /** Rows produced by the statement. */
    rows: Array<Row>;
    /** Number of rows that were affected by an UPDATE, INSERT or DELETE operation.
     *
     * This value is not specified for other SQL statements.
     */
    rowsAffected: number;
    /** ROWID of the last inserted row.
     *
     * This value is not specified if the SQL statement was not an INSERT or if the table was not a ROWID
     * table.
     */
    lastInsertRowid: bigint | undefined;
    /** Converts the result set to JSON.
     *
     * This is used automatically by `JSON.stringify()`, but you can also call it explicitly.
     */
    toJSON(): any;
}
/** Row returned from an SQL statement.
 *
 * The row object can be used as an `Array` or as an object:
 *
 * ```javascript
 * const rs = await client.execute("SELECT name, title FROM books");
 * for (const row in rs.rows) {
 *     // Get the value from column `name`
 *     console.log(row.name);
 *     // Get the value from second column (`title`)
 *     console.log(row[1]);
 * }
 * ```
 */
export interface Row {
    /** Number of columns in this row.
     *
     * All rows in one {@link ResultSet} have the same number and names of columns.
     */
    length: number;
    /** Columns can be accessed like an array by numeric indexes. */
    [index: number]: Value;
    /** Columns can be accessed like an object by column names. */
    [name: string]: Value;
}
export type Replicated = {
    frame_no: number;
    frames_synced: number;
} | undefined;
export type Value = null | string | number | bigint | ArrayBuffer;
export type InValue = Value | boolean | Uint8Array | Date;
export type InStatement = {
    sql: string;
    args?: InArgs;
} | string;
export type InArgs = Array<InValue> | Record<string, InValue>;
/** Error thrown by the client. */
export declare class LibsqlError extends Error {
    /** Machine-readable error code. */
    code: string;
    /** Extended error code with more specific information (e.g., SQLITE_CONSTRAINT_PRIMARYKEY). */
    extendedCode?: string;
    /** Raw numeric error code */
    rawCode?: number;
    constructor(message: string, code: string, extendedCode?: string, rawCode?: number, cause?: Error);
}
/** Error thrown by the client during batch operations. */
export declare class LibsqlBatchError extends LibsqlError {
    /** The zero-based index of the statement that failed in the batch. */
    statementIndex: number;
    constructor(message: string, statementIndex: number, code: string, extendedCode?: string, rawCode?: number, cause?: Error);
}
