"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableIndex = void 0;
/**
 * Database's table index stored in this class.
 */
class TableIndex {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("TableIndex");
        /**
         * Columns included in this index.
         */
        this.columnNames = [];
        this.name = options.name;
        this.columnNames = options.columnNames;
        this.isUnique = !!options.isUnique;
        this.isSpatial = !!options.isSpatial;
        this.isConcurrent = !!options.isConcurrent;
        this.isFulltext = !!options.isFulltext;
        this.isNullFiltered = !!options.isNullFiltered;
        this.parser = options.parser;
        this.where = options.where ? options.where : "";
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new copy of this index with exactly same properties.
     */
    clone() {
        return new TableIndex({
            name: this.name,
            columnNames: [...this.columnNames],
            isUnique: this.isUnique,
            isSpatial: this.isSpatial,
            isConcurrent: this.isConcurrent,
            isFulltext: this.isFulltext,
            isNullFiltered: this.isNullFiltered,
            parser: this.parser,
            where: this.where,
        });
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates index from the index metadata object.
     */
    static create(indexMetadata) {
        return new TableIndex({
            name: indexMetadata.name,
            columnNames: indexMetadata.columns.map((column) => column.databaseName),
            isUnique: indexMetadata.isUnique,
            isSpatial: indexMetadata.isSpatial,
            isConcurrent: indexMetadata.isConcurrent,
            isFulltext: indexMetadata.isFulltext,
            isNullFiltered: indexMetadata.isNullFiltered,
            parser: indexMetadata.parser,
            where: indexMetadata.where,
        });
    }
}
exports.TableIndex = TableIndex;

//# sourceMappingURL=TableIndex.js.map
