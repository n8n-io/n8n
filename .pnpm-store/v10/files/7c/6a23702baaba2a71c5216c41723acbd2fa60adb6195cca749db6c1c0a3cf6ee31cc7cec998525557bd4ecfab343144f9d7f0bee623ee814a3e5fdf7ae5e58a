"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationIdMetadataToAttributeTransformer = void 0;
const RelationIdAttribute_1 = require("./RelationIdAttribute");
class RelationIdMetadataToAttributeTransformer {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(expressionMap) {
        this.expressionMap = expressionMap;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    transform() {
        // by example:
        // post has relation id:
        // @RelationId(post => post.categories) categoryIds
        // category has relation id
        // @RelationId(category => category.images) imageIds
        // we load post and join category
        // we expect post.categoryIds and post.category.imageIds to have relation ids
        // first create relation id attributes for all relation id metadatas of the main selected object (post from example)
        if (this.expressionMap.mainAlias) {
            this.expressionMap.mainAlias.metadata.relationIds.forEach((relationId) => {
                const attribute = this.metadataToAttribute(this.expressionMap.mainAlias.name, relationId);
                this.expressionMap.relationIdAttributes.push(attribute);
            });
        }
        // second create relation id attributes for all relation id metadatas of all joined objects (category from example)
        this.expressionMap.joinAttributes.forEach((join) => {
            // ensure this join has a metadata, because relation id can only work for real orm entities
            if (!join.metadata || join.metadata.isJunction)
                return;
            join.metadata.relationIds.forEach((relationId) => {
                const attribute = this.metadataToAttribute(join.alias.name, relationId);
                this.expressionMap.relationIdAttributes.push(attribute);
            });
        });
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    metadataToAttribute(parentAliasName, relationId) {
        return new RelationIdAttribute_1.RelationIdAttribute(this.expressionMap, {
            relationName: parentAliasName + "." + relationId.relation.propertyName, // category.images
            mapToProperty: parentAliasName + "." + relationId.propertyName, // category.imageIds
            alias: relationId.alias,
            queryBuilderFactory: relationId.queryBuilderFactory,
        });
    }
}
exports.RelationIdMetadataToAttributeTransformer = RelationIdMetadataToAttributeTransformer;

//# sourceMappingURL=RelationIdMetadataToAttributeTransformer.js.map
