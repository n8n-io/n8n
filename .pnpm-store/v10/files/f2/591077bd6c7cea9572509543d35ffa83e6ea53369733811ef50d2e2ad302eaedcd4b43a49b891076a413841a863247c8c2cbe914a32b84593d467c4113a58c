"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationCountMetadataToAttributeTransformer = void 0;
const RelationCountAttribute_1 = require("./RelationCountAttribute");
class RelationCountMetadataToAttributeTransformer {
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
        // post has relation count:
        // @RelationCount(post => post.categories) categoryCount
        // category has relation count
        // @RelationCount(category => category.images) imageCount
        // we load post and join category
        // we expect post.categoryCount and post.category.imageCount to have relation counts
        // first create relation count attributes for all relation count metadatas of the main selected object (post from example)
        if (this.expressionMap.mainAlias) {
            this.expressionMap.mainAlias.metadata.relationCounts.forEach((relationCount) => {
                const attribute = this.metadataToAttribute(this.expressionMap.mainAlias.name, relationCount);
                this.expressionMap.relationCountAttributes.push(attribute);
            });
        }
        // second create relation count attributes for all relation count metadatas of all joined objects (category from example)
        this.expressionMap.joinAttributes.forEach((join) => {
            // ensure this join has a metadata, because relation count can only work for real orm entities
            if (!join.metadata || join.metadata.isJunction)
                return;
            join.metadata.relationCounts.forEach((relationCount) => {
                const attribute = this.metadataToAttribute(join.alias.name, relationCount);
                this.expressionMap.relationCountAttributes.push(attribute);
            });
        });
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    metadataToAttribute(parentAliasName, relationCount) {
        return new RelationCountAttribute_1.RelationCountAttribute(this.expressionMap, {
            relationName: parentAliasName + "." + relationCount.relation.propertyName, // category.images
            mapToProperty: parentAliasName + "." + relationCount.propertyName, // category.imageIds
            alias: relationCount.alias,
            queryBuilderFactory: relationCount.queryBuilderFactory,
        });
    }
}
exports.RelationCountMetadataToAttributeTransformer = RelationCountMetadataToAttributeTransformer;

//# sourceMappingURL=RelationCountMetadataToAttributeTransformer.js.map
