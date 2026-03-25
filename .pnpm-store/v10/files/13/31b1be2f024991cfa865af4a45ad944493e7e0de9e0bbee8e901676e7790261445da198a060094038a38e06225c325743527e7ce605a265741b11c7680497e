"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlainObjectToNewEntityTransformer = void 0;
const ObjectUtils_1 = require("../../util/ObjectUtils");
/**
 * Transforms plain old javascript object
 * Entity is constructed based on its entity metadata.
 */
class PlainObjectToNewEntityTransformer {
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    transform(newEntity, object, metadata, getLazyRelationsPromiseValue = false) {
        // console.log("groupAndTransform entity:", newEntity);
        // console.log("groupAndTransform object:", object);
        this.groupAndTransform(newEntity, object, metadata, getLazyRelationsPromiseValue);
        // console.log("result:", newEntity);
        return newEntity;
    }
    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------
    /**
     * Since db returns a duplicated rows of the data where accuracies of the same object can be duplicated
     * we need to group our result and we must have some unique id (primary key in our case)
     */
    groupAndTransform(entity, object, metadata, getLazyRelationsPromiseValue = false) {
        // console.log("groupAndTransform entity:", entity);
        // console.log("groupAndTransform object:", object);
        // copy regular column properties from the given object
        metadata.nonVirtualColumns.forEach((column) => {
            const objectColumnValue = column.getEntityValue(object);
            if (objectColumnValue !== undefined)
                column.setEntityValue(entity, objectColumnValue);
        });
        // // copy relation properties from the given object
        if (metadata.relations.length) {
            metadata.relations.forEach((relation) => {
                let entityRelatedValue = relation.getEntityValue(entity);
                const objectRelatedValue = relation.getEntityValue(object, getLazyRelationsPromiseValue);
                if (objectRelatedValue === undefined)
                    return;
                if (relation.isOneToMany || relation.isManyToMany) {
                    if (!Array.isArray(objectRelatedValue))
                        return;
                    if (!entityRelatedValue) {
                        entityRelatedValue = [];
                        relation.setEntityValue(entity, entityRelatedValue);
                    }
                    objectRelatedValue.forEach((objectRelatedValueItem) => {
                        // check if we have this item from the merging object in the original entity we merge into
                        let objectRelatedValueEntity = entityRelatedValue.find((entityRelatedValueItem) => {
                            return relation.inverseEntityMetadata.compareEntities(objectRelatedValueItem, entityRelatedValueItem);
                        });
                        const inverseEntityMetadata = relation.inverseEntityMetadata.findInheritanceMetadata(objectRelatedValueItem);
                        // if such item already exist then merge new data into it, if its not we create a new entity and merge it into the array
                        if (!objectRelatedValueEntity) {
                            objectRelatedValueEntity =
                                inverseEntityMetadata.create(undefined, {
                                    fromDeserializer: true,
                                });
                            entityRelatedValue.push(objectRelatedValueEntity);
                        }
                        this.groupAndTransform(objectRelatedValueEntity, objectRelatedValueItem, inverseEntityMetadata, getLazyRelationsPromiseValue);
                    });
                }
                else {
                    // if related object isn't an object (direct relation id for example)
                    // we just set it to the entity relation, we don't need anything more from it
                    // however we do it only if original entity does not have this relation set to object
                    // to prevent full overriding of objects
                    if (!ObjectUtils_1.ObjectUtils.isObject(objectRelatedValue)) {
                        if (!ObjectUtils_1.ObjectUtils.isObject(entityRelatedValue))
                            relation.setEntityValue(entity, objectRelatedValue);
                        return;
                    }
                    const inverseEntityMetadata = relation.inverseEntityMetadata.findInheritanceMetadata(objectRelatedValue);
                    if (!entityRelatedValue) {
                        entityRelatedValue = inverseEntityMetadata.create(undefined, {
                            fromDeserializer: true,
                        });
                        relation.setEntityValue(entity, entityRelatedValue);
                    }
                    this.groupAndTransform(entityRelatedValue, objectRelatedValue, inverseEntityMetadata, getLazyRelationsPromiseValue);
                }
            });
        }
    }
}
exports.PlainObjectToNewEntityTransformer = PlainObjectToNewEntityTransformer;

//# sourceMappingURL=PlainObjectToNewEntityTransformer.js.map
