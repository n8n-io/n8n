"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteDriver = void 0;
const tslib_1 = require("tslib");
const mkdirp_1 = tslib_1.__importDefault(require("mkdirp"));
const path_1 = tslib_1.__importDefault(require("path"));
const DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
const SqliteQueryRunner_1 = require("./SqliteQueryRunner");
const AbstractSqliteDriver_1 = require("../sqlite-abstract/AbstractSqliteDriver");
const PathUtils_1 = require("../../util/PathUtils");
/**
 * Organizes communication with sqlite DBMS.
 */
class SqliteDriver extends AbstractSqliteDriver_1.AbstractSqliteDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        super(connection);
        this.connection = connection;
        this.options = connection.options;
        this.database = this.options.database;
        // load sqlite package
        this.loadDependencies();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Closes connection with database.
     */
    async disconnect() {
        return new Promise((ok, fail) => {
            this.queryRunner = undefined;
            this.databaseConnection.close((err) => err ? fail(err) : ok());
        });
    }
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode) {
        if (!this.queryRunner)
            this.queryRunner = new SqliteQueryRunner_1.SqliteQueryRunner(this);
        return this.queryRunner;
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
        const absFilepath = (0, PathUtils_1.isAbsolute)(database)
            ? database
            : path_1.default.join(this.getMainDatabasePath(), database);
        this.attachedDatabases[database] = {
            attachFilepathAbsolute: absFilepath,
            attachFilepathRelative: database,
            attachHandle: identifierHash,
        };
        return `${identifierHash}.${tableName}`;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    async createDatabaseConnection() {
        if (this.options.flags === undefined ||
            !(this.options.flags & this.sqlite.OPEN_URI)) {
            await this.createDatabaseDirectory(this.options.database);
        }
        const databaseConnection = await new Promise((ok, fail) => {
            if (this.options.flags === undefined) {
                const connection = new this.sqlite.Database(this.options.database, (err) => {
                    if (err)
                        return fail(err);
                    ok(connection);
                });
            }
            else {
                const connection = new this.sqlite.Database(this.options.database, this.options.flags, (err) => {
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
        return databaseConnection;
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadDependencies() {
        try {
            const sqlite = this.options.driver || require("sqlite3");
            this.sqlite = sqlite.verbose();
        }
        catch (e) {
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("SQLite", "sqlite3");
        }
    }
    /**
     * Auto creates database directory if it does not exist.
     */
    async createDatabaseDirectory(fullPath) {
        await (0, mkdirp_1.default)(path_1.default.dirname(fullPath));
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
            await this.connection.query(`ATTACH "${attachFilepathAbsolute}" AS "${attachHandle}"`);
        }
    }
    getMainDatabasePath() {
        const optionsDb = this.options.database;
        return path_1.default.dirname((0, PathUtils_1.isAbsolute)(optionsDb)
            ? optionsDb
            : path_1.default.join(process.cwd(), optionsDb));
    }
}
exports.SqliteDriver = SqliteDriver;

//# sourceMappingURL=SqliteDriver.js.map
