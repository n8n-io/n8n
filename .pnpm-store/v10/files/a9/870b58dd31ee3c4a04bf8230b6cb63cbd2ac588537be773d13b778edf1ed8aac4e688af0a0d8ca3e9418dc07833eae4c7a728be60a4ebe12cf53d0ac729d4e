"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableForeignKey = void 0;
/**
 * Foreign key from the database stored in this class.
 */
class TableForeignKey {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("TableForeignKey");
        /**
         * Column names which included by this foreign key.
         */
        this.columnNames = [];
        /**
         * Column names which included by this foreign key.
         */
        this.referencedColumnNames = [];
        this.name = options.name;
        this.columnNames = options.columnNames;
        this.referencedColumnNames = options.referencedColumnNames;
        this.referencedDatabase = options.referencedDatabase;
        this.referencedSchema = options.referencedSchema;
        this.referencedTableName = options.referencedTableName;
        this.onDelete = options.onDelete;
        this.onUpdate = options.onUpdate;
        this.deferrable = options.deferrable;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new copy of this foreign key with exactly same properties.
     */
    clone() {
        return new TableForeignKey({
            name: this.name,
            columnNames: [...this.columnNames],
            referencedColumnNames: [...this.referencedColumnNames],
            referencedDatabase: this.referencedDatabase,
            referencedSchema: this.referencedSchema,
            referencedTableName: this.referencedTableName,
            onDelete: this.onDelete,
            onUpdate: this.onUpdate,
            deferrable: this.deferrable,
        });
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new table foreign key from the given foreign key metadata.
     */
    static create(metadata, driver) {
        return new TableForeignKey({
            name: metadata.name,
            columnNames: metadata.columnNames,
            referencedColumnNames: metadata.referencedColumnNames,
            referencedDatabase: metadata.referencedEntityMetadata.database,
            referencedSchema: metadata.referencedEntityMetadata.schema,
            referencedTableName: metadata.referencedTablePath,
            onDelete: metadata.onDelete,
            onUpdate: metadata.onUpdate,
            deferrable: metadata.deferrable,
        });
    }
}
exports.TableForeignKey = TableForeignKey;

//# sourceMappingURL=TableForeignKey.js.map
