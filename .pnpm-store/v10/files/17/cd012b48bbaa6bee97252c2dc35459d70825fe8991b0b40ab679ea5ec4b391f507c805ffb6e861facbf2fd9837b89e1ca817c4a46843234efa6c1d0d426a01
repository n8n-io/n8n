"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subject = void 0;
const OrmUtils_1 = require("../util/OrmUtils");
const ObjectUtils_1 = require("../util/ObjectUtils");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Subject is a subject of persistence.
 * It holds information about each entity that needs to be persisted:
 * - what entity should be persisted
 * - what is database representation of the persisted entity
 * - what entity metadata of the persisted entity
 * - what is allowed to with persisted entity (insert/update/remove)
 *
 * Having this collection of subjects we can perform database queries.
 */
class Subject {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("Subject");
        /**
         * Subject identifier.
         * This identifier is not limited to table entity primary columns.
         * This can be entity id or ids as well as some unique entity properties, like name or title.
         * Insert / Update / Remove operation will be executed by a given identifier.
         */
        this.identifier = undefined;
        /**
         * Copy of entity but with relational ids fulfilled.
         */
        this.entityWithFulfilledIds = undefined;
        /**
         * Indicates if database entity was loaded.
         * No matter if it was found or not, it indicates the fact of loading.
         */
        this.databaseEntityLoaded = false;
        /**
         * Changes needs to be applied in the database for the given subject.
         */
        this.changeMaps = [];
        /**
         * Indicates if this subject can be inserted into the database.
         * This means that this subject either is newly persisted, either can be inserted by cascades.
         */
        this.canBeInserted = false;
        /**
         * Indicates if this subject can be updated in the database.
         * This means that this subject either was persisted, either can be updated by cascades.
         */
        this.canBeUpdated = false;
        /**
         * Indicates if this subject MUST be removed from the database.
         * This means that this subject either was removed, either was removed by cascades.
         */
        this.mustBeRemoved = false;
        /**
         * Indicates if this subject can be soft-removed from the database.
         * This means that this subject either was soft-removed, either was soft-removed by cascades.
         */
        this.canBeSoftRemoved = false;
        /**
         * Indicates if this subject can be recovered from the database.
         * This means that this subject either was recovered, either was recovered by cascades.
         */
        this.canBeRecovered = false;
        /**
         * Relations updated by the change maps.
         */
        this.updatedRelationMaps = [];
        /**
         * List of updated columns
         */
        this.diffColumns = [];
        /**
         * List of updated relations
         */
        this.diffRelations = [];
        this.metadata = options.metadata;
        this.entity = options.entity;
        this.parentSubject = options.parentSubject;
        if (options.canBeInserted !== undefined)
            this.canBeInserted = options.canBeInserted;
        if (options.canBeUpdated !== undefined)
            this.canBeUpdated = options.canBeUpdated;
        if (options.mustBeRemoved !== undefined)
            this.mustBeRemoved = options.mustBeRemoved;
        if (options.canBeSoftRemoved !== undefined)
            this.canBeSoftRemoved = options.canBeSoftRemoved;
        if (options.canBeRecovered !== undefined)
            this.canBeRecovered = options.canBeRecovered;
        if (options.identifier !== undefined)
            this.identifier = options.identifier;
        if (options.changeMaps !== undefined)
            this.changeMaps.push(...options.changeMaps);
        this.recompute();
    }
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    /**
     * Checks if this subject must be inserted into the database.
     * Subject can be inserted into the database if it is allowed to be inserted (explicitly persisted or by cascades)
     * and if it does not have database entity set.
     */
    get mustBeInserted() {
        return this.canBeInserted && !this.databaseEntity;
    }
    /**
     * Checks if this subject must be updated into the database.
     * Subject can be updated in the database if it is allowed to be updated (explicitly persisted or by cascades)
     * and if it does have differentiated columns or relations.
     */
    get mustBeUpdated() {
        return (this.canBeUpdated &&
            this.identifier &&
            (this.databaseEntityLoaded === false ||
                (this.databaseEntityLoaded && this.databaseEntity)) &&
            // ((this.entity && this.databaseEntity) || (!this.entity && !this.databaseEntity)) &&
            // ensure there are one or more changes for updatable columns
            this.changeMaps.some((change) => !change.column || change.column.isUpdate));
    }
    /**
     * Checks if this subject must be soft-removed into the database.
     * Subject can be updated in the database if it is allowed to be soft-removed (explicitly persisted or by cascades)
     * and if it does have differentiated columns or relations.
     */
    get mustBeSoftRemoved() {
        return (this.canBeSoftRemoved &&
            this.identifier &&
            (this.databaseEntityLoaded === false ||
                (this.databaseEntityLoaded && this.databaseEntity)));
    }
    /**
     * Checks if this subject must be recovered into the database.
     * Subject can be updated in the database if it is allowed to be recovered (explicitly persisted or by cascades)
     * and if it does have differentiated columns or relations.
     */
    get mustBeRecovered() {
        return (this.canBeRecovered &&
            this.identifier &&
            (this.databaseEntityLoaded === false ||
                (this.databaseEntityLoaded && this.databaseEntity)));
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a value set needs to be inserted / updated in the database.
     * Value set is based on the entity and change maps of the subject.
     * Important note: this method pops data from this subject's change maps.
     */
    createValueSetAndPopChangeMap() {
        const changeMapsWithoutValues = [];
        const changeSet = this.changeMaps.reduce((updateMap, changeMap) => {
            let value = changeMap.value;
            if (InstanceChecker_1.InstanceChecker.isSubject(value)) {
                // referenced columns can refer on values both which were just inserted and which were present in the model
                // if entity was just inserted valueSets must contain all values from the entity and values just inserted in the database
                // so, here we check if we have a value set then we simply use it as value to get our reference column values
                // otherwise simply use an entity which cannot be just inserted at the moment and have all necessary data
                value = value.insertedValueSet
                    ? value.insertedValueSet
                    : value.entity;
            }
            // value = changeMap.valueFactory ? changeMap.valueFactory(value) : changeMap.column.createValueMap(value);
            let valueMap;
            if (this.metadata.isJunction && changeMap.column) {
                valueMap = changeMap.column.createValueMap(changeMap.column.referencedColumn.getEntityValue(value));
            }
            else if (changeMap.column) {
                valueMap = changeMap.column.createValueMap(value);
            }
            else if (changeMap.relation) {
                // value can be a related object, for example: post.question = { id: 1 }
                // or value can be a null or direct relation id, e.g. post.question = 1
                // if its a direction relation id then we just set it to the valueMap,
                // however if its an object then we need to extract its relation id map and set it to the valueMap
                if (ObjectUtils_1.ObjectUtils.isObject(value) && !Buffer.isBuffer(value)) {
                    // get relation id, e.g. referenced column name and its value,
                    // for example: { id: 1 } which then will be set to relation, e.g. post.category = { id: 1 }
                    const relationId = changeMap.relation.getRelationIdMap(value);
                    // but relation id can be empty, for example in the case when you insert a new post with category
                    // and both post and category are newly inserted objects (by cascades) and in this case category will not have id
                    // this means we need to insert post without question id and update post's questionId once question be inserted
                    // that's why we create a new changeMap operation for future updation of the post entity
                    if (relationId === undefined) {
                        changeMapsWithoutValues.push(changeMap);
                        this.canBeUpdated = true;
                        return updateMap;
                    }
                    valueMap = changeMap.relation.createValueMap(relationId);
                    this.updatedRelationMaps.push({
                        relation: changeMap.relation,
                        value: relationId,
                    });
                }
                else {
                    // value can be "null" or direct relation id here
                    valueMap = changeMap.relation.createValueMap(value);
                    this.updatedRelationMaps.push({
                        relation: changeMap.relation,
                        value: value,
                    });
                }
            }
            OrmUtils_1.OrmUtils.mergeDeep(updateMap, valueMap);
            return updateMap;
        }, {});
        this.changeMaps = changeMapsWithoutValues;
        return changeSet;
    }
    /**
     * Recomputes entityWithFulfilledIds and identifier when entity changes.
     */
    recompute() {
        if (this.entity) {
            this.entityWithFulfilledIds = Object.assign({}, this.entity);
            if (this.parentSubject) {
                this.metadata.primaryColumns.forEach((primaryColumn) => {
                    if (primaryColumn.relationMetadata &&
                        primaryColumn.relationMetadata.inverseEntityMetadata ===
                            this.parentSubject.metadata) {
                        const value = primaryColumn.referencedColumn.getEntityValue(this.parentSubject.entity);
                        primaryColumn.setEntityValue(this.entityWithFulfilledIds, value);
                    }
                });
            }
            this.identifier = this.metadata.getEntityIdMap(this.entityWithFulfilledIds);
        }
        else if (this.databaseEntity) {
            this.identifier = this.metadata.getEntityIdMap(this.databaseEntity);
        }
    }
}
exports.Subject = Subject;

//# sourceMappingURL=Subject.js.map
