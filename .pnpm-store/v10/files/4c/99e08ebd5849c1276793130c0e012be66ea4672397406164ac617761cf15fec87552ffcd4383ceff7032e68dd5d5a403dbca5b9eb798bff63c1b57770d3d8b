"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationCountMetadata = void 0;
const error_1 = require("../error");
/**
 * Contains all information about entity's relation count.
 */
class RelationCountMetadata {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(options) {
        this.entityMetadata = options.entityMetadata;
        this.target = options.args.target;
        this.propertyName = options.args.propertyName;
        this.relationNameOrFactory = options.args.relation;
        this.alias = options.args.alias;
        this.queryBuilderFactory = options.args.queryBuilderFactory;
    }
    // ---------------------------------------------------------------------
    // Public Builder Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend relation count metadata properties.
     * This builder method should be used only after entity metadata, its properties map and all relations are build.
     */
    build() {
        const propertyPath = typeof this.relationNameOrFactory === "function"
            ? this.relationNameOrFactory(this.entityMetadata.propertiesMap)
            : this.relationNameOrFactory;
        const relation = this.entityMetadata.findRelationWithPropertyPath(propertyPath);
        if (!relation)
            throw new error_1.TypeORMError(`Cannot find relation ${propertyPath}. Wrong relation specified for @RelationCount decorator.`);
        this.relation = relation;
    }
}
exports.RelationCountMetadata = RelationCountMetadata;

//# sourceMappingURL=RelationCountMetadata.js.map
