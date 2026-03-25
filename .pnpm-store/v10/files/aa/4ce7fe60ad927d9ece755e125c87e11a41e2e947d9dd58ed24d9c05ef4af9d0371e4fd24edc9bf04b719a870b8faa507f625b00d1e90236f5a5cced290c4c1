"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableCheck = void 0;
/**
 * Database's table check constraint stored in this class.
 */
class TableCheck {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("TableCheck");
        /**
         * Column that contains this constraint.
         */
        this.columnNames = [];
        this.name = options.name;
        this.columnNames = options.columnNames;
        this.expression = options.expression;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new copy of this constraint with exactly same properties.
     */
    clone() {
        return new TableCheck({
            name: this.name,
            columnNames: this.columnNames ? [...this.columnNames] : [],
            expression: this.expression,
        });
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates checks from the check metadata object.
     */
    static create(checkMetadata) {
        return new TableCheck({
            name: checkMetadata.name,
            expression: checkMetadata.expression,
        });
    }
}
exports.TableCheck = TableCheck;

//# sourceMappingURL=TableCheck.js.map
