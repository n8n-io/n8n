"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractSqliteDriver = void 0;
const DateUtils_1 = require("../../util/DateUtils");
const RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
const OrmUtils_1 = require("../../util/OrmUtils");
const ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
const DriverUtils_1 = require("../DriverUtils");
const error_1 = require("../../error");
const InstanceChecker_1 = require("../../util/InstanceChecker");
/**
 * Organizes communication with sqlite DBMS.
 */
class AbstractSqliteDriver {
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
         * @see https://www.tutorialspoint.com/sqlite/sqlite_data_types.htm
         * @see https://sqlite.org/datatype3.html
         */
        this.supportedDataTypes = [
            "int",
            "integer",
            "tinyint",
            "smallint",
            "mediumint",
            "bigint",
            "unsigned big int",
            "int2",
            "int8",
            "integer",
            "character",
            "varchar",
            "varying character",
            "nchar",
            "native character",
            "nvarchar",
            "text",
            "clob",
            "text",
            "blob",
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
            "boolean",
            "date",
            "time",
            "datetime",
            "json",
        ];
        /**
         * Returns type of upsert supported by driver if any
         */
        this.supportedUpsertTypes = ["on-conflict-do-update"];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "character",
            "varchar",
            "varying character",
            "nchar",
            "native character",
            "nvarchar",
            "text",
            "blob",
            "clob",
        ];
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
            "date",
            "time",
            "datetime",
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
        ];
        /**
         * Orm has special columns and we need to know what database column types should be for those types.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "datetime",
            createDateDefault: "datetime('now')",
            updateDate: "datetime",
            updateDateDefault: "datetime('now')",
            deleteDate: "datetime",
            deleteDateNullable: true,
            version: "integer",
            treeLevel: "integer",
            migrationId: "integer",
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
        this.cteCapabilities = {
            enabled: true,
            requiresRecursiveHint: true,
        };
        // -------------------------------------------------------------------------
        // Protected Properties
        // -------------------------------------------------------------------------
        /**
         * Any attached databases (excepting default 'main')
         */
        this.attachedDatabases = {};
        this.connection = connection;
        this.options = connection.options;
        this.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options).database;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    async connect() {
        this.databaseConnection = await this.createDatabaseConnection();
    }
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect() {
        return Promise.resolve();
    }
    /**
     * Closes connection with database.
     */
    async disconnect() {
        return new Promise((ok, fail) => {
            this.queryRunner = undefined;
            this.databaseConnection.close((err) => err ? fail(err) : ok());
        });
    }
    hasAttachedDatabases() {
        return !!Object.keys(this.attachedDatabases).length;
    }
    getAttachedDatabaseHandleByRelativePath(path) {
        return this.attachedDatabases?.[path]?.attachHandle;
    }
    getAttachedDatabasePathRelativeByHandle(handle) {
        return Object.values(this.attachedDatabases).find(({ attachHandle }) => handle === attachHandle)?.attachFilepathRelative;
    }
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder() {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    }
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean ||
            columnMetadata.type === "boolean") {
            return value === true ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            return DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            return DateUtils_1.DateUtils.mixedDateToTimeString(value);
        }
        else if (columnMetadata.type === "datetime" ||
            columnMetadata.type === Date) {
            // to string conversation needs because SQLite stores date as integer number, when date came as Object
            // TODO: think about `toUTC` conversion
            return DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(value);
        }
        else if (columnMetadata.type === "json" ||
            columnMetadata.type === "simple-json") {
            return DateUtils_1.DateUtils.simpleJsonToString(value);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-enum") {
            return DateUtils_1.DateUtils.simpleEnumToString(value);
        }
        return value;
    }
    /**
     * Prepares given value to a value to be hydrated, based on its column type or metadata.
     */
    prepareHydratedValue(value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer
                ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value)
                : value;
        if (columnMetadata.type === Boolean ||
            columnMetadata.type === "boolean") {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime" ||
            columnMetadata.type === Date) {
            /**
             * Fix date conversion issue
             *
             * If the format of the date string is "2018-03-14 02:33:33.906", Safari (and iOS WKWebView) will convert it to an invalid date object.
             * We need to modify the date string to "2018-03-14T02:33:33.906Z" and Safari will convert it correctly.
             *
             * ISO 8601
             * https://www.w3.org/TR/NOTE-datetime
             */
            if (value && typeof value === "string") {
                // There are various valid time string formats a sqlite time string might have:
                // https://www.sqlite.org/lang_datefunc.html
                // There are two separate fixes we may need to do:
                //   1) Add 'T' separator if space is used instead
                //   2) Add 'Z' UTC suffix if no timezone or offset specified
                if (/^\d\d\d\d-\d\d-\d\d \d\d:\d\d/.test(value)) {
                    value = value.replace(" ", "T");
                }
                if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d\d\d)?)?$/.test(value)) {
                    value += "Z";
                }
            }
            value = DateUtils_1.DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            value = DateUtils_1.DateUtils.mixedTimeToString(value);
        }
        else if (columnMetadata.type === "json" ||
            columnMetadata.type === "simple-json") {
            value = DateUtils_1.DateUtils.stringToSimpleJson(value);
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-enum") {
            value = DateUtils_1.DateUtils.stringToSimpleEnum(value, columnMetadata);
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
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql, parameters, nativeParameters) {
        const escapedParameters = Object.keys(nativeParameters).map((key) => {
            // Mapping boolean values to their numeric representation
            if (typeof nativeParameters[key] === "boolean") {
                return nativeParameters[key] === true ? 1 : 0;
            }
            if (nativeParameters[key] instanceof Date) {
                return DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(nativeParameters[key]);
            }
            return nativeParameters[key];
        });
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
            else if (typeof value === "number") {
                return String(value);
            }
            // Sqlite does not have a boolean data type so we have to transform
            // it to 1 or 0
            if (typeof value === "boolean") {
                escapedParameters.push(+value);
                return this.createParameter(key, escapedParameters.length - 1);
            }
            if (value instanceof Date) {
                escapedParameters.push(DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(value));
                return this.createParameter(key, escapedParameters.length - 1);
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
        return '"' + columnName + '"';
    }
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     *
     * Returns only simple table name because all inherited drivers does not supports schema and database.
     */
    buildTableName(tableName, schema, database) {
        return tableName;
    }
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    parseTableName(target) {
        const driverDatabase = this.database;
        const driverSchema = undefined;
        if (InstanceChecker_1.InstanceChecker.isTable(target) || InstanceChecker_1.InstanceChecker.isView(target)) {
            const parsed = this.parseTableName(target.schema
                ? `"${target.schema}"."${target.name}"`
                : target.name);
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
        if (parts.length === 3) {
            return {
                database: parts[0] || driverDatabase,
                schema: parts[1] || driverSchema,
                tableName: parts[2],
            };
        }
        else if (parts.length === 2) {
            const database = this.getAttachedDatabasePathRelativeByHandle(parts[0]) ??
                driverDatabase;
            return {
                database: database,
                schema: parts[0],
                tableName: parts[1],
            };
        }
        else {
            return {
                database: driverDatabase,
                schema: driverSchema,
                tableName: target,
            };
        }
    }
    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column) {
        if (column.type === Number || column.type === "int") {
            return "integer";
        }
        else if (column.type === String) {
            return "varchar";
        }
        else if (column.type === Date) {
            return "datetime";
        }
        else if (column.type === Boolean) {
            return "boolean";
        }
        else if (column.type === "uuid") {
            return "varchar";
        }
        else if (column.type === "simple-array") {
            return "text";
        }
        else if (column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "varchar";
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
        if (typeof defaultValue === "number") {
            return "" + defaultValue;
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "1" : "0";
        }
        if (typeof defaultValue === "function") {
            return defaultValue();
        }
        if (typeof defaultValue === "string") {
            return `'${defaultValue}'`;
        }
        if (defaultValue === null || defaultValue === undefined) {
            return undefined;
        }
        return `${defaultValue}`;
    }
    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column) {
        return column.entityMetadata.uniques.some((uq) => uq.columns.length === 1 && uq.columns[0] === column);
    }
    /**
     * Calculates column length taking into account the default length values.
     */
    getColumnLength(column) {
        return column.length ? column.length.toString() : "";
    }
    /**
     * Normalizes "default" value of the column.
     */
    createFullType(column) {
        let type = column.type;
        if (column.enum) {
            return "varchar";
        }
        if (column.length) {
            type += "(" + column.length + ")";
        }
        else if (column.precision !== null &&
            column.precision !== undefined &&
            column.scale !== null &&
            column.scale !== undefined) {
            type += "(" + column.precision + "," + column.scale + ")";
        }
        else if (column.precision !== null &&
            column.precision !== undefined) {
            type += "(" + column.precision + ")";
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
        return Promise.resolve();
    }
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection() {
        return Promise.resolve();
    }
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata, insertResult, entityIndex, entityNum) {
        const generatedMap = metadata.generatedColumns.reduce((map, generatedColumn) => {
            let value;
            if (generatedColumn.generationStrategy === "increment" &&
                insertResult) {
                // NOTE: When INSERT statement is successfully completed, the last inserted row ID is returned.
                // see also: SqliteQueryRunner.query()
                value = insertResult - entityNum + entityIndex + 1;
                // } else if (generatedColumn.generationStrategy === "uuid") {
                //     value = insertValue[generatedColumn.databaseName];
            }
            if (!value)
                return map;
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
                tableColumn.type !== this.normalizeType(columnMetadata) ||
                tableColumn.length !== columnMetadata.length ||
                tableColumn.precision !== columnMetadata.precision ||
                tableColumn.scale !== columnMetadata.scale ||
                this.normalizeDefault(columnMetadata) !== tableColumn.default ||
                tableColumn.isPrimary !== columnMetadata.isPrimary ||
                tableColumn.isNullable !== columnMetadata.isNullable ||
                tableColumn.generatedType !== columnMetadata.generatedType ||
                tableColumn.asExpression !== columnMetadata.asExpression ||
                tableColumn.isUnique !==
                    this.normalizeIsUnique(columnMetadata) ||
                (tableColumn.enum &&
                    columnMetadata.enum &&
                    !OrmUtils_1.OrmUtils.isArraysEqual(tableColumn.enum, columnMetadata.enum.map((val) => val + ""))) ||
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
            //     console.log(
            //         "precision:",
            //         tableColumn.precision,
            //         columnMetadata.precision,
            //     )
            //     console.log("scale:", tableColumn.scale, columnMetadata.scale)
            //     console.log(
            //         "default:",
            //         this.normalizeDefault(columnMetadata),
            //         columnMetadata.default,
            //     )
            //     console.log(
            //         "isPrimary:",
            //         tableColumn.isPrimary,
            //         columnMetadata.isPrimary,
            //     )
            //     console.log(
            //         "isNullable:",
            //         tableColumn.isNullable,
            //         columnMetadata.isNullable,
            //     )
            //     console.log(
            //         "generatedType:",
            //         tableColumn.generatedType,
            //         columnMetadata.generatedType,
            //     )
            //     console.log(
            //         "asExpression:",
            //         tableColumn.asExpression,
            //         columnMetadata.asExpression,
            //     )
            //     console.log(
            //         "isUnique:",
            //         tableColumn.isUnique,
            //         this.normalizeIsUnique(columnMetadata),
            //     )
            //     console.log(
            //         "enum:",
            //         tableColumn.enum &&
            //             columnMetadata.enum &&
            //             !OrmUtils.isArraysEqual(
            //                 tableColumn.enum,
            //                 columnMetadata.enum.map((val) => val + ""),
            //             ),
            //     )
            //     console.log(
            //         "isGenerated:",
            //         tableColumn.isGenerated,
            //         columnMetadata.isGenerated,
            //     )
            // }
            return isColumnChanged;
        });
    }
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported() {
        return false;
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
        return false;
    }
    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName, index) {
        // return "$" + (index + 1);
        return "?";
        // return "$" + parameterName;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    createDatabaseConnection() {
        throw new error_1.TypeORMError("Do not use AbstractSqlite directly, it has to be used with one of the sqlite drivers");
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadDependencies() {
        // dependencies have to be loaded in the specific driver
    }
}
exports.AbstractSqliteDriver = AbstractSqliteDriver;

//# sourceMappingURL=AbstractSqliteDriver.js.map
