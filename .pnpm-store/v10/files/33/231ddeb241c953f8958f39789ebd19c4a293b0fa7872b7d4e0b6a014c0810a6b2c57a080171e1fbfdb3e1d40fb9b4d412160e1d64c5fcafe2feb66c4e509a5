"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueMetadata = void 0;
const error_1 = require("../error");
/**
 * Unique metadata contains all information about table's unique constraints.
 */
class UniqueMetadata {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(options) {
        /**
         * Unique columns.
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
            this.givenName = options.args.name;
            this.givenColumnNames = options.args.columns;
            this.deferrable = options.args.deferrable;
        }
    }
    // ---------------------------------------------------------------------
    // Public Build Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend unique constraint properties.
     * Must be called after all entity metadata's properties map, columns and relations are built.
     */
    build(namingStrategy) {
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
                .map((propertyName) => {
                const columnWithSameName = this.entityMetadata.columns.find((column) => column.propertyPath === propertyName);
                if (columnWithSameName) {
                    return [columnWithSameName];
                }
                const relationWithSameName = this.entityMetadata.relations.find((relation) => relation.isWithJoinColumn &&
                    relation.propertyName === propertyName);
                if (relationWithSameName) {
                    return relationWithSameName.joinColumns;
                }
                const indexName = this.givenName
                    ? '"' + this.givenName + '" '
                    : "";
                const entityName = this.entityMetadata.targetName;
                throw new error_1.TypeORMError(`Unique constraint ${indexName}contains column that is missing in the entity (${entityName}): ` +
                    propertyName);
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
            : namingStrategy.uniqueConstraintName(this.entityMetadata.tableName, this.columns.map((column) => column.databaseName));
        return this;
    }
}
exports.UniqueMetadata = UniqueMetadata;

//# sourceMappingURL=UniqueMetadata.js.map
