"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlainObjectToDatabaseEntityTransformer = void 0;
/**
 */
class LoadMapItem {
    constructor(plainEntity, metadata, parentLoadMapItem, relation) {
        this.plainEntity = plainEntity;
        this.metadata = metadata;
        this.parentLoadMapItem = parentLoadMapItem;
        this.relation = relation;
    }
    get target() {
        return this.metadata.target;
    }
    get id() {
        return this.metadata.getEntityIdMixedMap(this.plainEntity);
    }
}
class LoadMap {
    constructor() {
        this.loadMapItems = [];
    }
    get mainLoadMapItem() {
        return this.loadMapItems.find((item) => !item.relation && !item.parentLoadMapItem);
    }
    addLoadMap(newLoadMap) {
        const item = this.loadMapItems.find((item) => item.target === newLoadMap.target && item.id === newLoadMap.id);
        if (!item)
            this.loadMapItems.push(newLoadMap);
    }
    fillEntities(target, entities) {
        entities.forEach((entity) => {
            const item = this.loadMapItems.find((loadMapItem) => {
                return (loadMapItem.target === target &&
                    loadMapItem.metadata.compareEntities(entity, loadMapItem.plainEntity));
            });
            if (item)
                item.entity = entity;
        });
    }
    groupByTargetIds() {
        const groups = [];
        this.loadMapItems.forEach((loadMapItem) => {
            let group = groups.find((group) => group.target === loadMapItem.target);
            if (!group) {
                group = { target: loadMapItem.target, ids: [] };
                groups.push(group);
            }
            group.ids.push(loadMapItem.id);
        });
        return groups;
    }
}
/**
 * Transforms plain old javascript object
 * Entity is constructed based on its entity metadata.
 */
class PlainObjectToDatabaseEntityTransformer {
    constructor(manager) {
        this.manager = manager;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    async transform(plainObject, metadata) {
        // if plain object does not have id then nothing to load really
        if (!metadata.hasAllPrimaryKeys(plainObject))
            return Promise.reject("Given object does not have a primary column, cannot transform it to database entity.");
        // create a special load map that will hold all metadata that will be used to operate with entities easily
        const loadMap = new LoadMap();
        const fillLoadMap = (entity, entityMetadata, parentLoadMapItem, relation) => {
            const item = new LoadMapItem(entity, entityMetadata, parentLoadMapItem, relation);
            loadMap.addLoadMap(item);
            entityMetadata
                .extractRelationValuesFromEntity(entity, metadata.relations)
                .filter((value) => value !== null && value !== undefined)
                .forEach(([relation, value, inverseEntityMetadata]) => fillLoadMap(value, inverseEntityMetadata, item, relation));
        };
        fillLoadMap(plainObject, metadata);
        // load all entities and store them in the load map
        await Promise.all(loadMap.groupByTargetIds().map((targetWithIds) => {
            // todo: fix type hinting
            return this.manager
                .findByIds(targetWithIds.target, targetWithIds.ids)
                .then((entities) => loadMap.fillEntities(targetWithIds.target, entities));
        }));
        // go through each item in the load map and set their entity relationship using metadata stored in load map
        loadMap.loadMapItems.forEach((loadMapItem) => {
            if (!loadMapItem.relation ||
                !loadMapItem.entity ||
                !loadMapItem.parentLoadMapItem ||
                !loadMapItem.parentLoadMapItem.entity)
                return;
            if (loadMapItem.relation.isManyToMany ||
                loadMapItem.relation.isOneToMany) {
                if (!loadMapItem.parentLoadMapItem.entity[loadMapItem.relation.propertyName])
                    loadMapItem.parentLoadMapItem.entity[loadMapItem.relation.propertyName] = [];
                loadMapItem.parentLoadMapItem.entity[loadMapItem.relation.propertyName].push(loadMapItem.entity);
            }
            else {
                loadMapItem.parentLoadMapItem.entity[loadMapItem.relation.propertyName] = loadMapItem.entity;
            }
        });
        return loadMap.mainLoadMapItem
            ? loadMap.mainLoadMapItem.entity
            : undefined;
    }
}
exports.PlainObjectToDatabaseEntityTransformer = PlainObjectToDatabaseEntityTransformer;

//# sourceMappingURL=PlainObjectToDatabaseEntityTransformer.js.map
