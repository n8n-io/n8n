"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repository = void 0;
/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
class Repository {
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    /**
     * Entity metadata of the entity current repository manages.
     */
    get metadata() {
        return this.manager.connection.getMetadata(this.target);
    }
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(target, manager, queryRunner) {
        this.target = target;
        this.manager = manager;
        this.queryRunner = queryRunner;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(alias, queryRunner) {
        return this.manager.createQueryBuilder(this.metadata.target, alias || this.metadata.targetName, queryRunner || this.queryRunner);
    }
    /**
     * Checks if entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    hasId(entity) {
        return this.manager.hasId(this.metadata.target, entity);
    }
    /**
     * Gets entity mixed id.
     */
    getId(entity) {
        return this.manager.getId(this.metadata.target, entity);
    }
    /**
     * Creates a new entity instance or instances.
     * Can copy properties from the given object into new entities.
     */
    create(plainEntityLikeOrPlainEntityLikes) {
        return this.manager.create(this.metadata.target, plainEntityLikeOrPlainEntityLikes);
    }
    /**
     * Merges multiple entities (or entity-like objects) into a given entity.
     */
    merge(mergeIntoEntity, ...entityLikes) {
        return this.manager.merge(this.metadata.target, mergeIntoEntity, ...entityLikes);
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
    preload(entityLike) {
        return this.manager.preload(this.metadata.target, entityLike);
    }
    /**
     * Saves one or many given entities.
     */
    save(entityOrEntities, options) {
        return this.manager.save(this.metadata.target, entityOrEntities, options);
    }
    /**
     * Removes one or many given entities.
     */
    remove(entityOrEntities, options) {
        return this.manager.remove(this.metadata.target, entityOrEntities, options);
    }
    /**
     * Records the delete date of one or many given entities.
     */
    softRemove(entityOrEntities, options) {
        return this.manager.softRemove(this.metadata.target, entityOrEntities, options);
    }
    /**
     * Recovers one or many given entities.
     */
    recover(entityOrEntities, options) {
        return this.manager.recover(this.metadata.target, entityOrEntities, options);
    }
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     */
    insert(entity) {
        return this.manager.insert(this.metadata.target, entity);
    }
    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    update(criteria, partialEntity) {
        return this.manager.update(this.metadata.target, criteria, partialEntity);
    }
    /**
     * Inserts a given entity into the database, unless a unique constraint conflicts then updates the entity
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT ... ON CONFLICT DO UPDATE/ON DUPLICATE KEY UPDATE query.
     */
    upsert(entityOrEntities, conflictPathsOrOptions) {
        return this.manager.upsert(this.metadata.target, entityOrEntities, conflictPathsOrOptions);
    }
    /**
     * Deletes entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    delete(criteria) {
        return this.manager.delete(this.metadata.target, criteria);
    }
    /**
     * Records the delete date of entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    softDelete(criteria) {
        return this.manager.softDelete(this.metadata.target, criteria);
    }
    /**
     * Restores entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    restore(criteria) {
        return this.manager.restore(this.metadata.target, criteria);
    }
    /**
     * Checks whether any entity exists that matches the given options.
     *
     * @deprecated use `exists` method instead, for example:
     *
     * .exists()
     */
    exist(options) {
        return this.manager.exists(this.metadata.target, options);
    }
    /**
     * Checks whether any entity exists that matches the given options.
     */
    exists(options) {
        return this.manager.exists(this.metadata.target, options);
    }
    /**
     * Checks whether any entity exists that matches the given conditions.
     */
    existsBy(where) {
        return this.manager.existsBy(this.metadata.target, where);
    }
    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count(options) {
        return this.manager.count(this.metadata.target, options);
    }
    /**
     * Counts entities that match given conditions.
     * Useful for pagination.
     */
    countBy(where) {
        return this.manager.countBy(this.metadata.target, where);
    }
    /**
     * Return the SUM of a column
     */
    sum(columnName, where) {
        return this.manager.sum(this.metadata.target, columnName, where);
    }
    /**
     * Return the AVG of a column
     */
    average(columnName, where) {
        return this.manager.average(this.metadata.target, columnName, where);
    }
    /**
     * Return the MIN of a column
     */
    minimum(columnName, where) {
        return this.manager.minimum(this.metadata.target, columnName, where);
    }
    /**
     * Return the MAX of a column
     */
    maximum(columnName, where) {
        return this.manager.maximum(this.metadata.target, columnName, where);
    }
    /**
     * Finds entities that match given find options.
     */
    async find(options) {
        return this.manager.find(this.metadata.target, options);
    }
    /**
     * Finds entities that match given find options.
     */
    async findBy(where) {
        return this.manager.findBy(this.metadata.target, where);
    }
    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(options) {
        return this.manager.findAndCount(this.metadata.target, options);
    }
    /**
     * Finds entities that match given WHERE conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCountBy(where) {
        return this.manager.findAndCountBy(this.metadata.target, where);
    }
    /**
     * Finds entities with ids.
     * Optionally find options or conditions can be applied.
     *
     * @deprecated use `findBy` method instead in conjunction with `In` operator, for example:
     *
     * .findBy({
     *     id: In([1, 2, 3])
     * })
     */
    async findByIds(ids) {
        return this.manager.findByIds(this.metadata.target, ids);
    }
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - returns null.
     */
    async findOne(options) {
        return this.manager.findOne(this.metadata.target, options);
    }
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - returns null.
     */
    async findOneBy(where) {
        return this.manager.findOneBy(this.metadata.target, where);
    }
    /**
     * Finds first entity that matches given id.
     * If entity was not found in the database - returns null.
     *
     * @deprecated use `findOneBy` method instead in conjunction with `In` operator, for example:
     *
     * .findOneBy({
     *     id: 1 // where "id" is your primary column name
     * })
     */
    async findOneById(id) {
        return this.manager.findOneById(this.metadata.target, id);
    }
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - rejects with error.
     */
    async findOneOrFail(options) {
        return this.manager.findOneOrFail(this.metadata.target, options);
    }
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - rejects with error.
     */
    async findOneByOrFail(where) {
        return this.manager.findOneByOrFail(this.metadata.target, where);
    }
    /**
     * Executes a raw SQL query and returns a raw database results.
     * Raw query execution is supported only by relational databases (MongoDB is not supported).
     */
    query(query, parameters) {
        return this.manager.query(query, parameters);
    }
    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    clear() {
        return this.manager.clear(this.metadata.target);
    }
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    increment(conditions, propertyPath, value) {
        return this.manager.increment(this.metadata.target, conditions, propertyPath, value);
    }
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    decrement(conditions, propertyPath, value) {
        return this.manager.decrement(this.metadata.target, conditions, propertyPath, value);
    }
    /**
     * Extends repository with provided functions.
     */
    extend(customs) {
        // return {
        //     ...this,
        //     ...custom
        // };
        const thisRepo = this.constructor;
        const { target, manager, queryRunner } = this;
        const ChildClass = class extends thisRepo {
            constructor(target, manager, queryRunner) {
                super(target, manager, queryRunner);
            }
        };
        for (const custom in customs)
            ChildClass.prototype[custom] = customs[custom];
        return new ChildClass(target, manager, queryRunner);
    }
}
exports.Repository = Repository;

//# sourceMappingURL=Repository.js.map
