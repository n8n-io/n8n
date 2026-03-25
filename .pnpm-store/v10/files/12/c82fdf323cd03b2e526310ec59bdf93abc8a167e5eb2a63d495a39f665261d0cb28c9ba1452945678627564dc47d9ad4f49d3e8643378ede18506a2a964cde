"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityManager = void 0;
const EntityNotFoundError_1 = require("../error/EntityNotFoundError");
const QueryRunnerProviderAlreadyReleasedError_1 = require("../error/QueryRunnerProviderAlreadyReleasedError");
const NoNeedToReleaseEntityManagerError_1 = require("../error/NoNeedToReleaseEntityManagerError");
const TreeRepository_1 = require("../repository/TreeRepository");
const Repository_1 = require("../repository/Repository");
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
const PlainObjectToNewEntityTransformer_1 = require("../query-builder/transformer/PlainObjectToNewEntityTransformer");
const PlainObjectToDatabaseEntityTransformer_1 = require("../query-builder/transformer/PlainObjectToDatabaseEntityTransformer");
const error_1 = require("../error");
const AbstractRepository_1 = require("../repository/AbstractRepository");
const EntityPersistExecutor_1 = require("../persistence/EntityPersistExecutor");
const ObjectUtils_1 = require("../util/ObjectUtils");
const globals_1 = require("../globals");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
class EntityManager {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection, queryRunner) {
        this["@instanceof"] = Symbol.for("EntityManager");
        // -------------------------------------------------------------------------
        // Protected Properties
        // -------------------------------------------------------------------------
        /**
         * Once created and then reused by repositories.
         * Created as a future replacement for the #repositories to provide a bit more perf optimization.
         */
        this.repositories = new Map();
        /**
         * Once created and then reused by repositories.
         */
        this.treeRepositories = [];
        /**
         * Plain to object transformer used in create and merge operations.
         */
        this.plainObjectToEntityTransformer = new PlainObjectToNewEntityTransformer_1.PlainObjectToNewEntityTransformer();
        this.connection = connection;
        if (queryRunner) {
            this.queryRunner = queryRunner;
            // dynamic: this.queryRunner = manager;
            ObjectUtils_1.ObjectUtils.assign(this.queryRunner, { manager: this });
        }
    }
    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    async transaction(isolationOrRunInTransaction, runInTransactionParam) {
        const isolation = typeof isolationOrRunInTransaction === "string"
            ? isolationOrRunInTransaction
            : undefined;
        const runInTransaction = typeof isolationOrRunInTransaction === "function"
            ? isolationOrRunInTransaction
            : runInTransactionParam;
        if (!runInTransaction) {
            throw new error_1.TypeORMError(`Transaction method requires callback in second parameter if isolation level is supplied.`);
        }
        if (this.queryRunner && this.queryRunner.isReleased)
            throw new QueryRunnerProviderAlreadyReleasedError_1.QueryRunnerProviderAlreadyReleasedError();
        // if query runner is already defined in this class, it means this entity manager was already created for a single connection
        // if its not defined we create a new query runner - single connection where we'll execute all our operations
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        try {
            await queryRunner.startTransaction(isolation);
            const result = await runInTransaction(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        }
        catch (err) {
            try {
                // we throw original error even if rollback thrown an error
                await queryRunner.rollbackTransaction();
            }
            catch (rollbackError) { }
            throw err;
        }
        finally {
            if (!this.queryRunner)
                // if we used a new query runner provider then release it
                await queryRunner.release();
        }
    }
    /**
     * Executes raw SQL query and returns raw database results.
     */
    async query(query, parameters) {
        return this.connection.query(query, parameters, this.queryRunner);
    }
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(entityClass, alias, queryRunner) {
        if (alias) {
            return this.connection.createQueryBuilder(entityClass, alias, queryRunner || this.queryRunner);
        }
        else {
            return this.connection.createQueryBuilder(entityClass ||
                queryRunner ||
                this.queryRunner);
        }
    }
    /**
     * Checks if entity has an id by its Function type or schema name.
     */
    hasId(targetOrEntity, maybeEntity) {
        const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        const metadata = this.connection.getMetadata(target);
        return metadata.hasId(entity);
    }
    /**
     * Gets entity mixed id.
     */
    getId(targetOrEntity, maybeEntity) {
        const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        const metadata = this.connection.getMetadata(target);
        return metadata.getEntityIdMixedMap(entity);
    }
    /**
     * Creates a new entity instance or instances.
     * Can copy properties from the given object into new entities.
     */
    create(entityClass, plainObjectOrObjects) {
        const metadata = this.connection.getMetadata(entityClass);
        if (!plainObjectOrObjects)
            return metadata.create(this.queryRunner);
        if (Array.isArray(plainObjectOrObjects))
            return plainObjectOrObjects.map((plainEntityLike) => this.create(entityClass, plainEntityLike));
        const mergeIntoEntity = metadata.create(this.queryRunner);
        this.plainObjectToEntityTransformer.transform(mergeIntoEntity, plainObjectOrObjects, metadata, true);
        return mergeIntoEntity;
    }
    /**
     * Merges two entities into one new entity.
     */
    merge(entityClass, mergeIntoEntity, ...entityLikes) {
        // todo: throw exception if entity manager is released
        const metadata = this.connection.getMetadata(entityClass);
        entityLikes.forEach((object) => this.plainObjectToEntityTransformer.transform(mergeIntoEntity, object, metadata));
        return mergeIntoEntity;
    }
    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     */
    async preload(entityClass, entityLike) {
        const metadata = this.connection.getMetadata(entityClass);
        const plainObjectToDatabaseEntityTransformer = new PlainObjectToDatabaseEntityTransformer_1.PlainObjectToDatabaseEntityTransformer(this.connection.manager);
        const transformedEntity = await plainObjectToDatabaseEntityTransformer.transform(entityLike, metadata);
        if (transformedEntity)
            return this.merge(entityClass, transformedEntity, entityLike);
        return undefined;
    }
    /**
     * Saves a given entity in the database.
     */
    save(targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        let target = arguments.length > 1 &&
            (typeof targetOrEntity === "function" ||
                InstanceChecker_1.InstanceChecker.isEntitySchema(targetOrEntity) ||
                typeof targetOrEntity === "string")
            ? targetOrEntity
            : undefined;
        const entity = target
            ? maybeEntityOrOptions
            : targetOrEntity;
        const options = target
            ? maybeOptions
            : maybeEntityOrOptions;
        if (InstanceChecker_1.InstanceChecker.isEntitySchema(target))
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute save operation
        return new EntityPersistExecutor_1.EntityPersistExecutor(this.connection, this.queryRunner, "save", target, entity, options)
            .execute()
            .then(() => entity);
    }
    /**
     * Removes a given entity from the database.
     */
    remove(targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        const target = arguments.length > 1 &&
            (typeof targetOrEntity === "function" ||
                InstanceChecker_1.InstanceChecker.isEntitySchema(targetOrEntity) ||
                typeof targetOrEntity === "string")
            ? targetOrEntity
            : undefined;
        const entity = target
            ? maybeEntityOrOptions
            : targetOrEntity;
        const options = target
            ? maybeOptions
            : maybeEntityOrOptions;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute save operation
        return new EntityPersistExecutor_1.EntityPersistExecutor(this.connection, this.queryRunner, "remove", target, entity, options)
            .execute()
            .then(() => entity);
    }
    /**
     * Records the delete date of one or many given entities.
     */
    softRemove(targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        let target = arguments.length > 1 &&
            (typeof targetOrEntity === "function" ||
                InstanceChecker_1.InstanceChecker.isEntitySchema(targetOrEntity) ||
                typeof targetOrEntity === "string")
            ? targetOrEntity
            : undefined;
        const entity = target
            ? maybeEntityOrOptions
            : targetOrEntity;
        const options = target
            ? maybeOptions
            : maybeEntityOrOptions;
        if (InstanceChecker_1.InstanceChecker.isEntitySchema(target))
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute soft-remove operation
        return new EntityPersistExecutor_1.EntityPersistExecutor(this.connection, this.queryRunner, "soft-remove", target, entity, options)
            .execute()
            .then(() => entity);
    }
    /**
     * Recovers one or many given entities.
     */
    recover(targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        let target = arguments.length > 1 &&
            (typeof targetOrEntity === "function" ||
                InstanceChecker_1.InstanceChecker.isEntitySchema(targetOrEntity) ||
                typeof targetOrEntity === "string")
            ? targetOrEntity
            : undefined;
        const entity = target
            ? maybeEntityOrOptions
            : targetOrEntity;
        const options = target
            ? maybeOptions
            : maybeEntityOrOptions;
        if (InstanceChecker_1.InstanceChecker.isEntitySchema(target))
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute recover operation
        return new EntityPersistExecutor_1.EntityPersistExecutor(this.connection, this.queryRunner, "recover", target, entity, options)
            .execute()
            .then(() => entity);
    }
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    async insert(target, entity) {
        return this.createQueryBuilder()
            .insert()
            .into(target)
            .values(entity)
            .execute();
    }
    async upsert(target, entityOrEntities, conflictPathsOrOptions) {
        const metadata = this.connection.getMetadata(target);
        let options;
        if (Array.isArray(conflictPathsOrOptions)) {
            options = {
                conflictPaths: conflictPathsOrOptions,
            };
        }
        else {
            options = conflictPathsOrOptions;
        }
        let entities;
        if (!Array.isArray(entityOrEntities)) {
            entities = [entityOrEntities];
        }
        else {
            entities = entityOrEntities;
        }
        const conflictColumns = metadata.mapPropertyPathsToColumns(Array.isArray(options.conflictPaths)
            ? options.conflictPaths
            : Object.keys(options.conflictPaths));
        const overwriteColumns = metadata.columns.filter((col) => !conflictColumns.includes(col) &&
            entities.some((entity) => typeof col.getEntityValue(entity) !== "undefined"));
        return this.createQueryBuilder()
            .insert()
            .into(target)
            .values(entities)
            .orUpdate([...conflictColumns, ...overwriteColumns].map((col) => col.databaseName), conflictColumns.map((col) => col.databaseName), {
            skipUpdateIfNoValuesChanged: options.skipUpdateIfNoValuesChanged,
            indexPredicate: options.indexPredicate,
            upsertType: options.upsertType ||
                this.connection.driver.supportedUpsertTypes[0],
        })
            .execute();
    }
    /**
     * Updates entity partially. Entity can be found by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    update(target, criteria, partialEntity) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new error_1.TypeORMError(`Empty criteria(s) are not allowed for the update method.`));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .where(criteria)
                .execute();
        }
    }
    /**
     * Deletes entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    delete(targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new error_1.TypeORMError(`Empty criteria(s) are not allowed for the delete method.`));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }
    /**
     * Records the delete date of entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    softDelete(targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new error_1.TypeORMError(`Empty criteria(s) are not allowed for the delete method.`));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .softDelete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .softDelete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }
    /**
     * Restores entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    restore(targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new error_1.TypeORMError(`Empty criteria(s) are not allowed for the delete method.`));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .restore()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .restore()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    }
    /**
     * Checks whether any entity exists with the given options.
     */
    exists(entityClass, options) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(options) ||
            metadata.name)
            .setFindOptions(options || {})
            .getExists();
    }
    /**
     * Checks whether any entity exists with the given conditions.
     */
    async existsBy(entityClass, where) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({ where })
            .getExists();
    }
    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count(entityClass, options) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(options) ||
            metadata.name)
            .setFindOptions(options || {})
            .getCount();
    }
    /**
     * Counts entities that match given conditions.
     * Useful for pagination.
     */
    countBy(entityClass, where) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({ where })
            .getCount();
    }
    /**
     * Return the SUM of a column
     */
    sum(entityClass, columnName, where) {
        return this.callAggregateFun(entityClass, "SUM", columnName, where);
    }
    /**
     * Return the AVG of a column
     */
    average(entityClass, columnName, where) {
        return this.callAggregateFun(entityClass, "AVG", columnName, where);
    }
    /**
     * Return the MIN of a column
     */
    minimum(entityClass, columnName, where) {
        return this.callAggregateFun(entityClass, "MIN", columnName, where);
    }
    /**
     * Return the MAX of a column
     */
    maximum(entityClass, columnName, where) {
        return this.callAggregateFun(entityClass, "MAX", columnName, where);
    }
    async callAggregateFun(entityClass, fnName, columnName, where = {}) {
        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.columns.find((item) => item.propertyPath === columnName);
        if (!column) {
            throw new error_1.TypeORMError(`Column "${columnName}" was not found in table "${metadata.name}"`);
        }
        const result = await this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({ where })
            .select(`${fnName}(${this.connection.driver.escape(column.databaseName)})`, fnName)
            .getRawOne();
        return result[fnName] === null ? null : parseFloat(result[fnName]);
    }
    /**
     * Finds entities that match given find options.
     */
    async find(entityClass, options) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(options) ||
            metadata.name)
            .setFindOptions(options || {})
            .getMany();
    }
    /**
     * Finds entities that match given find options.
     */
    async findBy(entityClass, where) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({ where: where })
            .getMany();
    }
    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(entityClass, options) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, FindOptionsUtils_1.FindOptionsUtils.extractFindManyOptionsAlias(options) ||
            metadata.name)
            .setFindOptions(options || {})
            .getManyAndCount();
    }
    /**
     * Finds entities that match given WHERE conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCountBy(entityClass, where) {
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({ where })
            .getManyAndCount();
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
    async findByIds(entityClass, ids) {
        // if no ids passed, no need to execute a query - just return an empty array of values
        if (!ids.length)
            return Promise.resolve([]);
        const metadata = this.connection.getMetadata(entityClass);
        return this.createQueryBuilder(entityClass, metadata.name)
            .andWhereInIds(ids)
            .getMany();
    }
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - returns null.
     */
    async findOne(entityClass, options) {
        const metadata = this.connection.getMetadata(entityClass);
        // prepare alias for built query
        let alias = metadata.name;
        if (options && options.join) {
            alias = options.join.alias;
        }
        if (!options.where) {
            throw new Error(`You must provide selection conditions in order to find a single row.`);
        }
        // create query builder and apply find options
        return this.createQueryBuilder(entityClass, alias)
            .setFindOptions({
            ...options,
            take: 1,
        })
            .getOne();
    }
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - returns null.
     */
    async findOneBy(entityClass, where) {
        const metadata = this.connection.getMetadata(entityClass);
        // create query builder and apply find options
        return this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({
            where,
            take: 1,
        })
            .getOne();
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
    async findOneById(entityClass, id) {
        const metadata = this.connection.getMetadata(entityClass);
        // create query builder and apply find options
        return this.createQueryBuilder(entityClass, metadata.name)
            .setFindOptions({
            take: 1,
        })
            .whereInIds(metadata.ensureEntityIdMap(id))
            .getOne();
    }
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - rejects with error.
     */
    async findOneOrFail(entityClass, options) {
        return this.findOne(entityClass, options).then((value) => {
            if (value === null) {
                return Promise.reject(new EntityNotFoundError_1.EntityNotFoundError(entityClass, options));
            }
            return Promise.resolve(value);
        });
    }
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - rejects with error.
     */
    async findOneByOrFail(entityClass, where) {
        return this.findOneBy(entityClass, where).then((value) => {
            if (value === null) {
                return Promise.reject(new EntityNotFoundError_1.EntityNotFoundError(entityClass, where));
            }
            return Promise.resolve(value);
        });
    }
    /**
     * Clears all the data from the given table (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    async clear(entityClass) {
        const metadata = this.connection.getMetadata(entityClass);
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        try {
            return await queryRunner.clearTable(metadata.tablePath); // await is needed here because we are using finally
        }
        finally {
            if (!this.queryRunner)
                await queryRunner.release();
        }
    }
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    async increment(entityClass, conditions, propertyPath, value) {
        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.findColumnWithPropertyPath(propertyPath);
        if (!column)
            throw new error_1.TypeORMError(`Column ${propertyPath} was not found in ${metadata.targetName} entity.`);
        if (isNaN(Number(value)))
            throw new error_1.TypeORMError(`Value "${value}" is not a number.`);
        // convert possible embeded path "social.likes" into object { social: { like: () => value } }
        const values = propertyPath
            .split(".")
            .reduceRight((value, key) => ({ [key]: value }), () => this.connection.driver.escape(column.databaseName) +
            " + " +
            value);
        return this.createQueryBuilder(entityClass, "entity")
            .update(entityClass)
            .set(values)
            .where(conditions)
            .execute();
    }
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    async decrement(entityClass, conditions, propertyPath, value) {
        const metadata = this.connection.getMetadata(entityClass);
        const column = metadata.findColumnWithPropertyPath(propertyPath);
        if (!column)
            throw new error_1.TypeORMError(`Column ${propertyPath} was not found in ${metadata.targetName} entity.`);
        if (isNaN(Number(value)))
            throw new error_1.TypeORMError(`Value "${value}" is not a number.`);
        // convert possible embeded path "social.likes" into object { social: { like: () => value } }
        const values = propertyPath
            .split(".")
            .reduceRight((value, key) => ({ [key]: value }), () => this.connection.driver.escape(column.databaseName) +
            " - " +
            value);
        return this.createQueryBuilder(entityClass, "entity")
            .update(entityClass)
            .set(values)
            .where(conditions)
            .execute();
    }
    /**
     * Gets repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getRepository(target) {
        // find already created repository instance and return it if found
        const repoFromMap = this.repositories.get(target);
        if (repoFromMap)
            return repoFromMap;
        // if repository was not found then create it, store its instance and return it
        const newRepository = new Repository_1.Repository(target, this, this.queryRunner);
        this.repositories.set(target, newRepository);
        return newRepository;
    }
    /**
     * Gets tree repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getTreeRepository(target) {
        // tree tables aren't supported by some drivers (mongodb)
        if (this.connection.driver.treeSupport === false)
            throw new error_1.TreeRepositoryNotSupportedError(this.connection.driver);
        // find already created repository instance and return it if found
        const repository = this.treeRepositories.find((repository) => repository.target === target);
        if (repository)
            return repository;
        // check if repository is real tree repository
        const newRepository = new TreeRepository_1.TreeRepository(target, this, this.queryRunner);
        this.treeRepositories.push(newRepository);
        return newRepository;
    }
    /**
     * Creates a new repository instance out of a given Repository and
     * sets current EntityManager instance to it. Used to work with custom repositories
     * in transactions.
     */
    withRepository(repository) {
        const repositoryConstructor = repository.constructor;
        const { target, manager, queryRunner, ...otherRepositoryProperties } = repository;
        return Object.assign(new repositoryConstructor(repository.target, this), {
            ...otherRepositoryProperties,
        });
    }
    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     *
     * @deprecated use Repository.extend to create custom repositories
     */
    getCustomRepository(customRepository) {
        const entityRepositoryMetadataArgs = (0, globals_1.getMetadataArgsStorage)().entityRepositories.find((repository) => {
            return (repository.target ===
                (typeof customRepository === "function"
                    ? customRepository
                    : customRepository.constructor));
        });
        if (!entityRepositoryMetadataArgs)
            throw new error_1.CustomRepositoryNotFoundError(customRepository);
        const entityMetadata = entityRepositoryMetadataArgs.entity
            ? this.connection.getMetadata(entityRepositoryMetadataArgs.entity)
            : undefined;
        const entityRepositoryInstance = new entityRepositoryMetadataArgs.target(this, entityMetadata);
        // NOTE: dynamic access to protected properties. We need this to prevent unwanted properties in those classes to be exposed,
        // however we need these properties for internal work of the class
        if (entityRepositoryInstance instanceof AbstractRepository_1.AbstractRepository) {
            if (!entityRepositoryInstance["manager"])
                entityRepositoryInstance["manager"] = this;
        }
        else {
            if (!entityMetadata)
                throw new error_1.CustomRepositoryCannotInheritRepositoryError(customRepository);
            entityRepositoryInstance["manager"] = this;
            entityRepositoryInstance["metadata"] = entityMetadata;
        }
        return entityRepositoryInstance;
    }
    /**
     * Releases all resources used by entity manager.
     * This is used when entity manager is created with a single query runner,
     * and this single query runner needs to be released after job with entity manager is done.
     */
    async release() {
        if (!this.queryRunner)
            throw new NoNeedToReleaseEntityManagerError_1.NoNeedToReleaseEntityManagerError();
        return this.queryRunner.release();
    }
}
exports.EntityManager = EntityManager;

//# sourceMappingURL=EntityManager.js.map
