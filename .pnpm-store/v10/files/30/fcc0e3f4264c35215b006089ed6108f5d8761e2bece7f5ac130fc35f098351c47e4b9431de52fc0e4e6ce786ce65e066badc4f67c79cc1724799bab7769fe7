"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = void 0;
/**
 * View in the database represented in this class.
 */
class View {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("View");
        this.indices = [];
        if (options) {
            this.database = options.database;
            this.schema = options.schema;
            this.name = options.name;
            this.expression = options.expression;
            this.materialized = !!options.materialized;
        }
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Clones this table to a new table with all properties cloned.
     */
    clone() {
        return new View({
            database: this.database,
            schema: this.schema,
            name: this.name,
            expression: this.expression,
            materialized: this.materialized,
        });
    }
    /**
     * Add index
     */
    addIndex(index) {
        this.indices.push(index);
    }
    /**
     * Remove index
     */
    removeIndex(viewIndex) {
        const index = this.indices.find((index) => index.name === viewIndex.name);
        if (index) {
            this.indices.splice(this.indices.indexOf(index), 1);
        }
    }
    // -------------------------------------------------------------------------
    // Static Methods
    // -------------------------------------------------------------------------
    /**
     * Creates view from a given entity metadata.
     */
    static create(entityMetadata, driver) {
        const options = {
            database: entityMetadata.database,
            schema: entityMetadata.schema,
            name: driver.buildTableName(entityMetadata.tableName, entityMetadata.schema, entityMetadata.database),
            expression: entityMetadata.expression,
            materialized: entityMetadata.tableMetadataArgs.materialized,
        };
        return new View(options);
    }
}
exports.View = View;

//# sourceMappingURL=View.js.map
