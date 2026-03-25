"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteReadWriteDriver = void 0;
const tslib_1 = require("tslib");
const mkdirp_1 = require("mkdirp");
const path_1 = tslib_1.__importStar(require("path"));
const AbstractSqliteDriver_1 = require("../sqlite-abstract/AbstractSqliteDriver");
const PathUtils_1 = require("../../util/PathUtils");
const SqliteWriteConnection_1 = require("./SqliteWriteConnection");
const SqliteReadonlyConnectionPool_1 = require("./SqliteReadonlyConnectionPool");
const SqliteReadWriteQueryRunner_1 = require("./SqliteReadWriteQueryRunner");
const SqliteLibrary_1 = require("./SqliteLibrary");
/**
 * Database driver for sqlite that uses sqlite3 npm package and
 * pooled database connections.
 */
class SqliteReadWriteDriver extends AbstractSqliteDriver_1.AbstractSqliteDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
        // -------------------------------------------------------------------------
        // Public Implemented Properties
        // -------------------------------------------------------------------------
        /**
         * Represent transaction support by this driver. We intentionally
         * do NOT support nested transactions
         */
        this.transactionSupport = "simple";
        this.options = connection.options;
        this.sqliteLibrary = new SqliteLibrary_1.SqliteLibrary(this.options);
        // load sqlite package
        this.sqliteLibrary.loadLibrary();
        this.sqlite = this.sqliteLibrary.sqlite;
        this.readonlyPool = new SqliteReadonlyConnectionPool_1.SqliteReadonlyConnectionPool(this.sqliteLibrary, {
            poolSize: this.options.poolSize ?? 4,
            acquireTimeout: this.options.acquireTimeout ?? 60000,
            destroyTimeout: this.options.destroyTimeout ?? 5000,
        });
        this.writeConnection = new SqliteWriteConnection_1.SqliteWriteConnection(this.sqliteLibrary, {
            acquireTimeout: this.options.acquireTimeout ?? 60000,
            destroyTimeout: this.options.destroyTimeout ?? 5000,
        });
    }
    /**
     * Performs connection to the database.
     */
    async connect() {
        // We need to connect the write connection first, as that creates
        // the main database file.
        await this.writeConnection.connect();
        await this.readonlyPool.connect();
    }
    /**
     * Closes connection with database.
     */
    async disconnect() {
        await Promise.all([
            this.readonlyPool.close(),
            this.writeConnection.close(),
        ]);
    }
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported() {
        return false;
    }
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner() {
        return new SqliteReadWriteQueryRunner_1.SqliteReadWriteQueryRunner(this, this.connection, this.sqliteLibrary, this.writeConnection, this.readonlyPool, this.options);
    }
    normalizeType(column) {
        if (column.type === Buffer) {
            return "blob";
        }
        return super.normalizeType(column);
    }
    async afterConnect() {
        return this.attachDatabases();
    }
    /**
     * For SQLite, the database may be added in the decorator metadata. It will be a filepath to a database file.
     */
    buildTableName(tableName, _schema, database) {
        if (!database)
            return tableName;
        if (this.getAttachedDatabaseHandleByRelativePath(database))
            return `${this.getAttachedDatabaseHandleByRelativePath(database)}.${tableName}`;
        if (database === this.options.database)
            return tableName;
        // we use the decorated name as supplied when deriving attach handle (ideally without non-portable absolute path)
        const identifierHash = (0, PathUtils_1.filepathToName)(database);
        // decorated name will be assumed relative to main database file when non absolute. Paths supplied as absolute won't be portable
        const absFilepath = (0, path_1.isAbsolute)(database)
            ? database
            : path_1.default.join(this.getMainDatabasePath(), database);
        this.attachedDatabases[database] = {
            attachFilepathAbsolute: absFilepath,
            attachFilepathRelative: database,
            attachHandle: identifierHash,
        };
        this.sqliteLibrary.attachedDatabases.set(database, {
            attachFilepathAbsolute: absFilepath,
            attachFilepathRelative: database,
            attachHandle: identifierHash,
        });
        return `${identifierHash}.${tableName}`;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Auto creates database directory if it does not exist.
     */
    async createDatabaseDirectory(fullPath) {
        await (0, mkdirp_1.mkdirp)(path_1.default.dirname(fullPath));
    }
    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    async attachDatabases() {
        // @todo - possibly check number of databases (but unqueriable at runtime sadly) - https://www.sqlite.org/limits.html#max_attached
        for await (const { attachHandle, attachFilepathAbsolute, } of Object.values(this.attachedDatabases)) {
            await this.createDatabaseDirectory(attachFilepathAbsolute);
            const queryRunner = this.createQueryRunner();
            try {
                await this.writeConnection.runExclusive(queryRunner, async (dbLease) => {
                    await queryRunner.runQueryWithinConnection(dbLease.connection, `ATTACH "${attachFilepathAbsolute}" AS "${attachHandle}"`);
                });
            }
            finally {
                await queryRunner.release();
            }
        }
    }
    getMainDatabasePath() {
        const optionsDb = this.options.database;
        return path_1.default.dirname((0, path_1.isAbsolute)(optionsDb)
            ? optionsDb
            : path_1.default.join(process.cwd(), optionsDb));
    }
}
exports.SqliteReadWriteDriver = SqliteReadWriteDriver;

//# sourceMappingURL=SqliteReadWriteDriver.js.map
