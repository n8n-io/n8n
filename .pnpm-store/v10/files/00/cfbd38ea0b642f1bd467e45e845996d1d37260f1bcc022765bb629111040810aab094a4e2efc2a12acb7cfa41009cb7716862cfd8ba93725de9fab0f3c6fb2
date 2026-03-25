"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexMetadata = void 0;
const error_1 = require("../error");
/**
 * Index metadata contains all information about table's index.
 */
class IndexMetadata {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(options) {
        /**
         * Indicates if this index must be unique.
         */
        this.isUnique = false;
        /**
         * The SPATIAL modifier indexes the entire column and does not allow indexed columns to contain NULL values.
         * Works only in MySQL.
         */
        this.isSpatial = false;
        /**
         * The FULLTEXT modifier indexes the entire column and does not allow prefixing.
         * Works only in MySQL.
         */
        this.isFulltext = false;
        /**
         * NULL_FILTERED indexes are particularly useful for indexing sparse columns, where most rows contain a NULL value.
         * In these cases, the NULL_FILTERED index can be considerably smaller and more efficient to maintain than
         * a normal index that includes NULL values.
         *
         * Works only in Spanner.
         */
        this.isNullFiltered = false;
        /**
         * Indicates if this index must synchronize with database index.
         */
        this.synchronize = true;
        /**
         * Indexed columns.
         */
        this.columns = [];
        /**
         * Map of column names with order set.
         * Used only by MongoDB driver.
         */
        this.columnNamesWithOrderingMap = {};
        this.entityMetadata = options.entityMetadata;
        this.embeddedMetadata = options.embeddedMetadata;
        if (options.columns)
            this.columns = options.columns;
        if (options.args) {
            this.target = options.args.target;
            if (options.args.synchronize !== null &&
                options.args.synchronize !== undefined)
                this.synchronize = options.args.synchronize;
            this.isUnique = !!options.args.unique;
            this.isSpatial = !!options.args.spatial;
            this.isFulltext = !!options.args.fulltext;
            this.isNullFiltered = !!options.args.nullFiltered;
            this.parser = options.args.parser;
            this.where = options.args.where;
            this.isSparse = options.args.sparse;
            this.isBackground = options.args.background;
            this.isConcurrent = options.args.concurrent;
            this.expireAfterSeconds = options.args.expireAfterSeconds;
            this.givenName = options.args.name;
            this.givenColumnNames = options.args.columns;
        }
    }
    // ---------------------------------------------------------------------
    // Public Build Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend index properties.
     * Must be called after all entity metadata's properties map, columns and relations are built.
     */
    build(namingStrategy) {
        if (this.synchronize === false) {
            this.name = this.givenName;
            return this;
        }
        const map = {};
        // if columns already an array of string then simply return it
        if (this.givenColumnNames) {
            let columnPropertyPaths = [];
            if (Array.isArray(this.givenColumnNames)) {
                columnPropertyPaths = this.givenColumnNames.map((columnName) => {
                    if (this.embeddedMetadata)
                        return (this.embeddedMetadata.propertyPath +
                            "." +
                            columnName);
                    return columnName.trim();
                });
                columnPropertyPaths.forEach((propertyPath) => (map[propertyPath] = 1));
            }
            else {
                // todo: indices in embeds are not implemented in this syntax. deprecate this syntax?
                // if columns is a function that returns array of field names then execute it and get columns names from it
                const columnsFnResult = this.givenColumnNames(this.entityMetadata.propertiesMap);
                if (Array.isArray(columnsFnResult)) {
                    columnPropertyPaths = columnsFnResult.map((i) => String(i));
                    columnPropertyPaths.forEach((name) => (map[name] = 1));
                }
                else {
                    columnPropertyPaths = Object.keys(columnsFnResult).map((i) => String(i));
                    Object.keys(columnsFnResult).forEach((columnName) => (map[columnName] = columnsFnResult[columnName]));
                }
            }
            this.columns = columnPropertyPaths
                .map((propertyPath) => {
                const columnWithSameName = this.entityMetadata.columns.find((column) => column.propertyPath === propertyPath);
                if (columnWithSameName) {
                    return [columnWithSameName];
                }
                const relationWithSameName = this.entityMetadata.relations.find((relation) => relation.isWithJoinColumn &&
                    relation.propertyName === propertyPath);
                if (relationWithSameName) {
                    return relationWithSameName.joinColumns;
                }
                const indexName = this.givenName
                    ? '"' + this.givenName + '" '
                    : "";
                const entityName = this.entityMetadata.targetName;
                throw new error_1.TypeORMError(`Index ${indexName}contains column that is missing in the entity (${entityName}): ` +
                    propertyPath);
            })
                .reduce((a, b) => a.concat(b));
        }
        this.columnNamesWithOrderingMap = Object.keys(map).reduce((updatedMap, key) => {
            const column = this.entityMetadata.columns.find((column) => column.propertyPath === key);
            if (column)
                updatedMap[column.databasePath] = map[key];
            return updatedMap;
        }, {});
        this.name = this.givenName
            ? this.givenName
            : namingStrategy.indexName(this.entityMetadata.tableName, this.columns.map((column) => column.databaseName), this.where);
        return this;
    }
}
exports.IndexMetadata = IndexMetadata;

//# sourceMappingURL=IndexMetadata.js.map
