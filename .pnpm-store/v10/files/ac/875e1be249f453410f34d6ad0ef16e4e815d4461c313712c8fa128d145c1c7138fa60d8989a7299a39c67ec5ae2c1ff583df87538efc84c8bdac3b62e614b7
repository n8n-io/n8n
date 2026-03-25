"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckMetadata = void 0;
/**
 * Check metadata contains all information about table's check constraints.
 */
class CheckMetadata {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(options) {
        this.entityMetadata = options.entityMetadata;
        if (options.args) {
            this.target = options.args.target;
            this.expression = options.args.expression;
            this.givenName = options.args.name;
        }
    }
    // ---------------------------------------------------------------------
    // Public Build Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend check constraint properties.
     * Must be called after all entity metadata's properties map, columns and relations are built.
     */
    build(namingStrategy) {
        this.name = this.givenName
            ? this.givenName
            : namingStrategy.checkConstraintName(this.entityMetadata.tableName, this.expression);
        return this;
    }
}
exports.CheckMetadata = CheckMetadata;

//# sourceMappingURL=CheckMetadata.js.map
