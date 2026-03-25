"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
const TableColumn_1 = require("./TableColumn");
const TableIndex_1 = require("./TableIndex");
const TableForeignKey_1 = require("./TableForeignKey");
const TableUtils_1 = require("../util/TableUtils");
const TableUnique_1 = require("./TableUnique");
const TableCheck_1 = require("./TableCheck");
const TableExclusion_1 = require("./TableExclusion");
/**
 * Table in the database represented in this class.
 */
class Table {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("Table");
        /**
         * Table columns.
         */
        this.columns = [];
        /**
         * Table indices.
         */
        this.indices = [];
        /**
         * Table foreign keys.
         */
        this.foreignKeys = [];
        /**
         * Table unique constraints.
         */
        this.uniques = [];
        /**
         * Table check constraints.
         */
        this.checks = [];
        /**
         * Table exclusion constraints.
         */
        this.exclusions = [];
        /**
         * Indicates if table was just created.
         * This is needed, for example to check if we need to skip primary keys creation
         * for new tables.
         */
        this.justCreated = false;
        /**
         * Enables Sqlite "WITHOUT ROWID" modifier for the "CREATE TABLE" statement
         */
        this.withoutRowid = false;
        if (options) {
            this.database = options.database;
            this.schema = options.schema;
            this.name = options.name;
            if (options.columns)
                this.columns = options.columns.map((column) => new TableColumn_1.TableColumn(column));
            if (options.indices)
                this.indices = options.indices.map((index) => new TableIndex_1.TableIndex(index));
            if (options.foreignKeys)
                this.foreignKeys = options.foreignKeys.map((foreignKey) => new TableForeignKey_1.TableForeignKey({
                    ...foreignKey,
                    referencedDatabase: foreignKey?.referencedDatabase ||
                        options.database,
                    referencedSchema: foreignKey?.referencedSchema || options.schema,
                }));
            if (options.uniques)
                this.uniques = options.uniques.map((unique) => new TableUnique_1.TableUnique(unique));
            if (options.checks)
                this.checks = options.checks.map((check) => new TableCheck_1.TableCheck(check));
            if (options.exclusions)
                this.exclusions = options.exclusions.map((exclusion) => new TableExclusion_1.TableExclusion(exclusion));
            if (options.justCreated !== undefined)
                this.justCreated = options.justCreated;
            if (options.withoutRowid)
                this.withoutRowid = options.withoutRowid;
            this.engine = options.engine;
            this.comment = options.comment;
        }
    }
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    get primaryColumns() {
        return this.columns.filter((column) => column.isPrimary);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Clones this table to a new table with all properties cloned.
     */
    clone() {
        return new Table({
            schema: this.schema,
            database: this.database,
            name: this.name,
            columns: this.columns.map((column) => column.clone()),
            indices: this.indices.map((constraint) => constraint.clone()),
            foreignKeys: this.foreignKeys.map((constraint) => constraint.clone()),
            uniques: this.uniques.map((constraint) => constraint.clone()),
            checks: this.checks.map((constraint) => constraint.clone()),
            exclusions: this.exclusions.map((constraint) => constraint.clone()),
            justCreated: this.justCreated,
            withoutRowid: this.withoutRowid,
            engine: this.engine,
            comment: this.comment,
        });
    }
    /**
     * Add column and creates its constraints.
     */
    addColumn(column) {
        this.columns.push(column);
    }
    /**
     * Remove column and its constraints.
     */
    removeColumn(column) {
        const foundColumn = this.columns.find((c) => c.name === column.name);
        if (foundColumn)
            this.columns.splice(this.columns.indexOf(foundColumn), 1);
    }
    /**
     * Adds unique constraint.
     */
    addUniqueConstraint(uniqueConstraint) {
        this.uniques.push(uniqueConstraint);
        if (uniqueConstraint.columnNames.length === 1) {
            const uniqueColumn = this.columns.find((column) => column.name === uniqueConstraint.columnNames[0]);
            if (uniqueColumn)
                uniqueColumn.isUnique = true;
        }
    }
    /**
     * Removes unique constraint.
     */
    removeUniqueConstraint(removedUnique) {
        const foundUnique = this.uniques.find((unique) => unique.name === removedUnique.name);
        if (foundUnique) {
            this.uniques.splice(this.uniques.indexOf(foundUnique), 1);
            if (foundUnique.columnNames.length === 1) {
                const uniqueColumn = this.columns.find((column) => column.name === foundUnique.columnNames[0]);
                if (uniqueColumn)
                    uniqueColumn.isUnique = false;
            }
        }
    }
    /**
     * Adds check constraint.
     */
    addCheckConstraint(checkConstraint) {
        this.checks.push(checkConstraint);
    }
    /**
     * Removes check constraint.
     */
    removeCheckConstraint(removedCheck) {
        const foundCheck = this.checks.find((check) => check.name === removedCheck.name);
        if (foundCheck) {
            this.checks.splice(this.checks.indexOf(foundCheck), 1);
        }
    }
    /**
     * Adds exclusion constraint.
     */
    addExclusionConstraint(exclusionConstraint) {
        this.exclusions.push(exclusionConstraint);
    }
    /**
     * Removes exclusion constraint.
     */
    removeExclusionConstraint(removedExclusion) {
        const foundExclusion = this.exclusions.find((exclusion) => exclusion.name === removedExclusion.name);
        if (foundExclusion) {
            this.exclusions.splice(this.exclusions.indexOf(foundExclusion), 1);
        }
    }
    /**
     * Adds foreign keys.
     */
    addForeignKey(foreignKey) {
        this.foreignKeys.push(foreignKey);
    }
    /**
     * Removes foreign key.
     */
    removeForeignKey(removedForeignKey) {
        const fk = this.foreignKeys.find((foreignKey) => foreignKey.name === removedForeignKey.name);
        if (fk)
            this.foreignKeys.splice(this.foreignKeys.indexOf(fk), 1);
    }
    /**
     * Adds index.
     */
    addIndex(index, isMysql = false) {
        this.indices.push(index);
        // in Mysql unique indices and unique constraints are the same thing
        // if index is unique and have only one column, we mark this column as unique
        if (index.columnNames.length === 1 && index.isUnique && isMysql) {
            const column = this.columns.find((c) => c.name === index.columnNames[0]);
            if (column)
                column.isUnique = true;
        }
    }
    /**
     * Removes index.
     */
    removeIndex(tableIndex, isMysql = false) {
        const index = this.indices.find((index) => index.name === tableIndex.name);
        if (index) {
            this.indices.splice(this.indices.indexOf(index), 1);
            // in Mysql unique indices and unique constraints are the same thing
            // if index is unique and have only one column, we move `unique` attribute from its column
            if (index.columnNames.length === 1 && index.isUnique && isMysql) {
                const column = this.columns.find((c) => c.name === index.columnNames[0]);
                if (column)
                    column.isUnique = this.indices.some((ind) => ind.columnNames.length === 1 &&
                        ind.columnNames[0] === column.name &&
                        !!index.isUnique);
            }
        }
    }
    findColumnByName(name) {
        return this.columns.find((column) => column.name === name);
    }
    /**
     * Returns all column indices.
     */
    findColumnIndices(column) {
        return this.indices.filter((index) => {
            return !!index.columnNames.find((columnName) => columnName === column.name);
        });
    }
    /**
     * Returns all column foreign keys.
     */
    findColumnForeignKeys(column) {
        return this.foreignKeys.filter((foreignKey) => {
            return !!foreignKey.columnNames.find((columnName) => columnName === column.name);
        });
    }
    /**
     * Returns all column uniques.
     */
    findColumnUniques(column) {
        return this.uniques.filter((unique) => {
            return !!unique.columnNames.find((columnName) => columnName === column.name);
        });
    }
    /**
     * Returns all column checks.
     */
    findColumnChecks(column) {
        return this.checks.filter((check) => {
            return !!check.columnNames.find((columnName) => columnName === column.name);
        });
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates table from a given entity metadata.
     */
    static create(entityMetadata, driver) {
        const database = entityMetadata.database === driver.database
            ? undefined
            : entityMetadata.database;
        const schema = entityMetadata.schema === driver.options.schema
            ? undefined
            : entityMetadata.schema;
        const options = {
            database: entityMetadata.database,
            schema: entityMetadata.schema,
            name: driver.buildTableName(entityMetadata.tableName, schema, database),
            withoutRowid: entityMetadata.withoutRowid,
            engine: entityMetadata.engine,
            columns: entityMetadata.columns
                .filter((column) => column && !column.isVirtualProperty)
                .map((column) => TableUtils_1.TableUtils.createTableColumnOptions(column, driver)),
            indices: entityMetadata.indices
                .filter((index) => index.synchronize === true)
                .map((index) => TableIndex_1.TableIndex.create(index)),
            uniques: entityMetadata.uniques.map((unique) => TableUnique_1.TableUnique.create(unique)),
            checks: entityMetadata.checks.map((check) => TableCheck_1.TableCheck.create(check)),
            exclusions: entityMetadata.exclusions.map((exclusion) => TableExclusion_1.TableExclusion.create(exclusion)),
            comment: entityMetadata.comment,
        };
        return new Table(options);
    }
}
exports.Table = Table;

//# sourceMappingURL=Table.js.map
