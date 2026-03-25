"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationIdMetadata = void 0;
const error_1 = require("../error");
/**
 * Contains all information about entity's relation count.
 */
class RelationIdMetadata {
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
    // Public Methods
    // ---------------------------------------------------------------------
    /**
     * Sets relation id value from the given entity.
     *
     * todo: make it to work in embeds as well.
     */
    setValue(entity) {
        const inverseEntity = this.relation.getEntityValue(entity);
        if (Array.isArray(inverseEntity)) {
            entity[this.propertyName] = inverseEntity
                .map((item) => {
                return this.relation.inverseEntityMetadata.getEntityIdMixedMap(item);
            })
                .filter((item) => item !== null && item !== undefined);
        }
        else {
            const value = this.relation.inverseEntityMetadata.getEntityIdMixedMap(inverseEntity);
            if (value !== undefined)
                entity[this.propertyName] = value;
        }
    }
    // ---------------------------------------------------------------------
    // Public Builder Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend relation id properties.
     * This builder method should be used only after entity metadata, its properties map and all relations are build.
     */
    build() {
        const propertyPath = typeof this.relationNameOrFactory === "function"
            ? this.relationNameOrFactory(this.entityMetadata.propertiesMap)
            : this.relationNameOrFactory;
        const relation = this.entityMetadata.findRelationWithPropertyPath(propertyPath);
        if (!relation)
            throw new error_1.TypeORMError(`Cannot find relation ${propertyPath}. Wrong relation specified for @RelationId decorator.`);
        this.relation = relation;
    }
}
exports.RelationIdMetadata = RelationIdMetadata;

//# sourceMappingURL=RelationIdMetadata.js.map
