"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationCountAttribute = void 0;
const QueryBuilderUtils_1 = require("../QueryBuilderUtils");
const ObjectUtils_1 = require("../../util/ObjectUtils");
const TypeORMError_1 = require("../../error/TypeORMError");
class RelationCountAttribute {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(expressionMap, relationCountAttribute) {
        this.expressionMap = expressionMap;
        ObjectUtils_1.ObjectUtils.assign(this, relationCountAttribute || {});
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    get joinInverseSideMetadata() {
        return this.relation.inverseEntityMetadata;
    }
    /**
     * Alias of the parent of this join.
     * For example, if we join ("post.category", "categoryAlias") then "post" is a parent alias.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get parentAlias() {
        if (!QueryBuilderUtils_1.QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new TypeORMError_1.TypeORMError(`Given value must be a string representation of alias property`);
        return this.relationName.split(".")[0];
    }
    /**
     * Relation property name of the parent.
     * This is used to understand what is joined.
     * For example, if we join ("post.category", "categoryAlias") then "category" is a relation property.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get relationProperty() {
        if (!QueryBuilderUtils_1.QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new TypeORMError_1.TypeORMError(`Given value is a string representation of alias property`);
        return this.relationName.split(".")[1];
    }
    get junctionAlias() {
        const [parentAlias, relationProperty] = this.relationName.split(".");
        return parentAlias + "_" + relationProperty + "_rc";
    }
    /**
     * Relation of the parent.
     * This is used to understand what is joined.
     * This is available when join was made using "post.category" syntax.
     */
    get relation() {
        if (!QueryBuilderUtils_1.QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new TypeORMError_1.TypeORMError(`Given value is a string representation of alias property`);
        const [parentAlias, propertyPath] = this.relationName.split(".");
        const relationOwnerSelection = this.expressionMap.findAliasByName(parentAlias);
        const relation = relationOwnerSelection.metadata.findRelationWithPropertyPath(propertyPath);
        if (!relation)
            throw new TypeORMError_1.TypeORMError(`Relation with property path ${propertyPath} in entity was not found.`);
        return relation;
    }
    /**
     * Metadata of the joined entity.
     * If table without entity was joined, then it will return undefined.
     */
    get metadata() {
        if (!QueryBuilderUtils_1.QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new TypeORMError_1.TypeORMError(`Given value is a string representation of alias property`);
        const parentAlias = this.relationName.split(".")[0];
        const selection = this.expressionMap.findAliasByName(parentAlias);
        return selection.metadata;
    }
    get mapToPropertyPropertyName() {
        return this.mapToProperty.split(".")[1];
    }
}
exports.RelationCountAttribute = RelationCountAttribute;

//# sourceMappingURL=RelationCountAttribute.js.map
