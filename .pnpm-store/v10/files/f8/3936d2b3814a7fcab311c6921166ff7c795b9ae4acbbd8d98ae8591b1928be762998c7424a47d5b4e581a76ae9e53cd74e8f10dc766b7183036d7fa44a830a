"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteLibrary = void 0;
const tslib_1 = require("tslib");
const mkdirp_1 = require("mkdirp");
const path_1 = tslib_1.__importDefault(require("path"));
const DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
const QueryResult_1 = require("../../query-runner/QueryResult");
const QueryFailedError_1 = require("../../error/QueryFailedError");
/**
 * An adapter to the underlying SQLite library.
 */
class SqliteLibrary {
    constructor(options) {
        this.options = options;
        /**
         * Any attached databases (excepting default 'main')
         */
        this.attachedDatabases = new Map();
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadLibrary() {
        try {
            const sqlite = this.options.driver || require("sqlite3");
            this.sqlite = sqlite.verbose();
        }
        catch (e) {
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("SQLite", "sqlite3");
        }
    }
    /**
     * Creates connection with the database.
     *
     * @param {number} flags Flags, such as SQLITE_OPEN_READONLY, to pass to the sqlite3 database connection
     */
    async createDatabaseConnection(flags) {
        if (this.options.flags === undefined ||
            !(this.options.flags & this.sqlite.OPEN_URI)) {
            await this.createDatabaseDirectory(this.options.database);
        }
        const databaseConnection = await new Promise((ok, fail) => {
            if (this.options.flags === undefined && flags === undefined) {
                const connection = new this.sqlite.Database(this.options.database, (err) => {
                    if (err)
                        return fail(err);
                    ok(connection);
                });
            }
            else {
                const connectionFlags = (this.options.flags ?? 0) | (flags ?? 0);
                const connection = new this.sqlite.Database(this.options.database, connectionFlags, (err) => {
                    if (err)
                        return fail(err);
                    ok(connection);
                });
            }
        });
        // Internal function to run a command on the connection and fail if an error occured.
        function run(line) {
            return new Promise((ok, fail) => {
                databaseConnection.run(line, (err) => {
                    if (err)
                        return fail(err);
                    ok();
                });
            });
        }
        // in the options, if encryption key for SQLCipher is setted.
        // Must invoke key pragma before trying to do any other interaction with the database.
        if (this.options.key) {
            await run(`PRAGMA key = ${JSON.stringify(this.options.key)}`);
        }
        if (this.options.enableWAL) {
            await run(`PRAGMA journal_mode = WAL`);
        }
        if (this.options.busyTimeout &&
            typeof this.options.busyTimeout === "number" &&
            this.options.busyTimeout > 0) {
            await run(`PRAGMA busy_timeout = ${this.options.busyTimeout}`);
        }
        // we need to enable foreign keys in sqlite to make sure all foreign key related features
        // working properly. this also makes onDelete to work with sqlite.
        await run(`PRAGMA foreign_keys = ON`);
        await this.attachDatabases(databaseConnection);
        return databaseConnection;
    }
    async destroyDatabaseConnection(dbConnection) {
        return new Promise((resolve, reject) => {
            dbConnection.close((err) => err ? reject(err) : resolve());
        });
    }
    async runQuery(databaseConnection, query, parameters, useStructuredResult = false) {
        return await new Promise((resolve, reject) => {
            try {
                const isInsertQuery = query.startsWith("INSERT ");
                const isDeleteQuery = query.startsWith("DELETE ");
                const isUpdateQuery = query.startsWith("UPDATE ");
                const handler = function (err, rows) {
                    if (err) {
                        return reject(new QueryFailedError_1.QueryFailedError(query, parameters, err));
                    }
                    else {
                        const result = new QueryResult_1.QueryResult();
                        if (isInsertQuery) {
                            result.raw = this["lastID"];
                        }
                        else {
                            result.raw = rows;
                        }
                        if (Array.isArray(rows)) {
                            result.records = rows;
                        }
                        result.affected = this["changes"];
                        if (useStructuredResult) {
                            resolve(result);
                        }
                        else {
                            resolve(result.raw);
                        }
                    }
                };
                if (isInsertQuery || isDeleteQuery || isUpdateQuery) {
                    databaseConnection.run(query, parameters, handler);
                }
                else {
                    databaseConnection.all(query, parameters, handler);
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    async attachDatabases(connection) {
        // @todo - possibly check number of databases (but unqueriable at runtime sadly) - https://www.sqlite.org/limits.html#max_attached
        for (const { attachHandle, attachFilepathAbsolute, } of this.attachedDatabases.values()) {
            await this.createDatabaseDirectory(attachFilepathAbsolute);
            await this.runQuery(connection, `ATTACH "${attachFilepathAbsolute}" AS "${attachHandle}"`);
        }
    }
    /**
     * Auto creates database directory if it does not exist.
     */
    async createDatabaseDirectory(fullPath) {
        await (0, mkdirp_1.mkdirp)(path_1.default.dirname(fullPath));
    }
}
exports.SqliteLibrary = SqliteLibrary;

//# sourceMappingURL=SqliteLibrary.js.map
