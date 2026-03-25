"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableUnique = void 0;
/**
 * Database's table unique constraint stored in this class.
 */
class TableUnique {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("TableUnique");
        /**
         * Columns that contains this constraint.
         */
        this.columnNames = [];
        this.name = options.name;
        this.columnNames = options.columnNames;
        this.deferrable = options.deferrable;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new copy of this constraint with exactly same properties.
     */
    clone() {
        return new TableUnique({
            name: this.name,
            columnNames: [...this.columnNames],
            deferrable: this.deferrable,
        });
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates unique from the unique metadata object.
     */
    static create(uniqueMetadata) {
        return new TableUnique({
            name: uniqueMetadata.name,
            columnNames: uniqueMetadata.columns.map((column) => column.databaseName),
            deferrable: uniqueMetadata.deferrable,
        });
    }
}
exports.TableUnique = TableUnique;

//# sourceMappingURL=TableUnique.js.map
