import Database from "libsql";
import { Buffer } from "node:buffer";
import { LibsqlError, LibsqlBatchError } from "@libsql/core/api";
import { expandConfig, isInMemoryConfig } from "@libsql/core/config";
import { supportedUrlLink, transactionModeToBegin, ResultSetImpl, } from "@libsql/core/util";
export * from "@libsql/core/api";
export function createClient(config) {
    return _createClient(expandConfig(config, true));
}
/** @private */
export function _createClient(config) {
    if (config.scheme !== "file") {
        throw new LibsqlError(`URL scheme ${JSON.stringify(config.scheme + ":")} is not supported by the local sqlite3 client. ` +
            `For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
    }
    const authority = config.authority;
    if (authority !== undefined) {
        const host = authority.host.toLowerCase();
        if (host !== "" && host !== "localhost") {
            throw new LibsqlError(`Invalid host in file URL: ${JSON.stringify(authority.host)}. ` +
                'A "file:" URL with an absolute path should start with one slash ("file:/absolute/path.db") ' +
                'or with three slashes ("file:///absolute/path.db"). ' +
                `For more information, please read ${supportedUrlLink}`, "URL_INVALID");
        }
        if (authority.port !== undefined) {
            throw new LibsqlError("File URL cannot have a port", "URL_INVALID");
        }
        if (authority.userinfo !== undefined) {
            throw new LibsqlError("File URL cannot have username and password", "URL_INVALID");
        }
    }
    let isInMemory = isInMemoryConfig(config);
    if (isInMemory && config.syncUrl) {
        throw new LibsqlError(`Embedded replica must use file for local db but URI with in-memory mode were provided instead: ${config.path}`, "URL_INVALID");
    }
    let path = config.path;
    if (isInMemory) {
        // note: we should prepend file scheme in order for SQLite3 to recognize :memory: connection query parameters
        path = `${config.scheme}:${config.path}`;
    }
    const options = {
        authToken: config.authToken,
        encryptionKey: config.encryptionKey,
        remoteEncryptionKey: config.remoteEncryptionKey,
        syncUrl: config.syncUrl,
        syncPeriod: config.syncInterval,
        readYourWrites: config.readYourWrites,
        offline: config.offline,
    };
    const db = new Database(path, options);
    executeStmt(db, "SELECT 1 AS checkThatTheDatabaseCanBeOpened", config.intMode);
    return new Sqlite3Client(path, options, db, config.intMode);
}
export class Sqlite3Client {
    #path;
    #options;
    #db;
    #intMode;
    closed;
    protocol;
    /** @private */
    constructor(path, options, db, intMode) {
        this.#path = path;
        this.#options = options;
        this.#db = db;
        this.#intMode = intMode;
        this.closed = false;
        this.protocol = "file";
    }
    async execute(stmtOrSql, args) {
        let stmt;
        if (typeof stmtOrSql === "string") {
            stmt = {
                sql: stmtOrSql,
                args: args || [],
            };
        }
        else {
            stmt = stmtOrSql;
        }
        this.#checkNotClosed();
        return executeStmt(this.#getDb(), stmt, this.#intMode);
    }
    async batch(stmts, mode = "deferred") {
        this.#checkNotClosed();
        const db = this.#getDb();
        try {
            executeStmt(db, transactionModeToBegin(mode), this.#intMode);
            const resultSets = [];
            for (let i = 0; i < stmts.length; i++) {
                try {
                    if (!db.inTransaction) {
                        throw new LibsqlBatchError("The transaction has been rolled back", i, "TRANSACTION_CLOSED");
                    }
                    const stmt = stmts[i];
                    const normalizedStmt = Array.isArray(stmt)
                        ? { sql: stmt[0], args: stmt[1] || [] }
                        : stmt;
                    resultSets.push(executeStmt(db, normalizedStmt, this.#intMode));
                }
                catch (e) {
                    if (e instanceof LibsqlBatchError) {
                        throw e;
                    }
                    if (e instanceof LibsqlError) {
                        throw new LibsqlBatchError(e.message, i, e.code, e.extendedCode, e.rawCode, e.cause instanceof Error ? e.cause : undefined);
                    }
                    throw e;
                }
            }
            executeStmt(db, "COMMIT", this.#intMode);
            return resultSets;
        }
        finally {
            if (db.inTransaction) {
                executeStmt(db, "ROLLBACK", this.#intMode);
            }
        }
    }
    async migrate(stmts) {
        this.#checkNotClosed();
        const db = this.#getDb();
        try {
            executeStmt(db, "PRAGMA foreign_keys=off", this.#intMode);
            executeStmt(db, transactionModeToBegin("deferred"), this.#intMode);
            const resultSets = [];
            for (let i = 0; i < stmts.length; i++) {
                try {
                    if (!db.inTransaction) {
                        throw new LibsqlBatchError("The transaction has been rolled back", i, "TRANSACTION_CLOSED");
                    }
                    resultSets.push(executeStmt(db, stmts[i], this.#intMode));
                }
                catch (e) {
                    if (e instanceof LibsqlBatchError) {
                        throw e;
                    }
                    if (e instanceof LibsqlError) {
                        throw new LibsqlBatchError(e.message, i, e.code, e.extendedCode, e.rawCode, e.cause instanceof Error ? e.cause : undefined);
                    }
                    throw e;
                }
            }
            executeStmt(db, "COMMIT", this.#intMode);
            return resultSets;
        }
        finally {
            if (db.inTransaction) {
                executeStmt(db, "ROLLBACK", this.#intMode);
            }
            executeStmt(db, "PRAGMA foreign_keys=on", this.#intMode);
        }
    }
    async transaction(mode = "write") {
        const db = this.#getDb();
        executeStmt(db, transactionModeToBegin(mode), this.#intMode);
        this.#db = null; // A new connection will be lazily created on next use
        return new Sqlite3Transaction(db, this.#intMode);
    }
    async executeMultiple(sql) {
        this.#checkNotClosed();
        const db = this.#getDb();
        try {
            return executeMultiple(db, sql);
        }
        finally {
            if (db.inTransaction) {
                executeStmt(db, "ROLLBACK", this.#intMode);
            }
        }
    }
    async sync() {
        this.#checkNotClosed();
        const rep = await this.#getDb().sync();
        return {
            frames_synced: rep.frames_synced,
            frame_no: rep.frame_no,
        };
    }
    async reconnect() {
        try {
            if (!this.closed && this.#db !== null) {
                this.#db.close();
            }
        }
        finally {
            this.#db = new Database(this.#path, this.#options);
            this.closed = false;
        }
    }
    close() {
        this.closed = true;
        if (this.#db !== null) {
            this.#db.close();
            this.#db = null;
        }
    }
    #checkNotClosed() {
        if (this.closed) {
            throw new LibsqlError("The client is closed", "CLIENT_CLOSED");
        }
    }
    // Lazily creates the database connection and returns it
    #getDb() {
        if (this.#db === null) {
            this.#db = new Database(this.#path, this.#options);
        }
        return this.#db;
    }
}
export class Sqlite3Transaction {
    #database;
    #intMode;
    /** @private */
    constructor(database, intMode) {
        this.#database = database;
        this.#intMode = intMode;
    }
    async execute(stmtOrSql, args) {
        let stmt;
        if (typeof stmtOrSql === "string") {
            stmt = {
                sql: stmtOrSql,
                args: args || [],
            };
        }
        else {
            stmt = stmtOrSql;
        }
        this.#checkNotClosed();
        return executeStmt(this.#database, stmt, this.#intMode);
    }
    async batch(stmts) {
        const resultSets = [];
        for (let i = 0; i < stmts.length; i++) {
            try {
                this.#checkNotClosed();
                const stmt = stmts[i];
                const normalizedStmt = Array.isArray(stmt)
                    ? { sql: stmt[0], args: stmt[1] || [] }
                    : stmt;
                resultSets.push(executeStmt(this.#database, normalizedStmt, this.#intMode));
            }
            catch (e) {
                if (e instanceof LibsqlBatchError) {
                    throw e;
                }
                if (e instanceof LibsqlError) {
                    throw new LibsqlBatchError(e.message, i, e.code, e.extendedCode, e.rawCode, e.cause instanceof Error ? e.cause : undefined);
                }
                throw e;
            }
        }
        return resultSets;
    }
    async executeMultiple(sql) {
        this.#checkNotClosed();
        return executeMultiple(this.#database, sql);
    }
    async rollback() {
        if (!this.#database.open) {
            return;
        }
        this.#checkNotClosed();
        executeStmt(this.#database, "ROLLBACK", this.#intMode);
    }
    async commit() {
        this.#checkNotClosed();
        executeStmt(this.#database, "COMMIT", this.#intMode);
    }
    close() {
        if (this.#database.inTransaction) {
            executeStmt(this.#database, "ROLLBACK", this.#intMode);
        }
    }
    get closed() {
        return !this.#database.inTransaction;
    }
    #checkNotClosed() {
        if (this.closed) {
            throw new LibsqlError("The transaction is closed", "TRANSACTION_CLOSED");
        }
    }
}
function executeStmt(db, stmt, intMode) {
    let sql;
    let args;
    if (typeof stmt === "string") {
        sql = stmt;
        args = [];
    }
    else {
        sql = stmt.sql;
        if (Array.isArray(stmt.args)) {
            args = stmt.args.map((value) => valueToSql(value, intMode));
        }
        else {
            args = {};
            for (const name in stmt.args) {
                const argName = name[0] === "@" || name[0] === "$" || name[0] === ":"
                    ? name.substring(1)
                    : name;
                args[argName] = valueToSql(stmt.args[name], intMode);
            }
        }
    }
    try {
        const sqlStmt = db.prepare(sql);
        sqlStmt.safeIntegers(true);
        let returnsData = true;
        try {
            sqlStmt.raw(true);
        }
        catch {
            // raw() throws an exception if the statement does not return data
            returnsData = false;
        }
        if (returnsData) {
            const columns = Array.from(sqlStmt.columns().map((col) => col.name));
            const columnTypes = Array.from(sqlStmt.columns().map((col) => col.type ?? ""));
            const rows = sqlStmt.all(args).map((sqlRow) => {
                return rowFromSql(sqlRow, columns, intMode);
            });
            // TODO: can we get this info from better-sqlite3?
            const rowsAffected = 0;
            const lastInsertRowid = undefined;
            return new ResultSetImpl(columns, columnTypes, rows, rowsAffected, lastInsertRowid);
        }
        else {
            const info = sqlStmt.run(args);
            const rowsAffected = info.changes;
            const lastInsertRowid = BigInt(info.lastInsertRowid);
            return new ResultSetImpl([], [], [], rowsAffected, lastInsertRowid);
        }
    }
    catch (e) {
        throw mapSqliteError(e);
    }
}
function rowFromSql(sqlRow, columns, intMode) {
    const row = {};
    // make sure that the "length" property is not enumerable
    Object.defineProperty(row, "length", { value: sqlRow.length });
    for (let i = 0; i < sqlRow.length; ++i) {
        const value = valueFromSql(sqlRow[i], intMode);
        Object.defineProperty(row, i, { value });
        const column = columns[i];
        if (!Object.hasOwn(row, column)) {
            Object.defineProperty(row, column, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        }
    }
    return row;
}
function valueFromSql(sqlValue, intMode) {
    if (typeof sqlValue === "bigint") {
        if (intMode === "number") {
            if (sqlValue < minSafeBigint || sqlValue > maxSafeBigint) {
                throw new RangeError("Received integer which cannot be safely represented as a JavaScript number");
            }
            return Number(sqlValue);
        }
        else if (intMode === "bigint") {
            return sqlValue;
        }
        else if (intMode === "string") {
            return "" + sqlValue;
        }
        else {
            throw new Error("Invalid value for IntMode");
        }
    }
    else if (sqlValue instanceof Buffer) {
        return sqlValue.buffer;
    }
    return sqlValue;
}
const minSafeBigint = -9007199254740991n;
const maxSafeBigint = 9007199254740991n;
function valueToSql(value, intMode) {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
        }
        return value;
    }
    else if (typeof value === "bigint") {
        if (value < minInteger || value > maxInteger) {
            throw new RangeError("bigint is too large to be represented as a 64-bit integer and passed as argument");
        }
        return value;
    }
    else if (typeof value === "boolean") {
        switch (intMode) {
            case "bigint":
                return value ? 1n : 0n;
            case "string":
                return value ? "1" : "0";
            default:
                return value ? 1 : 0;
        }
    }
    else if (value instanceof ArrayBuffer) {
        return Buffer.from(value);
    }
    else if (value instanceof Date) {
        return value.valueOf();
    }
    else if (value === undefined) {
        throw new TypeError("undefined cannot be passed as argument to the database");
    }
    else {
        return value;
    }
}
const minInteger = -9223372036854775808n;
const maxInteger = 9223372036854775807n;
function executeMultiple(db, sql) {
    try {
        db.exec(sql);
    }
    catch (e) {
        throw mapSqliteError(e);
    }
}
function mapSqliteError(e) {
    if (e instanceof Database.SqliteError) {
        const extendedCode = e.code;
        const code = mapToBaseCode(e.rawCode);
        return new LibsqlError(e.message, code, extendedCode, e.rawCode, e);
    }
    return e;
}
// Map SQLite raw error code to base error code string.
// Extended error codes are (base | (extended << 8)), so base = rawCode & 0xFF
function mapToBaseCode(rawCode) {
    if (rawCode === undefined) {
        return "SQLITE_UNKNOWN";
    }
    const baseCode = rawCode & 0xff;
    return (sqliteErrorCodes[baseCode] ?? `SQLITE_UNKNOWN_${baseCode.toString()}`);
}
const sqliteErrorCodes = {
    1: "SQLITE_ERROR",
    2: "SQLITE_INTERNAL",
    3: "SQLITE_PERM",
    4: "SQLITE_ABORT",
    5: "SQLITE_BUSY",
    6: "SQLITE_LOCKED",
    7: "SQLITE_NOMEM",
    8: "SQLITE_READONLY",
    9: "SQLITE_INTERRUPT",
    10: "SQLITE_IOERR",
    11: "SQLITE_CORRUPT",
    12: "SQLITE_NOTFOUND",
    13: "SQLITE_FULL",
    14: "SQLITE_CANTOPEN",
    15: "SQLITE_PROTOCOL",
    16: "SQLITE_EMPTY",
    17: "SQLITE_SCHEMA",
    18: "SQLITE_TOOBIG",
    19: "SQLITE_CONSTRAINT",
    20: "SQLITE_MISMATCH",
    21: "SQLITE_MISUSE",
    22: "SQLITE_NOLFS",
    23: "SQLITE_AUTH",
    24: "SQLITE_FORMAT",
    25: "SQLITE_RANGE",
    26: "SQLITE_NOTADB",
    27: "SQLITE_NOTICE",
    28: "SQLITE_WARNING",
};
