"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEntity = void 0;
const ObjectUtils_1 = require("../util/ObjectUtils");
/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
class BaseEntity {
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Checks if entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    hasId() {
        const baseEntity = this.constructor;
        return baseEntity.getRepository().hasId(this);
    }
    /**
     * Saves current entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save(options) {
        const baseEntity = this.constructor;
        return baseEntity.getRepository().save(this, options);
    }
    /**
     * Removes current entity from the database.
     */
    remove(options) {
        const baseEntity = this.constructor;
        return baseEntity.getRepository().remove(this, options);
    }
    /**
     * Records the delete date of current entity.
     */
    softRemove(options) {
        const baseEntity = this.constructor;
        return baseEntity.getRepository().softRemove(this, options);
    }
    /**
     * Recovers a given entity in the database.
     */
    recover(options) {
        const baseEntity = this.constructor;
        return baseEntity.getRepository().recover(this, options);
    }
    /**
     * Reloads entity data from the database.
     */
    async reload() {
        const baseEntity = this.constructor;
        const id = baseEntity.getRepository().metadata.getEntityIdMap(this);
        if (!id) {
            throw new Error(`Entity doesn't have id-s set, cannot reload entity`);
        }
        const reloadedEntity = await baseEntity
            .getRepository()
            .findOneByOrFail(id);
        ObjectUtils_1.ObjectUtils.assign(this, reloadedEntity);
    }
    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------
    /**
     * Sets DataSource to be used by entity.
     */
    static useDataSource(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Gets current entity's Repository.
     */
    static getRepository() {
        const dataSource = this.dataSource;
        if (!dataSource)
            throw new Error(`DataSource is not set for this entity.`);
        return dataSource.getRepository(this);
    }
    /**
     * Returns object that is managed by this repository.
     * If this repository manages entity from schema,
     * then it returns a name of that schema instead.
     */
    static get target() {
        return this.getRepository().target;
    }
    /**
     * Checks entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    static hasId(entity) {
        return this.getRepository().hasId(entity);
    }
    /**
     * Gets entity mixed id.
     */
    static getId(entity) {
        return this.getRepository().getId(entity);
    }
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    static createQueryBuilder(alias) {
        return this.getRepository().createQueryBuilder(alias);
    }
    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that present in entity schema.
     */
    static create(entityOrEntities) {
        return this.getRepository().create(entityOrEntities);
    }
    /**
     * Merges multiple entities (or entity-like objects) into a given entity.
     */
    static merge(mergeIntoEntity, ...entityLikes) {
        return this.getRepository().merge(mergeIntoEntity, ...entityLikes);
    }
    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     *
     * Note that given entity-like object must have an entity id / primary key to find entity by.
     * Returns undefined if entity with given id was not found.
     */
    static preload(entityLike) {
        const thisRepository = this.getRepository();
        return thisRepository.preload(entityLike);
    }
    /**
     * Saves one or many given entities.
     */
    static save(entityOrEntities, options) {
        return this.getRepository().save(entityOrEntities, options);
    }
    /**
     * Removes one or many given entities.
     */
    static remove(entityOrEntities, options) {
        return this.getRepository().remove(entityOrEntities, options);
    }
    /**
     * Records the delete date of one or many given entities.
     */
    static softRemove(entityOrEntities, options) {
        return this.getRepository().softRemove(entityOrEntities, options);
    }
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     */
    static insert(entity) {
        return this.getRepository().insert(entity);
    }
    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    static update(criteria, partialEntity) {
        return this.getRepository().update(criteria, partialEntity);
    }
    /**
     * Inserts a given entity into the database, unless a unique constraint conflicts then updates the entity
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT ... ON CONFLICT DO UPDATE/ON DUPLICATE KEY UPDATE query.
     */
    static upsert(entityOrEntities, conflictPathsOrOptions) {
        return this.getRepository().upsert(entityOrEntities, conflictPathsOrOptions);
    }
    /**
     * Deletes entities by a given criteria.
     * Unlike remove method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    static delete(criteria) {
        return this.getRepository().delete(criteria);
    }
    /**
     * Checks whether any entity exists that matches the given options.
     */
    static exists(options) {
        return this.getRepository().exists(options);
    }
    /**
     * Checks whether any entity exists that matches the given conditions.
     */
    static existsBy(where) {
        return this.getRepository().existsBy(where);
    }
    /**
     * Counts entities that match given options.
     */
    static count(options) {
        return this.getRepository().count(options);
    }
    /**
     * Counts entities that match given WHERE conditions.
     */
    static countBy(where) {
        return this.getRepository().countBy(where);
    }
    /**
     * Return the SUM of a column
     */
    static sum(columnName, where) {
        return this.getRepository().sum(columnName, where);
    }
    /**
     * Return the AVG of a column
     */
    static average(columnName, where) {
        return this.getRepository().average(columnName, where);
    }
    /**
     * Return the MIN of a column
     */
    static minimum(columnName, where) {
        return this.getRepository().minimum(columnName, where);
    }
    /**
     * Return the MAX of a column
     */
    static maximum(columnName, where) {
        return this.getRepository().maximum(columnName, where);
    }
    /**
     * Finds entities that match given options.
     */
    static find(options) {
        return this.getRepository().find(options);
    }
    /**
     * Finds entities that match given WHERE conditions.
     */
    static findBy(where) {
        return this.getRepository().findBy(where);
    }
    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    static findAndCount(options) {
        return this.getRepository().findAndCount(options);
    }
    /**
     * Finds entities that match given WHERE conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    static findAndCountBy(where) {
        return this.getRepository().findAndCountBy(where);
    }
    /**
     * Finds entities by ids.
     * Optionally find options can be applied.
     *
     * @deprecated use `findBy` method instead in conjunction with `In` operator, for example:
     *
     * .findBy({
     *     id: In([1, 2, 3])
     * })
     */
    static findByIds(ids) {
        return this.getRepository().findByIds(ids);
    }
    /**
     * Finds first entity that matches given conditions.
     */
    static findOne(options) {
        return this.getRepository().findOne(options);
    }
    /**
     * Finds first entity that matches given conditions.
     */
    static findOneBy(where) {
        return this.getRepository().findOneBy(where);
    }
    /**
     * Finds first entity that matches given options.
     *
     * @deprecated use `findOneBy` method instead in conjunction with `In` operator, for example:
     *
     * .findOneBy({
     *     id: 1 // where "id" is your primary column name
     * })
     */
    static findOneById(id) {
        return this.getRepository().findOneById(id);
    }
    /**
     * Finds first entity that matches given conditions.
     */
    static findOneOrFail(options) {
        return this.getRepository().findOneOrFail(options);
    }
    /**
     * Finds first entity that matches given conditions.
     */
    static findOneByOrFail(where) {
        return this.getRepository().findOneByOrFail(where);
    }
    /**
     * Executes a raw SQL query and returns a raw database results.
     * Raw query execution is supported only by relational databases (MongoDB is not supported).
     */
    static query(query, parameters) {
        return this.getRepository().query(query, parameters);
    }
    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     */
    static clear() {
        return this.getRepository().clear();
    }
}
exports.BaseEntity = BaseEntity;

//# sourceMappingURL=BaseEntity.js.map
