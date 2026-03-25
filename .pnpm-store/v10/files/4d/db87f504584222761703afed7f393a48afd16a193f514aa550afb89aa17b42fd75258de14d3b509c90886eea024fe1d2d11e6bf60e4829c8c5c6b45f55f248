"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysqlDriver = void 0;
const ConnectionIsNotSetError_1 = require("../../error/ConnectionIsNotSetError");
const DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
const DriverUtils_1 = require("../DriverUtils");
const MysqlQueryRunner_1 = require("./MysqlQueryRunner");
const DateUtils_1 = require("../../util/DateUtils");
const RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
const OrmUtils_1 = require("../../util/OrmUtils");
const ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
const error_1 = require("../../error");
const VersionUtils_1 = require("../../util/VersionUtils");
const InstanceChecker_1 = require("../../util/InstanceChecker");
/**
 * Organizes communication with MySQL DBMS.
 */
class MysqlDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        /**
         * Indicates if replication is enabled.
         */
        this.isReplicated = false;
        /**
         * Indicates if tree tables are supported by this driver.
         */
        this.treeSupport = true;
        /**
         * Represent transaction support by this driver
         */
        this.transactionSupport = "nested";
        /**
         * Gets list of supported column data types by a driver.
         *
         * @see https://www.tutorialspoint.com/mysql/mysql-data-types.htm
         * @see https://dev.mysql.com/doc/refman/8.0/en/data-types.html
         */
        this.supportedDataTypes = [
            // numeric types
            "bit",
            "int",
            "integer", // synonym for int
            "tinyint",
            "smallint",
            "mediumint",
            "bigint",
            "float",
            "double",
            "double precision", // synonym for double
            "real", // synonym for double
            "decimal",
            "dec", // synonym for decimal
            "numeric", // synonym for decimal
            "fixed", // synonym for decimal
            "bool", // synonym for tinyint
            "boolean", // synonym for tinyint
            // date and time types
            "date",
            "datetime",
            "timestamp",
            "time",
            "year",
            // string types
            "char",
            "nchar", // synonym for national char
            "national char",
            "varchar",
            "nvarchar", // synonym for national varchar
            "national varchar",
            "blob",
            "text",
            "tinyblob",
            "tinytext",
            "mediumblob",
            "mediumtext",
            "longblob",
            "longtext",
            "enum",
            "set",
            "binary",
            "varbinary",
            // json data type
            "json",
            // spatial data types
            "geometry",
            "point",
            "linestring",
            "polygon",
            "multipoint",
            "multilinestring",
            "multipolygon",
            "geometrycollection",
            // additional data types for mariadb
            "uuid",
            "inet4",
            "inet6",
        ];
        /**
         * Returns type of upsert supported by driver if any
         */
        this.supportedUpsertTypes = ["on-duplicate-key-update"];
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [
            "geometry",
            "point",
            "linestring",
            "polygon",
            "multipoint",
            "multilinestring",
            "multipolygon",
            "geometrycollection",
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "char",
            "varchar",
            "nvarchar",
            "binary",
            "varbinary",
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withWidthColumnTypes = [
            "bit",
            "tinyint",
            "smallint",
            "mediumint",
            "int",
            "integer",
            "bigint",
        ];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "float",
            "double",
            "double precision",
            "real",
            "time",
            "datetime",
            "timestamp",
        ];
        /**
         * Gets list of column data types that supports scale by a driver.
         */
        this.withScaleColumnTypes = [
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "float",
            "double",
            "double precision",
            "real",
        ];
        /**
         * Gets list of column data types that supports UNSIGNED and ZEROFILL attributes.
         */
        this.unsignedAndZerofillTypes = [
            "int",
            "integer",
            "smallint",
            "tinyint",
            "mediumint",
            "bigint",
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "float",
            "double",
            "double precision",
            "real",
        ];
        /**
         * ORM has special columns and we need to know what database column types should be for those columns.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "datetime",
            createDatePrecision: 6,
            createDateDefault: "CURRENT_TIMESTAMP(6)",
            updateDate: "datetime",
            updateDatePrecision: 6,
            updateDateDefault: "CURRENT_TIMESTAMP(6)",
            deleteDate: "datetime",
            deleteDatePrecision: 6,
            deleteDateNullable: true,
            version: "int",
            treeLevel: "int",
            migrationId: "int",
            migrationName: "varchar",
            migrationTimestamp: "bigint",
            cacheId: "int",
            cacheIdentifier: "varchar",
            cacheTime: "bigint",
            cacheDuration: "int",
            cacheQuery: "text",
            cacheResult: "text",
            metadataType: "varchar",
            metadataDatabase: "varchar",
            metadataSchema: "varchar",
            metadataTable: "varchar",
            metadataName: "varchar",
            metadataValue: "text",
        };
        /**
         * Default values of length, precision and scale depends on column data type.
         * Used in the cases when length/precision/scale is not specified by user.
         */
        this.dataTypeDefaults = {
            varchar: { length: 255 },
            nvarchar: { length: 255 },
            "national varchar": { length: 255 },
            char: { length: 1 },
            binary: { length: 1 },
            varbinary: { length: 255 },
            decimal: { precision: 10, scale: 0 },
            dec: { precision: 10, scale: 0 },
            numeric: { precision: 10, scale: 0 },
            fixed: { precision: 10, scale: 0 },
            float: { precision: 12 },
            double: { precision: 22 },
            time: { precision: 0 },
            datetime: { precision: 0 },
            timestamp: { precision: 0 },
            bit: { width: 1 },
            int: { width: 11 },
            integer: { width: 11 },
            tinyint: { width: 4 },
            smallint: { width: 6 },
            mediumint: { width: 9 },
            bigint: { width: 20 },
        };
        /**
         * Max length allowed by MySQL for aliases.
         * @see https://dev.mysql.com/doc/refman/5.5/en/identifiers.html
         */
        this.maxAliasLength = 63;
        this.cteCapabilities = {
            enabled: false,
            requiresRecursiveHint: true,
        };
        /**
         * Supported returning types
         */
        this._isReturningSqlSupported = {
            delete: false,
            insert: false,
            update: false,
        };
        /** MariaDB supports uuid type for version 10.7.0 and up */
        this.uuidColumnTypeSuported = false;
        this.connection = connection;
        this.options = {
            legacySpatialSupport: true,
            ...connection.options,
        };
        this.isReplicated = this.options.replication ? true : false;
        // load mysql package
        this.loadDependencies();
        this.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options.replication
            ? this.options.replication.master
            : this.options).database;
        // validate options to make sure everything is set
        // todo: revisit validation with replication in mind
        // if (!(this.options.host || (this.options.extra && this.options.extra.socketPath)) && !this.options.socketPath)
        //     throw new DriverOptionNotSetError("socketPath and host");
        // if (!this.options.username)
        //     throw new DriverOptionNotSetError("username");
        // if (!this.options.database)
        //     throw new DriverOptionNotSetError("database");
        // todo: check what is going on when connection is setup without database and how to connect to a database then?
        // todo: provide options to auto-create a database if it does not exist yet
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    async connect() {
        if (this.options.replication) {
            this.poolCluster = this.mysql.createPoolCluster(this.options.replication);
            this.options.replication.slaves.forEach((slave, index) => {
                this.poolCluster.add("SLAVE" + index, this.createConnectionOptions(this.options, slave));
            });
            this.poolCluster.add("MASTER", this.createConnectionOptions(this.options, this.options.replication.master));
        }
        else {
            this.pool = await this.createPool(this.createConnectionOptions(this.options, this.options));
        }
        if (!this.database) {
            const queryRunner = await this.createQueryRunner("master");
            this.database = await queryRunner.getCurrentDatabase();
            await queryRunner.release();
        }
        const queryRunner = this.createQueryRunner("master");
        const result = await queryRunner.query(`SELECT VERSION() AS \`version\``);
        const dbVersion = result[0].version;
        this.version = dbVersion;
        await queryRunner.release();
        if (this.options.type === "mariadb") {
            if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "10.0.5")) {
                this._isReturningSqlSupported.delete = true;
            }
            if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "10.5.0")) {
                this._isReturningSqlSupported.insert = true;
            }
            if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "10.2.0")) {
                this.cteCapabilities.enabled = true;
            }
            if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "10.7.0")) {
                this.uuidColumnTypeSuported = true;
            }
        }
        else if (this.options.type === "mysql") {
            if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "8.0.0")) {
                this.cteCapabilities.enabled = true;
            }
        }
    }
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect() {
        return Promise.resolve();
    }
    /**
     * Closes connection with the database.
     */
    async disconnect() {
        if (!this.poolCluster && !this.pool)
            return Promise.reject(new ConnectionIsNotSetError_1.ConnectionIsNotSetError("mysql"));
        if (this.poolCluster) {
            return new Promise((ok, fail) => {
                this.poolCluster.end((err) => (err ? fail(err) : ok()));
                this.poolCluster = undefined;
            });
        }
        if (this.pool) {
            return new Promise((ok, fail) => {
                this.pool.end((err) => {
                    if (err)
                        return fail(err);
                    this.pool = undefined;
                    ok();
                });
            });
        }
    }
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder() {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    }
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode) {
        return new MysqlQueryRunner_1.MysqlQueryRunner(this, mode);
    }
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql, parameters, nativeParameters) {
        const escapedParameters = Object.keys(nativeParameters).map((key) => nativeParameters[key]);
        if (!parameters || !Object.keys(parameters).length)
            return [sql, escapedParameters];
        sql = sql.replace(/:(\.\.\.)?([A-Za-z0-9_.]+)/g, (full, isArray, key) => {
            if (!parameters.hasOwnProperty(key)) {
                return full;
            }
            let value = parameters[key];
            if (isArray) {
                return value
                    .map((v) => {
                    escapedParameters.push(v);
                    return this.createParameter(key, escapedParameters.length - 1);
                })
                    .join(", ");
            }
            if (typeof value === "function") {
                return value();
            }
            escapedParameters.push(value);
            return this.createParameter(key, escapedParameters.length - 1);
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters];
    }
    /**
     * Escapes a column name.
     */
    escape(columnName) {
        return "`" + columnName + "`";
    }
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    buildTableName(tableName, schema, database) {
        let tablePath = [tableName];
        if (database) {
            tablePath.unshift(database);
        }
        return tablePath.join(".");
    }
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    parseTableName(target) {
        const driverDatabase = this.database;
        const driverSchema = undefined;
        if (InstanceChecker_1.InstanceChecker.isTable(target) || InstanceChecker_1.InstanceChecker.isView(target)) {
            const parsed = this.parseTableName(target.name);
            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName,
            };
        }
        if (InstanceChecker_1.InstanceChecker.isTableForeignKey(target)) {
            const parsed = this.parseTableName(target.referencedTableName);
            return {
                database: target.referencedDatabase ||
                    parsed.database ||
                    driverDatabase,
                schema: target.referencedSchema || parsed.schema || driverSchema,
                tableName: parsed.tableName,
            };
        }
        if (InstanceChecker_1.InstanceChecker.isEntityMetadata(target)) {
            // EntityMetadata tableName is never a path
            return {
                database: target.database || driverDatabase,
                schema: target.schema || driverSchema,
                tableName: target.tableName,
            };
        }
        const parts = target.split(".");
        return {
            database: (parts.length > 1 ? parts[0] : undefined) || driverDatabase,
            schema: driverSchema,
            tableName: parts.length > 1 ? parts[1] : parts[0],
        };
    }
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            return DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            return DateUtils_1.DateUtils.mixedDateToTimeString(value);
        }
        else if (columnMetadata.type === "json") {
            return JSON.stringify(value);
        }
        else if (columnMetadata.type === "timestamp" ||
            columnMetadata.type === "datetime" ||
            columnMetadata.type === Date) {
            return DateUtils_1.DateUtils.mixedDateToDate(value);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils_1.DateUtils.simpleJsonToString(value);
        }
        else if (columnMetadata.type === "enum" ||
            columnMetadata.type === "simple-enum") {
            return "" + value;
        }
        else if (columnMetadata.type === "set") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === Number) {
            // convert to number if number
            value = !isNaN(+value) ? parseInt(value) : value;
        }
        return value;
    }
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer
                ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value)
                : value;
        if (columnMetadata.type === Boolean ||
            columnMetadata.type === "bool" ||
            columnMetadata.type === "boolean") {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime" ||
            columnMetadata.type === Date) {
            value = DateUtils_1.DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "json") {
            value = typeof value === "string" ? JSON.parse(value) : value;
        }
        else if (columnMetadata.type === "time") {
            value = DateUtils_1.DateUtils.mixedTimeToString(value);
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-json") {
            value = DateUtils_1.DateUtils.stringToSimpleJson(value);
        }
        else if ((columnMetadata.type === "enum" ||
            columnMetadata.type === "simple-enum") &&
            columnMetadata.enum &&
            !isNaN(value) &&
            columnMetadata.enum.indexOf(parseInt(value)) >= 0) {
            // convert to number if that exists in possible enum options
            value = parseInt(value);
        }
        else if (columnMetadata.type === "set") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === Number) {
            // convert to number if number
            value = !isNaN(+value) ? parseInt(value) : value;
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    }
    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column) {
        if (column.type === Number || column.type === "integer") {
            return "int";
        }
        else if (column.type === String) {
            return "varchar";
        }
        else if (column.type === Date) {
            return "datetime";
        }
        else if (column.type === Buffer) {
            return "blob";
        }
        else if (column.type === Boolean) {
            return "tinyint";
        }
        else if (column.type === "uuid" && !this.uuidColumnTypeSuported) {
            return "varchar";
        }
        else if (column.type === "json" &&
            this.options.type === "mariadb" &&
            !VersionUtils_1.VersionUtils.isGreaterOrEqual(this.version ?? "0.0.0", "10.4.3")) {
            /*
             * MariaDB implements this as a LONGTEXT rather, as the JSON data type contradicts the SQL standard,
             * and MariaDB's benchmarks indicate that performance is at least equivalent.
             *
             * @see https://mariadb.com/kb/en/json-data-type/
             * if Version is 10.4.3 or greater, JSON is an alias for longtext and an automatic check_json(column) constraint is added
             */
            return "longtext";
        }
        else if (column.type === "simple-array" ||
            column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "enum";
        }
        else if (column.type === "double precision" ||
            column.type === "real") {
            return "double";
        }
        else if (column.type === "dec" ||
            column.type === "numeric" ||
            column.type === "fixed") {
            return "decimal";
        }
        else if (column.type === "bool" || column.type === "boolean") {
            return "tinyint";
        }
        else if (column.type === "nvarchar" ||
            column.type === "national varchar") {
            return "varchar";
        }
        else if (column.type === "nchar" || column.type === "national char") {
            return "char";
        }
        else {
            return column.type || "";
        }
    }
    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata) {
        const defaultValue = columnMetadata.default;
        if (defaultValue === null) {
            return undefined;
        }
        if ((columnMetadata.type === "enum" ||
            columnMetadata.type === "simple-enum" ||
            typeof defaultValue === "string") &&
            defaultValue !== undefined) {
            return `'${defaultValue}'`;
        }
        if (columnMetadata.type === "set" && defaultValue !== undefined) {
            return `'${DateUtils_1.DateUtils.simpleArrayToString(defaultValue)}'`;
        }
        if (typeof defaultValue === "number") {
            return `'${defaultValue.toFixed(columnMetadata.scale)}'`;
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "1" : "0";
        }
        if (typeof defaultValue === "function") {
            const value = defaultValue();
            return this.normalizeDatetimeFunction(value);
        }
        if (defaultValue === undefined) {
            return undefined;
        }
        return `${defaultValue}`;
    }
    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column) {
        return column.entityMetadata.indices.some((idx) => idx.isUnique &&
            idx.columns.length === 1 &&
            idx.columns[0] === column);
    }
    /**
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column) {
        if (column.length)
            return column.length.toString();
        /**
         * fix https://github.com/typeorm/typeorm/issues/1139
         * note that if the db did support uuid column type it wouldn't have been defaulted to varchar
         */
        if (column.generationStrategy === "uuid" &&
            !this.uuidColumnTypeSuported)
            return "36";
        switch (column.type) {
            case String:
            case "varchar":
            case "nvarchar":
            case "national varchar":
                return "255";
            case "varbinary":
                return "255";
            default:
                return "";
        }
    }
    /**
     * Creates column type definition including length, precision and scale
     */
    createFullType(column) {
        let type = column.type;
        // used 'getColumnLength()' method, because MySQL requires column length for `varchar`, `nvarchar` and `varbinary` data types
        if (this.getColumnLength(column)) {
            type += `(${this.getColumnLength(column)})`;
        }
        else if (column.width) {
            type += `(${column.width})`;
        }
        else if (column.precision !== null &&
            column.precision !== undefined &&
            column.scale !== null &&
            column.scale !== undefined) {
            type += `(${column.precision},${column.scale})`;
        }
        else if (column.precision !== null &&
            column.precision !== undefined) {
            type += `(${column.precision})`;
        }
        if (column.isArray)
            type += " array";
        return type;
    }
    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection() {
        return new Promise((ok, fail) => {
            if (this.poolCluster) {
                this.poolCluster.getConnection("MASTER", (err, dbConnection) => {
                    err
                        ? fail(err)
                        : ok(this.prepareDbConnection(dbConnection));
                });
            }
            else if (this.pool) {
                this.pool.getConnection((err, dbConnection) => {
                    err ? fail(err) : ok(this.prepareDbConnection(dbConnection));
                });
            }
            else {
                fail(new error_1.TypeORMError(`Connection is not established with mysql database`));
            }
        });
    }
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection() {
        if (!this.poolCluster)
            return this.obtainMasterConnection();
        return new Promise((ok, fail) => {
            this.poolCluster.getConnection("SLAVE*", (err, dbConnection) => {
                err ? fail(err) : ok(this.prepareDbConnection(dbConnection));
            });
        });
    }
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata, insertResult, entityIndex) {
        if (!insertResult) {
            return undefined;
        }
        if (insertResult.insertId === undefined) {
            return Object.keys(insertResult).reduce((map, key) => {
                const column = metadata.findColumnWithDatabaseName(key);
                if (column) {
                    OrmUtils_1.OrmUtils.mergeDeep(map, column.createValueMap(insertResult[key]));
                    // OrmUtils.mergeDeep(map, column.createValueMap(this.prepareHydratedValue(insertResult[key], column))); // TODO: probably should be like there, but fails on enums, fix later
                }
                return map;
            }, {});
        }
        const generatedMap = metadata.generatedColumns.reduce((map, generatedColumn) => {
            let value;
            if (generatedColumn.generationStrategy === "increment" &&
                insertResult.insertId) {
                // NOTE: When multiple rows is inserted by a single INSERT statement,
                // `insertId` is the value generated for the first inserted row only.
                value = insertResult.insertId + entityIndex;
                // } else if (generatedColumn.generationStrategy === "uuid") {
                //     console.log("getting db value:", generatedColumn.databaseName);
                //     value = generatedColumn.getEntityValue(uuidMap);
            }
            return OrmUtils_1.OrmUtils.mergeDeep(map, generatedColumn.createValueMap(value));
        }, {});
        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
    }
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns, columnMetadatas) {
        return columnMetadatas.filter((columnMetadata) => {
            const tableColumn = tableColumns.find((c) => c.name === columnMetadata.databaseName);
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            const isColumnChanged = tableColumn.name !== columnMetadata.databaseName ||
                this.isColumnDataTypeChanged(tableColumn, columnMetadata) ||
                tableColumn.length !== this.getColumnLength(columnMetadata) ||
                tableColumn.width !== columnMetadata.width ||
                (columnMetadata.precision !== undefined &&
                    tableColumn.precision !== columnMetadata.precision) ||
                (columnMetadata.scale !== undefined &&
                    tableColumn.scale !== columnMetadata.scale) ||
                tableColumn.zerofill !== columnMetadata.zerofill ||
                tableColumn.unsigned !== columnMetadata.unsigned ||
                tableColumn.asExpression !== columnMetadata.asExpression ||
                tableColumn.generatedType !== columnMetadata.generatedType ||
                tableColumn.comment !==
                    this.escapeComment(columnMetadata.comment) ||
                !this.compareDefaultValues(this.normalizeDefault(columnMetadata), tableColumn.default) ||
                (tableColumn.enum &&
                    columnMetadata.enum &&
                    !OrmUtils_1.OrmUtils.isArraysEqual(tableColumn.enum, columnMetadata.enum.map((val) => val + ""))) ||
                tableColumn.onUpdate !==
                    this.normalizeDatetimeFunction(columnMetadata.onUpdate) ||
                tableColumn.isPrimary !== columnMetadata.isPrimary ||
                !this.compareNullableValues(columnMetadata, tableColumn) ||
                tableColumn.isUnique !==
                    this.normalizeIsUnique(columnMetadata) ||
                (columnMetadata.generationStrategy !== "uuid" &&
                    tableColumn.isGenerated !== columnMetadata.isGenerated);
            // DEBUG SECTION
            // if (isColumnChanged) {
            //     console.log("table:", columnMetadata.entityMetadata.tableName)
            //     console.log(
            //         "name:",
            //         tableColumn.name,
            //         columnMetadata.databaseName,
            //     )
            //     console.log(
            //         "type:",
            //         tableColumn.type,
            //         this.normalizeType(columnMetadata),
            //     )
            //     console.log(
            //         "length:",
            //         tableColumn.length,
            //         columnMetadata.length,
            //     )
            //     console.log("width:", tableColumn.width, columnMetadata.width)
            //     console.log(
            //         "precision:",
            //         tableColumn.precision,
            //         columnMetadata.precision,
            //     )
            //     console.log("scale:", tableColumn.scale, columnMetadata.scale)
            //     console.log(
            //         "zerofill:",
            //         tableColumn.zerofill,
            //         columnMetadata.zerofill,
            //     )
            //     console.log(
            //         "unsigned:",
            //         tableColumn.unsigned,
            //         columnMetadata.unsigned,
            //     )
            //     console.log(
            //         "asExpression:",
            //         tableColumn.asExpression,
            //         columnMetadata.asExpression,
            //     )
            //     console.log(
            //         "generatedType:",
            //         tableColumn.generatedType,
            //         columnMetadata.generatedType,
            //     )
            //     console.log(
            //         "comment:",
            //         tableColumn.comment,
            //         this.escapeComment(columnMetadata.comment),
            //     )
            //     console.log(
            //         "default:",
            //         tableColumn.default,
            //         this.normalizeDefault(columnMetadata),
            //     )
            //     console.log("enum:", tableColumn.enum, columnMetadata.enum)
            //     console.log(
            //         "default changed:",
            //         !this.compareDefaultValues(
            //             this.normalizeDefault(columnMetadata),
            //             tableColumn.default,
            //         ),
            //     )
            //     console.log(
            //         "isPrimary:",
            //         tableColumn.isPrimary,
            //         columnMetadata.isPrimary,
            //     )
            //     console.log(
            //         "isNullable changed:",
            //         !this.compareNullableValues(columnMetadata, tableColumn),
            //     )
            //     console.log(
            //         "isUnique:",
            //         tableColumn.isUnique,
            //         this.normalizeIsUnique(columnMetadata),
            //     )
            //     console.log(
            //         "isGenerated:",
            //         tableColumn.isGenerated,
            //         columnMetadata.isGenerated,
            //     )
            //     console.log(
            //         columnMetadata.generationStrategy !== "uuid" &&
            //             tableColumn.isGenerated !== columnMetadata.isGenerated,
            //     )
            //     console.log("==========================================")
            // }
            return isColumnChanged;
        });
    }
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(returningType) {
        return this._isReturningSqlSupported[returningType];
    }
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported() {
        return false;
    }
    /**
     * Returns true if driver supports fulltext indices.
     */
    isFullTextColumnTypeSupported() {
        return true;
    }
    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName, index) {
        return "?";
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Loads all driver dependencies.
     */
    loadDependencies() {
        try {
            // try to load first supported package
            this.mysql = this.options.driver || require("mysql2");
        }
        catch (e) {
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("Mysql", "mysql2");
        }
    }
    /**
     * Creates a new connection pool for a given database credentials.
     */
    createConnectionOptions(options, credentials) {
        credentials = Object.assign({}, credentials, DriverUtils_1.DriverUtils.buildDriverOptions(credentials)); // todo: do it better way
        // build connection options for the driver
        return Object.assign({}, {
            charset: options.charset,
            timezone: options.timezone,
            connectTimeout: options.connectTimeout,
            insecureAuth: options.insecureAuth,
            supportBigNumbers: options.supportBigNumbers !== undefined
                ? options.supportBigNumbers
                : true,
            bigNumberStrings: options.bigNumberStrings !== undefined
                ? options.bigNumberStrings
                : true,
            dateStrings: options.dateStrings,
            debug: options.debug,
            trace: options.trace,
            multipleStatements: options.multipleStatements,
            flags: options.flags,
        }, {
            host: credentials.host,
            user: credentials.username,
            password: credentials.password,
            database: credentials.database,
            port: credentials.port,
            ssl: options.ssl,
            socketPath: credentials.socketPath,
        }, options.acquireTimeout === undefined
            ? {}
            : { acquireTimeout: options.acquireTimeout }, { connectionLimit: options.poolSize }, options.extra || {});
    }
    /**
     * Creates a new connection pool for a given database credentials.
     */
    createPool(connectionOptions) {
        // create a connection pool
        const pool = this.mysql.createPool(connectionOptions);
        // make sure connection is working fine
        return new Promise((ok, fail) => {
            // (issue #610) we make first connection to database to make sure if connection credentials are wrong
            // we give error before calling any other method that creates actual query runner
            pool.getConnection((err, connection) => {
                if (err)
                    return pool.end(() => fail(err));
                connection.release();
                ok(pool);
            });
        });
    }
    /**
     * Attaches all required base handlers to a database connection, such as the unhandled error handler.
     */
    prepareDbConnection(connection) {
        const { logger } = this.connection;
        /*
         * Attaching an error handler to connection errors is essential, as, otherwise, errors raised will go unhandled and
         * cause the hosting app to crash.
         */
        if (connection.listeners("error").length === 0) {
            connection.on("error", (error) => logger.log("warn", `MySQL connection raised an error. ${error}`));
        }
        return connection;
    }
    /**
     * Checks if "DEFAULT" values in the column metadata and in the database are equal.
     */
    compareDefaultValues(columnMetadataValue, databaseValue) {
        if (typeof columnMetadataValue === "string" &&
            typeof databaseValue === "string") {
            // we need to cut out "'" because in mysql we can understand returned value is a string or a function
            // as result compare cannot understand if default is really changed or not
            columnMetadataValue = columnMetadataValue.replace(/^'+|'+$/g, "");
            databaseValue = databaseValue.replace(/^'+|'+$/g, "");
        }
        return columnMetadataValue === databaseValue;
    }
    compareNullableValues(columnMetadata, tableColumn) {
        // MariaDB does not support NULL/NOT NULL expressions for generated columns
        const isMariaDb = this.options.type === "mariadb";
        if (isMariaDb && columnMetadata.generatedType) {
            return true;
        }
        return columnMetadata.isNullable === tableColumn.isNullable;
    }
    /**
     * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
     * Otherwise returns original input.
     */
    normalizeDatetimeFunction(value) {
        if (!value)
            return value;
        // check if input is datetime function
        const isDatetimeFunction = value.toUpperCase().indexOf("CURRENT_TIMESTAMP") !== -1 ||
            value.toUpperCase().indexOf("NOW") !== -1;
        if (isDatetimeFunction) {
            // extract precision, e.g. "(3)"
            const precision = value.match(/\(\d+\)/);
            if (this.options.type === "mariadb") {
                return precision
                    ? `CURRENT_TIMESTAMP${precision[0]}`
                    : "CURRENT_TIMESTAMP()";
            }
            else {
                return precision
                    ? `CURRENT_TIMESTAMP${precision[0]}`
                    : "CURRENT_TIMESTAMP";
            }
        }
        else {
            return value;
        }
    }
    /**
     * Escapes a given comment.
     */
    escapeComment(comment) {
        if (!comment)
            return comment;
        comment = comment.replace(/\u0000/g, ""); // Null bytes aren't allowed in comments
        return comment;
    }
    /**
     * A helper to check if column data types have changed
     * This can be used to manage checking any types the
     * database may alias
     */
    isColumnDataTypeChanged(tableColumn, columnMetadata) {
        // this is an exception for mariadb versions where json is an alias for longtext
        if (this.normalizeType(columnMetadata) === "json" &&
            tableColumn.type.toLowerCase() === "longtext")
            return false;
        return tableColumn.type !== this.normalizeType(columnMetadata);
    }
}
exports.MysqlDriver = MysqlDriver;

//# sourceMappingURL=MysqlDriver.js.map
