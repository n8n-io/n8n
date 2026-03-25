"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectQueryBuilder = void 0;
const RawSqlResultsToEntityTransformer_1 = require("./transformer/RawSqlResultsToEntityTransformer");
const PessimisticLockTransactionRequiredError_1 = require("../error/PessimisticLockTransactionRequiredError");
const NoVersionOrUpdateDateColumnError_1 = require("../error/NoVersionOrUpdateDateColumnError");
const OptimisticLockVersionMismatchError_1 = require("../error/OptimisticLockVersionMismatchError");
const OptimisticLockCanNotBeUsedError_1 = require("../error/OptimisticLockCanNotBeUsedError");
const JoinAttribute_1 = require("./JoinAttribute");
const RelationIdAttribute_1 = require("./relation-id/RelationIdAttribute");
const RelationCountAttribute_1 = require("./relation-count/RelationCountAttribute");
const RelationIdLoader_1 = require("./relation-id/RelationIdLoader");
const RelationIdLoader_2 = require("./RelationIdLoader");
const RelationIdMetadataToAttributeTransformer_1 = require("./relation-id/RelationIdMetadataToAttributeTransformer");
const RelationCountLoader_1 = require("./relation-count/RelationCountLoader");
const RelationCountMetadataToAttributeTransformer_1 = require("./relation-count/RelationCountMetadataToAttributeTransformer");
const QueryBuilder_1 = require("./QueryBuilder");
const LockNotSupportedOnGivenDriverError_1 = require("../error/LockNotSupportedOnGivenDriverError");
const OffsetWithoutLimitNotSupportedError_1 = require("../error/OffsetWithoutLimitNotSupportedError");
const ObjectUtils_1 = require("../util/ObjectUtils");
const DriverUtils_1 = require("../driver/DriverUtils");
const EntityNotFoundError_1 = require("../error/EntityNotFoundError");
const error_1 = require("../error");
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
const OrmUtils_1 = require("../util/OrmUtils");
const EntityPropertyNotFoundError_1 = require("../error/EntityPropertyNotFoundError");
const InstanceChecker_1 = require("../util/InstanceChecker");
const FindOperator_1 = require("../find-options/FindOperator");
const ApplyValueTransformers_1 = require("../util/ApplyValueTransformers");
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
class SelectQueryBuilder extends QueryBuilder_1.QueryBuilder {
    constructor() {
        super(...arguments);
        this["@instanceof"] = Symbol.for("SelectQueryBuilder");
        this.findOptions = {};
        this.selects = [];
        this.joins = [];
        this.conditions = "";
        this.orderBys = [];
        this.relationMetadatas = [];
    }
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Gets generated SQL query without parameters being replaced.
     */
    getQuery() {
        let sql = this.createComment();
        sql += this.createCteExpression();
        sql += this.createSelectExpression();
        sql += this.createJoinExpression();
        sql += this.createWhereExpression();
        sql += this.createGroupByExpression();
        sql += this.createHavingExpression();
        sql += this.createOrderByExpression();
        sql += this.createLimitOffsetExpression();
        sql += this.createLockExpression();
        sql = sql.trim();
        if (this.expressionMap.subQuery)
            sql = "(" + sql + ")";
        return this.replacePropertyNamesForTheWholeQuery(sql);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    setFindOptions(findOptions) {
        this.findOptions = findOptions;
        this.applyFindOptions();
        return this;
    }
    /**
     * Creates a subquery - query that can be used inside other queries.
     */
    subQuery() {
        const qb = this.createQueryBuilder();
        qb.expressionMap.subQuery = true;
        qb.parentQueryBuilder = this;
        return qb;
    }
    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection, selectionAliasName) {
        this.expressionMap.queryType = "select";
        if (Array.isArray(selection)) {
            this.expressionMap.selects = selection.map((selection) => ({
                selection: selection,
            }));
        }
        else if (typeof selection === "function") {
            const subQueryBuilder = selection(this.subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            this.expressionMap.selects.push({
                selection: subQueryBuilder.getQuery(),
                aliasName: selectionAliasName,
            });
        }
        else if (selection) {
            this.expressionMap.selects = [
                { selection: selection, aliasName: selectionAliasName },
            ];
        }
        return this;
    }
    /**
     * Adds new selection to the SELECT query.
     */
    addSelect(selection, selectionAliasName) {
        if (!selection)
            return this;
        if (Array.isArray(selection)) {
            this.expressionMap.selects = this.expressionMap.selects.concat(selection.map((selection) => ({ selection: selection })));
        }
        else if (typeof selection === "function") {
            const subQueryBuilder = selection(this.subQuery());
            this.setParameters(subQueryBuilder.getParameters());
            this.expressionMap.selects.push({
                selection: subQueryBuilder.getQuery(),
                aliasName: selectionAliasName,
            });
        }
        else if (selection) {
            this.expressionMap.selects.push({
                selection: selection,
                aliasName: selectionAliasName,
            });
        }
        return this;
    }
    /**
     * Set max execution time.
     * @param milliseconds
     */
    maxExecutionTime(milliseconds) {
        this.expressionMap.maxExecutionTime = milliseconds;
        return this;
    }
    /**
     * Sets whether the selection is DISTINCT.
     */
    distinct(distinct = true) {
        this.expressionMap.selectDistinct = distinct;
        return this;
    }
    /**
     * Sets the distinct on clause for Postgres.
     */
    distinctOn(distinctOn) {
        this.expressionMap.selectDistinctOn = distinctOn;
        return this;
    }
    fromDummy() {
        return this.from(this.connection.driver.dummyTableName ??
            "(SELECT 1 AS dummy_column)", "dummy_table");
    }
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     * Removes all previously set from-s.
     */
    from(entityTarget, aliasName) {
        const mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return this;
    }
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    addFrom(entityTarget, aliasName) {
        const alias = this.createFromAlias(entityTarget, aliasName);
        if (!this.expressionMap.mainAlias)
            this.expressionMap.setMainAlias(alias);
        return this;
    }
    /**
     * INNER JOINs (without selection).
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoin(entityOrProperty, alias, condition, parameters) {
        this.join("INNER", entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * LEFT JOINs (without selection).
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoin(entityOrProperty, alias, condition, parameters) {
        this.join("LEFT", entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * INNER JOINs and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndSelect(entityOrProperty, alias, condition, parameters) {
        this.addSelect(alias);
        this.innerJoin(entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * LEFT JOINs and adds all selection properties to SELECT.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndSelect(entityOrProperty, alias, condition, parameters) {
        this.addSelect(alias);
        this.leftJoin(entityOrProperty, alias, condition, parameters);
        return this;
    }
    /**
     * INNER JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapMany(mapToProperty, entityOrProperty, alias, condition, parameters) {
        this.addSelect(alias);
        this.join("INNER", entityOrProperty, alias, condition, parameters, mapToProperty, true);
        return this;
    }
    /**
     * INNER JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    innerJoinAndMapOne(mapToProperty, entityOrProperty, alias, condition, parameters, mapAsEntity) {
        this.addSelect(alias);
        this.join("INNER", entityOrProperty, alias, condition, parameters, mapToProperty, false, mapAsEntity);
        return this;
    }
    /**
     * LEFT JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there are multiple rows of selecting data, and mapped result will be an array.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapMany(mapToProperty, entityOrProperty, alias, condition, parameters) {
        this.addSelect(alias);
        this.join("LEFT", entityOrProperty, alias, condition, parameters, mapToProperty, true);
        return this;
    }
    /**
     * LEFT JOINs, SELECTs the data returned by a join and MAPs all that data to some entity's property.
     * This is extremely useful when you want to select some data and map it to some virtual property.
     * It will assume that there is a single row of selecting data, and mapped result will be a single selected value.
     * You also need to specify an alias of the joined data.
     * Optionally, you can add condition and parameters used in condition.
     */
    leftJoinAndMapOne(mapToProperty, entityOrProperty, alias, condition, parameters, mapAsEntity) {
        this.addSelect(alias);
        this.join("LEFT", entityOrProperty, alias, condition, parameters, mapToProperty, false, mapAsEntity);
        return this;
    }
    /**
     * LEFT JOINs relation id and maps it into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationIdAndMap(mapToProperty, relationName, aliasNameOrOptions, queryBuilderFactory) {
        const relationIdAttribute = new RelationIdAttribute_1.RelationIdAttribute(this.expressionMap);
        relationIdAttribute.mapToProperty = mapToProperty;
        relationIdAttribute.relationName = relationName;
        if (typeof aliasNameOrOptions === "string")
            relationIdAttribute.alias = aliasNameOrOptions;
        if (typeof aliasNameOrOptions === "object" &&
            aliasNameOrOptions.disableMixedMap)
            relationIdAttribute.disableMixedMap = true;
        relationIdAttribute.queryBuilderFactory = queryBuilderFactory;
        this.expressionMap.relationIdAttributes.push(relationIdAttribute);
        if (relationIdAttribute.relation.junctionEntityMetadata) {
            this.expressionMap.createAlias({
                type: "other",
                name: relationIdAttribute.junctionAlias,
                metadata: relationIdAttribute.relation.junctionEntityMetadata,
            });
        }
        return this;
    }
    /**
     * Counts number of entities of entity's relation and maps the value into some entity's property.
     * Optionally, you can add condition and parameters used in condition.
     */
    loadRelationCountAndMap(mapToProperty, relationName, aliasName, queryBuilderFactory) {
        const relationCountAttribute = new RelationCountAttribute_1.RelationCountAttribute(this.expressionMap);
        relationCountAttribute.mapToProperty = mapToProperty;
        relationCountAttribute.relationName = relationName;
        relationCountAttribute.alias = aliasName;
        relationCountAttribute.queryBuilderFactory = queryBuilderFactory;
        this.expressionMap.relationCountAttributes.push(relationCountAttribute);
        this.expressionMap.createAlias({
            type: "other",
            name: relationCountAttribute.junctionAlias,
        });
        if (relationCountAttribute.relation.junctionEntityMetadata) {
            this.expressionMap.createAlias({
                type: "other",
                name: relationCountAttribute.junctionAlias,
                metadata: relationCountAttribute.relation.junctionEntityMetadata,
            });
        }
        return this;
    }
    /**
     * Loads all relation ids for all relations of the selected entity.
     * All relation ids will be mapped to relation property themself.
     * If array of strings is given then loads only relation ids of the given properties.
     */
    loadAllRelationIds(options) {
        // todo: add skip relations
        this.expressionMap.mainAlias.metadata.relations.forEach((relation) => {
            if (options !== undefined &&
                options.relations !== undefined &&
                options.relations.indexOf(relation.propertyPath) === -1)
                return;
            this.loadRelationIdAndMap(this.expressionMap.mainAlias.name +
                "." +
                relation.propertyPath, this.expressionMap.mainAlias.name +
                "." +
                relation.propertyPath, options);
        });
        return this;
    }
    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(where, parameters) {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        const condition = this.getWhereCondition(where);
        if (condition) {
            this.expressionMap.wheres = [
                { type: "simple", condition: condition },
            ];
        }
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(where, parameters) {
        this.expressionMap.wheres.push({
            type: "and",
            condition: this.getWhereCondition(where),
        });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(where, parameters) {
        this.expressionMap.wheres.push({
            type: "or",
            condition: this.getWhereCondition(where),
        });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Sets a new where EXISTS clause
     */
    whereExists(subQuery) {
        return this.where(...this.getExistsCondition(subQuery));
    }
    /**
     * Adds a new AND where EXISTS clause
     */
    andWhereExists(subQuery) {
        return this.andWhere(...this.getExistsCondition(subQuery));
    }
    /**
     * Adds a new OR where EXISTS clause
     */
    orWhereExists(subQuery) {
        return this.orWhere(...this.getExistsCondition(subQuery));
    }
    /**
     * Adds new AND WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    whereInIds(ids) {
        return this.where(this.getWhereInIdsCondition(ids));
    }
    /**
     * Adds new AND WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    andWhereInIds(ids) {
        return this.andWhere(this.getWhereInIdsCondition(ids));
    }
    /**
     * Adds new OR WHERE with conditions for the given ids.
     *
     * Ids are mixed.
     * It means if you have single primary key you can pass a simple id values, for example [1, 2, 3].
     * If you have multiple primary keys you need to pass object with property names and values specified,
     * for example [{ firstId: 1, secondId: 2 }, { firstId: 2, secondId: 3 }, ...]
     */
    orWhereInIds(ids) {
        return this.orWhere(this.getWhereInIdsCondition(ids));
    }
    /**
     * Sets HAVING condition in the query builder.
     * If you had previously HAVING expression defined,
     * calling this function will override previously set HAVING conditions.
     * Additionally you can add parameters used in where expression.
     */
    having(having, parameters) {
        this.expressionMap.havings.push({ type: "simple", condition: having });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new AND HAVING condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andHaving(having, parameters) {
        this.expressionMap.havings.push({ type: "and", condition: having });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Adds new OR HAVING condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orHaving(having, parameters) {
        this.expressionMap.havings.push({ type: "or", condition: having });
        if (parameters)
            this.setParameters(parameters);
        return this;
    }
    /**
     * Sets GROUP BY condition in the query builder.
     * If you had previously GROUP BY expression defined,
     * calling this function will override previously set GROUP BY conditions.
     */
    groupBy(groupBy) {
        if (groupBy) {
            this.expressionMap.groupBys = [groupBy];
        }
        else {
            this.expressionMap.groupBys = [];
        }
        return this;
    }
    /**
     * Adds GROUP BY condition in the query builder.
     */
    addGroupBy(groupBy) {
        this.expressionMap.groupBys.push(groupBy);
        return this;
    }
    /**
     * Enables time travelling for the current query (only supported by cockroach currently)
     */
    timeTravelQuery(timeTravelFn) {
        return this;
    }
    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(sort, order = "ASC", nulls) {
        if (order !== undefined && order !== "ASC" && order !== "DESC")
            throw new error_1.TypeORMError(`SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.`);
        if (nulls !== undefined &&
            nulls !== "NULLS FIRST" &&
            nulls !== "NULLS LAST")
            throw new error_1.TypeORMError(`SelectQueryBuilder.addOrderBy "nulls" can accept only "NULLS FIRST" and "NULLS LAST" values.`);
        if (sort) {
            if (typeof sort === "object") {
                this.expressionMap.orderBys = sort;
            }
            else {
                if (nulls) {
                    this.expressionMap.orderBys = {
                        [sort]: { order, nulls },
                    };
                }
                else {
                    this.expressionMap.orderBys = { [sort]: order };
                }
            }
        }
        else {
            this.expressionMap.orderBys = {};
        }
        return this;
    }
    /**
     * Adds ORDER BY condition in the query builder.
     */
    addOrderBy(sort, order = "ASC", nulls) {
        if (order !== undefined && order !== "ASC" && order !== "DESC")
            throw new error_1.TypeORMError(`SelectQueryBuilder.addOrderBy "order" can accept only "ASC" and "DESC" values.`);
        if (nulls !== undefined &&
            nulls !== "NULLS FIRST" &&
            nulls !== "NULLS LAST")
            throw new error_1.TypeORMError(`SelectQueryBuilder.addOrderBy "nulls" can accept only "NULLS FIRST" and "NULLS LAST" values.`);
        if (nulls) {
            this.expressionMap.orderBys[sort] = { order, nulls };
        }
        else {
            this.expressionMap.orderBys[sort] = order;
        }
        return this;
    }
    /**
     * Sets LIMIT - maximum number of rows to be selected.
     * NOTE that it may not work as you expect if you are using joins.
     * If you want to implement pagination, and you are having join in your query,
     * then use the take method instead.
     */
    limit(limit) {
        this.expressionMap.limit = this.normalizeNumber(limit);
        if (this.expressionMap.limit !== undefined &&
            isNaN(this.expressionMap.limit))
            throw new error_1.TypeORMError(`Provided "limit" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Sets OFFSET - selection offset.
     * NOTE that it may not work as you expect if you are using joins.
     * If you want to implement pagination, and you are having join in your query,
     * then use the skip method instead.
     */
    offset(offset) {
        this.expressionMap.offset = this.normalizeNumber(offset);
        if (this.expressionMap.offset !== undefined &&
            isNaN(this.expressionMap.offset))
            throw new error_1.TypeORMError(`Provided "offset" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Sets maximal number of entities to take.
     */
    take(take) {
        this.expressionMap.take = this.normalizeNumber(take);
        if (this.expressionMap.take !== undefined &&
            isNaN(this.expressionMap.take))
            throw new error_1.TypeORMError(`Provided "take" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Sets number of entities to skip.
     */
    skip(skip) {
        this.expressionMap.skip = this.normalizeNumber(skip);
        if (this.expressionMap.skip !== undefined &&
            isNaN(this.expressionMap.skip))
            throw new error_1.TypeORMError(`Provided "skip" value is not a number. Please provide a numeric value.`);
        return this;
    }
    /**
     * Set certain index to be used by the query.
     *
     * @param index Name of index to be used.
     */
    useIndex(index) {
        this.expressionMap.useIndex = index;
        return this;
    }
    /**
     * Sets locking mode.
     */
    setLock(lockMode, lockVersion, lockTables) {
        this.expressionMap.lockMode = lockMode;
        this.expressionMap.lockVersion = lockVersion;
        this.expressionMap.lockTables = lockTables;
        return this;
    }
    /**
     * Sets lock handling by adding NO WAIT or SKIP LOCKED.
     */
    setOnLocked(onLocked) {
        this.expressionMap.onLocked = onLocked;
        return this;
    }
    /**
     * Disables the global condition of "non-deleted" for the entity with delete date columns.
     */
    withDeleted() {
        this.expressionMap.withDeleted = true;
        return this;
    }
    /**
     * Gets first raw result returned by execution of generated query builder sql.
     */
    async getRawOne() {
        return (await this.getRawMany())[0];
    }
    /**
     * Gets all raw results returned by execution of generated query builder sql.
     */
    async getRawMany() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        this.expressionMap.queryEntity = false;
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            const results = await this.loadRawResults(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner) {
                // means we created our own query runner
                await queryRunner.release();
            }
        }
    }
    /**
     * Executes sql generated by query builder and returns object with raw results and entities created from them.
     */
    async getRawAndEntities() {
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = true;
            const results = await this.executeEntitiesAndRawResults(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner)
                // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Gets single entity returned by execution of generated query builder sql.
     */
    async getOne() {
        const results = await this.getRawAndEntities();
        const result = results.entities[0];
        if (result &&
            this.expressionMap.lockMode === "optimistic" &&
            this.expressionMap.lockVersion) {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (this.expressionMap.lockVersion instanceof Date) {
                const actualVersion = metadata.updateDateColumn.getEntityValue(result); // what if columns arent set?
                if (actualVersion.getTime() !==
                    this.expressionMap.lockVersion.getTime())
                    throw new OptimisticLockVersionMismatchError_1.OptimisticLockVersionMismatchError(metadata.name, this.expressionMap.lockVersion, actualVersion);
            }
            else {
                const actualVersion = metadata.versionColumn.getEntityValue(result); // what if columns arent set?
                if (actualVersion !== this.expressionMap.lockVersion)
                    throw new OptimisticLockVersionMismatchError_1.OptimisticLockVersionMismatchError(metadata.name, this.expressionMap.lockVersion, actualVersion);
            }
        }
        if (result === undefined) {
            return null;
        }
        return result;
    }
    /**
     * Gets the first entity returned by execution of generated query builder sql or rejects the returned promise on error.
     */
    async getOneOrFail() {
        const entity = await this.getOne();
        if (!entity) {
            throw new EntityNotFoundError_1.EntityNotFoundError(this.expressionMap.mainAlias.target, this.expressionMap.parameters);
        }
        return entity;
    }
    /**
     * Gets entities returned by execution of generated query builder sql.
     */
    async getMany() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const results = await this.getRawAndEntities();
        return results.entities;
    }
    /**
     * Gets count - number of entities selected by sql generated by this query builder.
     * Count excludes all limitations set by offset, limit, skip, and take.
     */
    async getCount() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = false;
            const results = await this.executeCountQuery(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner)
                // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Gets exists
     * Returns whether any rows exists matching current query.
     */
    async getExists() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = false;
            const results = await this.executeExistsQuery(queryRunner);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner)
                // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Executes built SQL query and returns entities and overall entities count (without limitation).
     * This method is useful to build pagination.
     */
    async getManyAndCount() {
        if (this.expressionMap.lockMode === "optimistic")
            throw new OptimisticLockCanNotBeUsedError_1.OptimisticLockCanNotBeUsedError();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            this.expressionMap.queryEntity = true;
            const entitiesAndRaw = await this.executeEntitiesAndRawResults(queryRunner);
            this.expressionMap.queryEntity = false;
            const cacheId = this.expressionMap.cacheId;
            // Creates a new cacheId for the count query, or it will retreive the above query results
            // and count will return 0.
            this.expressionMap.cacheId = cacheId ? `${cacheId}-count` : cacheId;
            const count = await this.executeCountQuery(queryRunner);
            const results = [entitiesAndRaw.entities, count];
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
        finally {
            if (queryRunner !== this.queryRunner)
                // means we created our own query runner
                await queryRunner.release();
        }
    }
    /**
     * Executes built SQL query and returns raw data stream.
     */
    async stream() {
        this.expressionMap.queryEntity = false;
        const [sql, parameters] = this.getQueryAndParameters();
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs = false;
        try {
            // start transaction if it was enabled
            if (this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }
            const releaseFn = () => {
                if (queryRunner !== this.queryRunner)
                    // means we created our own query runner
                    return queryRunner.release();
                return;
            };
            const results = queryRunner.stream(sql, parameters, releaseFn, releaseFn);
            // close transaction if we started it
            if (transactionStartedByUs) {
                await queryRunner.commitTransaction();
            }
            return results;
        }
        catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw error;
        }
    }
    /**
     * Enables or disables query result caching.
     */
    cache(enabledOrMillisecondsOrId, maybeMilliseconds) {
        if (typeof enabledOrMillisecondsOrId === "boolean") {
            this.expressionMap.cache = enabledOrMillisecondsOrId;
        }
        else if (typeof enabledOrMillisecondsOrId === "number") {
            this.expressionMap.cache = true;
            this.expressionMap.cacheDuration = enabledOrMillisecondsOrId;
        }
        else if (typeof enabledOrMillisecondsOrId === "string" ||
            typeof enabledOrMillisecondsOrId === "number") {
            this.expressionMap.cache = true;
            this.expressionMap.cacheId = enabledOrMillisecondsOrId;
        }
        if (maybeMilliseconds) {
            this.expressionMap.cacheDuration = maybeMilliseconds;
        }
        return this;
    }
    /**
     * Sets extra options that can be used to configure how query builder works.
     */
    setOption(option) {
        this.expressionMap.options.push(option);
        return this;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    join(direction, entityOrProperty, aliasName, condition, parameters, mapToProperty, isMappingMany, mapAsEntity) {
        if (parameters) {
            this.setParameters(parameters);
        }
        const joinAttribute = new JoinAttribute_1.JoinAttribute(this.connection, this.expressionMap);
        joinAttribute.direction = direction;
        joinAttribute.mapAsEntity = mapAsEntity;
        joinAttribute.mapToProperty = mapToProperty;
        joinAttribute.isMappingMany = isMappingMany;
        joinAttribute.entityOrProperty = entityOrProperty; // relationName
        joinAttribute.condition = condition; // joinInverseSideCondition
        // joinAttribute.junctionAlias = joinAttribute.relation.isOwning ? parentAlias + "_" + destinationTableAlias : destinationTableAlias + "_" + parentAlias;
        this.expressionMap.joinAttributes.push(joinAttribute);
        const joinAttributeMetadata = joinAttribute.metadata;
        if (joinAttributeMetadata) {
            if (joinAttributeMetadata.deleteDateColumn &&
                !this.expressionMap.withDeleted) {
                const conditionDeleteColumn = `${aliasName}.${joinAttributeMetadata.deleteDateColumn.propertyName} IS NULL`;
                joinAttribute.condition = joinAttribute.condition
                    ? ` ${joinAttribute.condition} AND ${conditionDeleteColumn}`
                    : `${conditionDeleteColumn}`;
            }
            // todo: find and set metadata right there?
            joinAttribute.alias = this.expressionMap.createAlias({
                type: "join",
                name: aliasName,
                metadata: joinAttributeMetadata,
            });
            if (joinAttribute.relation &&
                joinAttribute.relation.junctionEntityMetadata) {
                this.expressionMap.createAlias({
                    type: "join",
                    name: joinAttribute.junctionAlias,
                    metadata: joinAttribute.relation.junctionEntityMetadata,
                });
            }
        }
        else {
            let subQuery = "";
            if (typeof entityOrProperty === "function") {
                const subQueryBuilder = entityOrProperty(this.subQuery());
                this.setParameters(subQueryBuilder.getParameters());
                subQuery = subQueryBuilder.getQuery();
            }
            else {
                subQuery = entityOrProperty;
            }
            const isSubQuery = typeof entityOrProperty === "function" ||
                (entityOrProperty.substr(0, 1) === "(" &&
                    entityOrProperty.substr(-1) === ")");
            joinAttribute.alias = this.expressionMap.createAlias({
                type: "join",
                name: aliasName,
                tablePath: isSubQuery === false
                    ? entityOrProperty
                    : undefined,
                subQuery: isSubQuery === true ? subQuery : undefined,
            });
        }
    }
    /**
     * Creates "SELECT FROM" part of SQL query.
     */
    createSelectExpression() {
        if (!this.expressionMap.mainAlias)
            throw new error_1.TypeORMError("Cannot build query because main alias is not set (call qb#from method)");
        // todo throw exception if selects or from is missing
        const allSelects = [];
        const excludedSelects = [];
        if (this.expressionMap.mainAlias.hasMetadata) {
            const metadata = this.expressionMap.mainAlias.metadata;
            allSelects.push(...this.buildEscapedEntityColumnSelects(this.expressionMap.mainAlias.name, metadata));
            excludedSelects.push(...this.findEntityColumnSelects(this.expressionMap.mainAlias.name, metadata));
        }
        // add selects from joins
        this.expressionMap.joinAttributes.forEach((join) => {
            if (join.metadata) {
                allSelects.push(...this.buildEscapedEntityColumnSelects(join.alias.name, join.metadata));
                excludedSelects.push(...this.findEntityColumnSelects(join.alias.name, join.metadata));
            }
            else {
                const hasMainAlias = this.expressionMap.selects.some((select) => select.selection === join.alias.name);
                if (hasMainAlias) {
                    allSelects.push({
                        selection: this.escape(join.alias.name) + ".*",
                    });
                    const excludedSelect = this.expressionMap.selects.find((select) => select.selection === join.alias.name);
                    excludedSelects.push(excludedSelect);
                }
            }
        });
        // add all other selects
        this.expressionMap.selects
            .filter((select) => excludedSelects.indexOf(select) === -1)
            .forEach((select) => allSelects.push({
            selection: this.replacePropertyNames(select.selection),
            aliasName: select.aliasName,
        }));
        // if still selection is empty, then simply set it to all (*)
        if (allSelects.length === 0)
            allSelects.push({ selection: "*" });
        // Use certain index
        let useIndex = "";
        if (this.expressionMap.useIndex) {
            if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
                useIndex = ` USE INDEX (${this.expressionMap.useIndex})`;
            }
        }
        // create a selection query
        const froms = this.expressionMap.aliases
            .filter((alias) => alias.type === "from" &&
            (alias.tablePath || alias.subQuery))
            .map((alias) => {
            if (alias.subQuery)
                return alias.subQuery + " " + this.escape(alias.name);
            return (this.getTableName(alias.tablePath) +
                " " +
                this.escape(alias.name));
        });
        const select = this.createSelectDistinctExpression();
        const selection = allSelects
            .map((select) => select.selection +
            (select.aliasName
                ? " AS " + this.escape(select.aliasName)
                : ""))
            .join(", ");
        return (select +
            selection +
            " FROM " +
            froms.join(", ") +
            this.createTableLockExpression() +
            useIndex);
    }
    /**
     * Creates select | select distinct part of SQL query.
     */
    createSelectDistinctExpression() {
        const { selectDistinct, selectDistinctOn, maxExecutionTime } = this.expressionMap;
        const { driver } = this.connection;
        let select = "SELECT ";
        if (maxExecutionTime > 0) {
            if (DriverUtils_1.DriverUtils.isMySQLFamily(driver)) {
                select += `/*+ MAX_EXECUTION_TIME(${this.expressionMap.maxExecutionTime}) */ `;
            }
        }
        if (DriverUtils_1.DriverUtils.isPostgresFamily(driver) &&
            selectDistinctOn.length > 0) {
            const selectDistinctOnMap = selectDistinctOn
                .map((on) => this.replacePropertyNames(on))
                .join(", ");
            select = `SELECT DISTINCT ON (${selectDistinctOnMap}) `;
        }
        else if (selectDistinct) {
            select = "SELECT DISTINCT ";
        }
        return select;
    }
    /**
     * Creates "JOIN" part of SQL query.
     */
    createJoinExpression() {
        // examples:
        // select from owning side
        // qb.select("post")
        //     .leftJoinAndSelect("post.category", "category");
        // select from non-owning side
        // qb.select("category")
        //     .leftJoinAndSelect("category.post", "post");
        const joins = this.expressionMap.joinAttributes.map((joinAttr) => {
            const relation = joinAttr.relation;
            const destinationTableName = joinAttr.tablePath;
            const destinationTableAlias = joinAttr.alias.name;
            let appendedCondition = joinAttr.condition
                ? " AND (" + joinAttr.condition + ")"
                : "";
            const parentAlias = joinAttr.parentAlias;
            // if join was build without relation (e.g. without "post.category") then it means that we have direct
            // table to join, without junction table involved. This means we simply join direct table.
            if (!parentAlias || !relation) {
                const destinationJoin = joinAttr.alias.subQuery
                    ? joinAttr.alias.subQuery
                    : this.getTableName(destinationTableName);
                return (" " +
                    joinAttr.direction +
                    " JOIN " +
                    destinationJoin +
                    " " +
                    this.escape(destinationTableAlias) +
                    this.createTableLockExpression() +
                    (joinAttr.condition
                        ? " ON " + this.replacePropertyNames(joinAttr.condition)
                        : ""));
            }
            // if real entity relation is involved
            if (relation.isManyToOne || relation.isOneToOneOwner) {
                // JOIN `category` `category` ON `category`.`id` = `post`.`categoryId`
                const condition = relation.joinColumns
                    .map((joinColumn) => {
                    return (destinationTableAlias +
                        "." +
                        joinColumn.referencedColumn.propertyPath +
                        "=" +
                        parentAlias +
                        "." +
                        relation.propertyPath +
                        "." +
                        joinColumn.referencedColumn.propertyPath);
                })
                    .join(" AND ");
                return (" " +
                    joinAttr.direction +
                    " JOIN " +
                    this.getTableName(destinationTableName) +
                    " " +
                    this.escape(destinationTableAlias) +
                    this.createTableLockExpression() +
                    " ON " +
                    this.replacePropertyNames(condition + appendedCondition));
            }
            else if (relation.isOneToMany || relation.isOneToOneNotOwner) {
                // JOIN `post` `post` ON `post`.`categoryId` = `category`.`id`
                const condition = relation
                    .inverseRelation.joinColumns.map((joinColumn) => {
                    if (relation.inverseEntityMetadata.tableType ===
                        "entity-child" &&
                        relation.inverseEntityMetadata.discriminatorColumn) {
                        appendedCondition +=
                            " AND " +
                                destinationTableAlias +
                                "." +
                                relation.inverseEntityMetadata
                                    .discriminatorColumn.databaseName +
                                "='" +
                                relation.inverseEntityMetadata
                                    .discriminatorValue +
                                "'";
                    }
                    return (destinationTableAlias +
                        "." +
                        relation.inverseRelation.propertyPath +
                        "." +
                        joinColumn.referencedColumn.propertyPath +
                        "=" +
                        parentAlias +
                        "." +
                        joinColumn.referencedColumn.propertyPath);
                })
                    .join(" AND ");
                if (!condition)
                    throw new error_1.TypeORMError(`Relation ${relation.entityMetadata.name}.${relation.propertyName} does not have join columns.`);
                return (" " +
                    joinAttr.direction +
                    " JOIN " +
                    this.getTableName(destinationTableName) +
                    " " +
                    this.escape(destinationTableAlias) +
                    this.createTableLockExpression() +
                    " ON " +
                    this.replacePropertyNames(condition + appendedCondition));
            }
            else {
                // means many-to-many
                const junctionTableName = relation.junctionEntityMetadata.tablePath;
                const junctionAlias = joinAttr.junctionAlias;
                let junctionCondition = "", destinationCondition = "";
                if (relation.isOwning) {
                    junctionCondition = relation.joinColumns
                        .map((joinColumn) => {
                        // `post_category`.`postId` = `post`.`id`
                        return (junctionAlias +
                            "." +
                            joinColumn.propertyPath +
                            "=" +
                            parentAlias +
                            "." +
                            joinColumn.referencedColumn.propertyPath);
                    })
                        .join(" AND ");
                    destinationCondition = relation.inverseJoinColumns
                        .map((joinColumn) => {
                        // `category`.`id` = `post_category`.`categoryId`
                        return (destinationTableAlias +
                            "." +
                            joinColumn.referencedColumn.propertyPath +
                            "=" +
                            junctionAlias +
                            "." +
                            joinColumn.propertyPath);
                    })
                        .join(" AND ");
                }
                else {
                    junctionCondition = relation
                        .inverseRelation.inverseJoinColumns.map((joinColumn) => {
                        // `post_category`.`categoryId` = `category`.`id`
                        return (junctionAlias +
                            "." +
                            joinColumn.propertyPath +
                            "=" +
                            parentAlias +
                            "." +
                            joinColumn.referencedColumn.propertyPath);
                    })
                        .join(" AND ");
                    destinationCondition = relation
                        .inverseRelation.joinColumns.map((joinColumn) => {
                        // `post`.`id` = `post_category`.`postId`
                        return (destinationTableAlias +
                            "." +
                            joinColumn.referencedColumn.propertyPath +
                            "=" +
                            junctionAlias +
                            "." +
                            joinColumn.propertyPath);
                    })
                        .join(" AND ");
                }
                return (" " +
                    joinAttr.direction +
                    " JOIN " +
                    this.getTableName(junctionTableName) +
                    " " +
                    this.escape(junctionAlias) +
                    this.createTableLockExpression() +
                    " ON " +
                    this.replacePropertyNames(junctionCondition) +
                    " " +
                    joinAttr.direction +
                    " JOIN " +
                    this.getTableName(destinationTableName) +
                    " " +
                    this.escape(destinationTableAlias) +
                    this.createTableLockExpression() +
                    " ON " +
                    this.replacePropertyNames(destinationCondition + appendedCondition));
            }
        });
        return joins.join(" ");
    }
    /**
     * Creates "GROUP BY" part of SQL query.
     */
    createGroupByExpression() {
        if (!this.expressionMap.groupBys || !this.expressionMap.groupBys.length)
            return "";
        return (" GROUP BY " +
            this.replacePropertyNames(this.expressionMap.groupBys.join(", ")));
    }
    /**
     * Creates "ORDER BY" part of SQL query.
     */
    createOrderByExpression() {
        const orderBys = this.expressionMap.allOrderBys;
        if (Object.keys(orderBys).length === 0)
            return "";
        return (" ORDER BY " +
            Object.keys(orderBys)
                .map((columnName) => {
                const orderValue = typeof orderBys[columnName] === "string"
                    ? orderBys[columnName]
                    : orderBys[columnName].order +
                        " " +
                        orderBys[columnName].nulls;
                const selection = this.expressionMap.selects.find((s) => s.selection === columnName);
                if (selection &&
                    !selection.aliasName &&
                    columnName.indexOf(".") !== -1) {
                    const criteriaParts = columnName.split(".");
                    const aliasName = criteriaParts[0];
                    const propertyPath = criteriaParts.slice(1).join(".");
                    const alias = this.expressionMap.aliases.find((alias) => alias.name === aliasName);
                    if (alias) {
                        const column = alias.metadata.findColumnWithPropertyPath(propertyPath);
                        if (column) {
                            const orderAlias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, aliasName, column.databaseName);
                            return (this.escape(orderAlias) + " " + orderValue);
                        }
                    }
                }
                return (this.replacePropertyNames(columnName) + " " + orderValue);
            })
                .join(", "));
    }
    /**
     * Creates "LIMIT" and "OFFSET" parts of SQL query.
     */
    createLimitOffsetExpression() {
        // in the case if nothing is joined in the query builder we don't need to make two requests to get paginated results
        // we can use regular limit / offset, that's why we add offset and limit construction here based on skip and take values
        let offset = this.expressionMap.offset, limit = this.expressionMap.limit;
        if (!offset &&
            !limit &&
            this.expressionMap.joinAttributes.length === 0) {
            offset = this.expressionMap.skip;
            limit = this.expressionMap.take;
        }
        if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                throw new OffsetWithoutLimitNotSupportedError_1.OffsetWithoutLimitNotSupportedError();
        }
        else if (DriverUtils_1.DriverUtils.isSQLiteFamily(this.connection.driver)) {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                return " LIMIT -1 OFFSET " + offset;
        }
        else {
            if (limit && offset)
                return " LIMIT " + limit + " OFFSET " + offset;
            if (limit)
                return " LIMIT " + limit;
            if (offset)
                return " OFFSET " + offset;
        }
        return "";
    }
    /**
     * Creates "LOCK" part of SELECT Query after table Clause
     * ex.
     *  SELECT 1
     *  FROM USER U WITH (NOLOCK)
     *  JOIN ORDER O WITH (NOLOCK)
     *      ON U.ID=O.OrderID
     */
    createTableLockExpression() {
        return "";
    }
    /**
     * Creates "LOCK" part of SQL query.
     */
    createLockExpression() {
        const driver = this.connection.driver;
        let lockTablesClause = "";
        if (this.expressionMap.lockTables) {
            if (!DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                throw new error_1.TypeORMError("Lock tables not supported in selected driver");
            }
            if (this.expressionMap.lockTables.length < 1) {
                throw new error_1.TypeORMError("lockTables cannot be an empty array");
            }
            lockTablesClause = " OF " + this.expressionMap.lockTables.join(", ");
        }
        let onLockExpression = "";
        if (this.expressionMap.onLocked === "nowait") {
            onLockExpression = " NOWAIT";
        }
        else if (this.expressionMap.onLocked === "skip_locked") {
            onLockExpression = " SKIP LOCKED";
        }
        switch (this.expressionMap.lockMode) {
            case "pessimistic_read":
                if (driver.options.type === "mysql") {
                    if (DriverUtils_1.DriverUtils.isReleaseVersionOrGreater(driver, "8.0.0")) {
                        return (" FOR SHARE" + lockTablesClause + onLockExpression);
                    }
                    else {
                        return " LOCK IN SHARE MODE";
                    }
                }
                else if (driver.options.type === "mariadb") {
                    return " LOCK IN SHARE MODE";
                }
                else if (DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                    return " FOR SHARE" + lockTablesClause + onLockExpression;
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            case "pessimistic_write":
                if (DriverUtils_1.DriverUtils.isMySQLFamily(driver)) {
                    return " FOR UPDATE" + onLockExpression;
                }
                else if (DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                    return " FOR UPDATE" + lockTablesClause + onLockExpression;
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            case "pessimistic_partial_write":
                if (DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                    return " FOR UPDATE" + lockTablesClause + " SKIP LOCKED";
                }
                else if (DriverUtils_1.DriverUtils.isMySQLFamily(driver)) {
                    return " FOR UPDATE SKIP LOCKED";
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            case "pessimistic_write_or_fail":
                if (DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                    return " FOR UPDATE" + lockTablesClause + " NOWAIT";
                }
                else if (DriverUtils_1.DriverUtils.isMySQLFamily(driver)) {
                    return " FOR UPDATE NOWAIT";
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            case "for_no_key_update":
                if (DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                    return (" FOR NO KEY UPDATE" +
                        lockTablesClause +
                        onLockExpression);
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            case "for_key_share":
                if (DriverUtils_1.DriverUtils.isPostgresFamily(driver)) {
                    return (" FOR KEY SHARE" + lockTablesClause + onLockExpression);
                }
                else {
                    throw new LockNotSupportedOnGivenDriverError_1.LockNotSupportedOnGivenDriverError();
                }
            default:
                return "";
        }
    }
    /**
     * Creates "HAVING" part of SQL query.
     */
    createHavingExpression() {
        if (!this.expressionMap.havings || !this.expressionMap.havings.length)
            return "";
        const conditions = this.expressionMap.havings
            .map((having, index) => {
            switch (having.type) {
                case "and":
                    return ((index > 0 ? "AND " : "") +
                        this.replacePropertyNames(having.condition));
                case "or":
                    return ((index > 0 ? "OR " : "") +
                        this.replacePropertyNames(having.condition));
                default:
                    return this.replacePropertyNames(having.condition);
            }
        })
            .join(" ");
        if (!conditions.length)
            return "";
        return " HAVING " + conditions;
    }
    buildEscapedEntityColumnSelects(aliasName, metadata) {
        const hasMainAlias = this.expressionMap.selects.some((select) => select.selection === aliasName);
        const columns = [];
        if (hasMainAlias) {
            columns.push(...metadata.columns.filter((column) => column.isSelect === true));
        }
        columns.push(...metadata.columns.filter((column) => {
            return this.expressionMap.selects.some((select) => select.selection ===
                aliasName + "." + column.propertyPath);
        }));
        // if user used partial selection and did not select some primary columns which are required to be selected
        // we select those primary columns and mark them as "virtual". Later virtual column values will be removed from final entity
        // to make entity contain exactly what user selected
        if (columns.length === 0)
            // however not in the case when nothing (even partial) was selected from this target (for example joins without selection)
            return [];
        const nonSelectedPrimaryColumns = this.expressionMap.queryEntity
            ? metadata.primaryColumns.filter((primaryColumn) => columns.indexOf(primaryColumn) === -1)
            : [];
        const allColumns = [...columns, ...nonSelectedPrimaryColumns];
        const finalSelects = [];
        const escapedAliasName = this.escape(aliasName);
        allColumns.forEach((column) => {
            let selectionPath = escapedAliasName + "." + this.escape(column.databaseName);
            if (column.isVirtualProperty && column.query) {
                selectionPath = `(${column.query(escapedAliasName)})`;
            }
            if (this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
                    const useLegacy = this.connection.driver
                        .options.legacySpatialSupport;
                    const asText = useLegacy ? "AsText" : "ST_AsText";
                    selectionPath = `${asText}(${selectionPath})`;
                }
                if (DriverUtils_1.DriverUtils.isPostgresFamily(this.connection.driver))
                    if (column.precision) {
                        // cast to JSON to trigger parsing in the driver
                        selectionPath = `ST_AsGeoJSON(${selectionPath}, ${column.precision})::json`;
                    }
                    else {
                        selectionPath = `ST_AsGeoJSON(${selectionPath})::json`;
                    }
            }
            const selections = this.expressionMap.selects.filter((select) => select.selection === aliasName + "." + column.propertyPath);
            if (selections.length) {
                selections.forEach((selection) => {
                    finalSelects.push({
                        selection: selectionPath,
                        aliasName: selection.aliasName
                            ? selection.aliasName
                            : DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, aliasName, column.databaseName),
                        // todo: need to keep in mind that custom selection.aliasName breaks hydrator. fix it later!
                        virtual: selection.virtual,
                    });
                });
            }
            else {
                if (column.isVirtualProperty) {
                    // Do not add unselected virtual properties to final select
                    return;
                }
                finalSelects.push({
                    selection: selectionPath,
                    aliasName: DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, aliasName, column.databaseName),
                    // todo: need to keep in mind that custom selection.aliasName breaks hydrator. fix it later!
                    virtual: hasMainAlias,
                });
            }
        });
        return finalSelects;
    }
    findEntityColumnSelects(aliasName, metadata) {
        const mainSelect = this.expressionMap.selects.find((select) => select.selection === aliasName);
        if (mainSelect)
            return [mainSelect];
        return this.expressionMap.selects.filter((select) => {
            return metadata.columns.some((column) => select.selection === aliasName + "." + column.propertyPath);
        });
    }
    computeCountExpression() {
        const mainAlias = this.expressionMap.mainAlias.name; // todo: will this work with "fromTableName"?
        const metadata = this.expressionMap.mainAlias.metadata;
        const primaryColumns = metadata.primaryColumns;
        const distinctAlias = this.escape(mainAlias);
        // If we aren't doing anything that will create a join, we can use a simpler `COUNT` instead
        // so we prevent poor query patterns in the most likely cases
        if (this.expressionMap.joinAttributes.length === 0 &&
            this.expressionMap.relationIdAttributes.length === 0 &&
            this.expressionMap.relationCountAttributes.length === 0) {
            return "COUNT(1)";
        }
        // For everything else, we'll need to do some hackery to get the correct count values.
        if (DriverUtils_1.DriverUtils.isPostgresFamily(this.connection.driver)) {
            // Postgres and CockroachDB can pass multiple parameters to the `DISTINCT` function
            // https://www.postgresql.org/docs/9.5/sql-select.html#SQL-DISTINCT
            return ("COUNT(DISTINCT(" +
                primaryColumns
                    .map((c) => `${distinctAlias}.${this.escape(c.databaseName)}`)
                    .join(", ") +
                "))");
        }
        if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
            // MySQL & MariaDB can pass multiple parameters to the `DISTINCT` language construct
            // https://mariadb.com/kb/en/count-distinct/
            return ("COUNT(DISTINCT " +
                primaryColumns
                    .map((c) => `${distinctAlias}.${this.escape(c.databaseName)}`)
                    .join(", ") +
                ")");
        }
        // If all else fails, fall back to a `COUNT` and `DISTINCT` across all the primary columns concatenated.
        // Per the SQL spec, this is the canonical string concatenation mechanism which is most
        // likely to work across servers implementing the SQL standard.
        // Please note, if there is only one primary column that the concatenation does not occur in this
        // query and the query is a standard `COUNT DISTINCT` in that case.
        return (`COUNT(DISTINCT(` +
            primaryColumns
                .map((c) => `${distinctAlias}.${this.escape(c.databaseName)}`)
                .join(" || '|;|' || ") +
            "))");
    }
    async executeCountQuery(queryRunner) {
        const countSql = this.computeCountExpression();
        const results = await this.clone()
            .orderBy()
            .groupBy()
            .offset(undefined)
            .limit(undefined)
            .skip(undefined)
            .take(undefined)
            .select(countSql, "cnt")
            .setOption("disable-global-order")
            .loadRawResults(queryRunner);
        if (!results || !results[0] || !results[0]["cnt"])
            return 0;
        return parseInt(results[0]["cnt"]);
    }
    async executeExistsQuery(queryRunner) {
        const results = await this.connection
            .createQueryBuilder()
            .fromDummy()
            .select("1", "row_exists")
            .whereExists(this)
            .limit(1)
            .loadRawResults(queryRunner);
        return results.length > 0;
    }
    applyFindOptions() {
        // todo: convert relations: string[] to object map to simplify code
        // todo: same with selects
        if (this.expressionMap.mainAlias.metadata) {
            if (this.findOptions.relationLoadStrategy) {
                this.expressionMap.relationLoadStrategy =
                    this.findOptions.relationLoadStrategy;
            }
            if (this.findOptions.comment) {
                this.comment(this.findOptions.comment);
            }
            if (this.findOptions.withDeleted) {
                this.withDeleted();
            }
            if (this.findOptions.select) {
                const select = Array.isArray(this.findOptions.select)
                    ? OrmUtils_1.OrmUtils.propertyPathsToTruthyObject(this.findOptions.select)
                    : this.findOptions.select;
                this.buildSelect(select, this.expressionMap.mainAlias.metadata, this.expressionMap.mainAlias.name);
            }
            if (this.selects.length) {
                this.select(this.selects);
            }
            this.selects = [];
            if (this.findOptions.relations) {
                const relations = Array.isArray(this.findOptions.relations)
                    ? OrmUtils_1.OrmUtils.propertyPathsToTruthyObject(this.findOptions.relations)
                    : this.findOptions.relations;
                this.buildRelations(relations, typeof this.findOptions.select === "object"
                    ? this.findOptions.select
                    : undefined, this.expressionMap.mainAlias.metadata, this.expressionMap.mainAlias.name);
                if (this.findOptions.loadEagerRelations !== false &&
                    this.expressionMap.relationLoadStrategy === "join") {
                    this.buildEagerRelations(relations, typeof this.findOptions.select === "object"
                        ? this.findOptions
                            .select
                        : undefined, this.expressionMap.mainAlias.metadata, this.expressionMap.mainAlias.name);
                }
            }
            if (this.selects.length) {
                this.addSelect(this.selects);
            }
            if (this.findOptions.where) {
                this.conditions = this.buildWhere(this.findOptions.where, this.expressionMap.mainAlias.metadata, this.expressionMap.mainAlias.name);
                if (this.conditions.length)
                    this.andWhere(this.conditions.substr(0, 1) !== "("
                        ? "(" + this.conditions + ")"
                        : this.conditions); // temporary and where and braces
            }
            if (this.findOptions.order) {
                this.buildOrder(this.findOptions.order, this.expressionMap.mainAlias.metadata, this.expressionMap.mainAlias.name);
            }
            // apply joins
            if (this.joins.length) {
                this.joins.forEach((join) => {
                    if (join.select && !join.selection) {
                        // if (join.selection) {
                        //
                        // } else {
                        if (join.type === "inner") {
                            this.innerJoinAndSelect(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        }
                        else {
                            this.leftJoinAndSelect(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        }
                        // }
                    }
                    else {
                        if (join.type === "inner") {
                            this.innerJoin(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        }
                        else {
                            this.leftJoin(`${join.parentAlias}.${join.relationMetadata.propertyPath}`, join.alias);
                        }
                    }
                    // if (join.select) {
                    //     if (this.findOptions.loadEagerRelations !== false) {
                    //         FindOptionsUtils.joinEagerRelations(
                    //             this,
                    //             join.alias,
                    //             join.relationMetadata.inverseEntityMetadata
                    //         );
                    //     }
                    // }
                });
            }
            // if (this.conditions.length) {
            //     this.where(this.conditions.join(" AND "));
            // }
            // apply offset
            if (this.findOptions.skip !== undefined) {
                // if (this.findOptions.options && this.findOptions.options.pagination === false) {
                //     this.offset(this.findOptions.skip);
                // } else {
                this.skip(this.findOptions.skip);
                // }
            }
            // apply limit
            if (this.findOptions.take !== undefined) {
                // if (this.findOptions.options && this.findOptions.options.pagination === false) {
                //     this.limit(this.findOptions.take);
                // } else {
                this.take(this.findOptions.take);
                // }
            }
            // apply caching options
            if (typeof this.findOptions.cache === "number") {
                this.cache(this.findOptions.cache);
            }
            else if (typeof this.findOptions.cache === "boolean") {
                this.cache(this.findOptions.cache);
            }
            else if (typeof this.findOptions.cache === "object") {
                this.cache(this.findOptions.cache.id, this.findOptions.cache.milliseconds);
            }
            if (this.findOptions.join) {
                if (this.findOptions.join.leftJoin)
                    Object.keys(this.findOptions.join.leftJoin).forEach((key) => {
                        this.leftJoin(this.findOptions.join.leftJoin[key], key);
                    });
                if (this.findOptions.join.innerJoin)
                    Object.keys(this.findOptions.join.innerJoin).forEach((key) => {
                        this.innerJoin(this.findOptions.join.innerJoin[key], key);
                    });
                if (this.findOptions.join.leftJoinAndSelect)
                    Object.keys(this.findOptions.join.leftJoinAndSelect).forEach((key) => {
                        this.leftJoinAndSelect(this.findOptions.join.leftJoinAndSelect[key], key);
                    });
                if (this.findOptions.join.innerJoinAndSelect)
                    Object.keys(this.findOptions.join.innerJoinAndSelect).forEach((key) => {
                        this.innerJoinAndSelect(this.findOptions.join.innerJoinAndSelect[key], key);
                    });
            }
            if (this.findOptions.lock) {
                if (this.findOptions.lock.mode === "optimistic") {
                    this.setLock(this.findOptions.lock.mode, this.findOptions.lock.version);
                }
                else if (this.findOptions.lock.mode === "pessimistic_read" ||
                    this.findOptions.lock.mode === "pessimistic_write" ||
                    this.findOptions.lock.mode === "dirty_read" ||
                    this.findOptions.lock.mode ===
                        "pessimistic_partial_write" ||
                    this.findOptions.lock.mode ===
                        "pessimistic_write_or_fail" ||
                    this.findOptions.lock.mode === "for_no_key_update" ||
                    this.findOptions.lock.mode === "for_key_share") {
                    const tableNames = this.findOptions.lock.tables
                        ? this.findOptions.lock.tables.map((table) => {
                            const tableAlias = this.expressionMap.aliases.find((alias) => {
                                return (alias.metadata
                                    .tableNameWithoutPrefix === table);
                            });
                            if (!tableAlias) {
                                throw new error_1.TypeORMError(`"${table}" is not part of this query`);
                            }
                            return this.escape(tableAlias.name);
                        })
                        : undefined;
                    this.setLock(this.findOptions.lock.mode, undefined, tableNames);
                    if (this.findOptions.lock.onLocked) {
                        this.setOnLocked(this.findOptions.lock.onLocked);
                    }
                }
            }
            if (this.findOptions.loadRelationIds === true) {
                this.loadAllRelationIds();
            }
            else if (typeof this.findOptions.loadRelationIds === "object") {
                this.loadAllRelationIds(this.findOptions.loadRelationIds);
            }
            if (this.findOptions.loadEagerRelations !== false) {
                FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(this, this.expressionMap.mainAlias.name, this.expressionMap.mainAlias.metadata);
            }
            if (this.findOptions.transaction === true) {
                this.expressionMap.useTransaction = true;
            }
            // if (this.orderBys.length) {
            //     this.orderBys.forEach(orderBy => {
            //         this.addOrderBy(orderBy.alias, orderBy.direction, orderBy.nulls);
            //     });
            // }
            // todo
            // if (this.options.options && this.options.options.eagerRelations) {
            //     this.queryBuilder
            // }
            // todo
            // if (this.findOptions.options && this.findOptions.listeners === false) {
            //     this.callListeners(false);
            // }
        }
    }
    concatRelationMetadata(relationMetadata) {
        this.relationMetadatas.push(relationMetadata);
    }
    /**
     * Executes sql generated by query builder and returns object with raw results and entities created from them.
     */
    async executeEntitiesAndRawResults(queryRunner) {
        if (!this.expressionMap.mainAlias)
            throw new error_1.TypeORMError(`Alias is not set. Use "from" method to set an alias.`);
        if ((this.expressionMap.lockMode === "pessimistic_read" ||
            this.expressionMap.lockMode === "pessimistic_write" ||
            this.expressionMap.lockMode === "pessimistic_partial_write" ||
            this.expressionMap.lockMode === "pessimistic_write_or_fail" ||
            this.expressionMap.lockMode === "for_no_key_update" ||
            this.expressionMap.lockMode === "for_key_share") &&
            !queryRunner.isTransactionActive)
            throw new PessimisticLockTransactionRequiredError_1.PessimisticLockTransactionRequiredError();
        if (this.expressionMap.lockMode === "optimistic") {
            const metadata = this.expressionMap.mainAlias.metadata;
            if (!metadata.versionColumn && !metadata.updateDateColumn)
                throw new NoVersionOrUpdateDateColumnError_1.NoVersionOrUpdateDateColumnError(metadata.name);
        }
        const relationIdLoader = new RelationIdLoader_1.RelationIdLoader(this.connection, queryRunner, this.expressionMap.relationIdAttributes);
        const relationCountLoader = new RelationCountLoader_1.RelationCountLoader(this.connection, queryRunner, this.expressionMap.relationCountAttributes);
        const relationIdMetadataTransformer = new RelationIdMetadataToAttributeTransformer_1.RelationIdMetadataToAttributeTransformer(this.expressionMap);
        relationIdMetadataTransformer.transform();
        const relationCountMetadataTransformer = new RelationCountMetadataToAttributeTransformer_1.RelationCountMetadataToAttributeTransformer(this.expressionMap);
        relationCountMetadataTransformer.transform();
        let rawResults = [], entities = [];
        // for pagination enabled (e.g. skip and take) its much more complicated - its a special process
        // where we make two queries to find the data we need
        // first query find ids in skip and take range
        // and second query loads the actual data in given ids range
        if ((this.expressionMap.skip || this.expressionMap.take) &&
            this.expressionMap.joinAttributes.length > 0) {
            // we are skipping order by here because its not working in subqueries anyway
            // to make order by working we need to apply it on a distinct query
            const [selects, orderBys] = this.createOrderByCombinedWithSelectExpression("distinctAlias");
            const metadata = this.expressionMap.mainAlias.metadata;
            const mainAliasName = this.expressionMap.mainAlias.name;
            const querySelects = metadata.primaryColumns.map((primaryColumn) => {
                const distinctAlias = this.escape("distinctAlias");
                const columnAlias = this.escape(DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, mainAliasName, primaryColumn.databaseName));
                if (!orderBys[columnAlias])
                    // make sure we aren't overriding user-defined order in inverse direction
                    orderBys[columnAlias] = "ASC";
                const alias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, "ids_" + mainAliasName, primaryColumn.databaseName);
                return `${distinctAlias}.${columnAlias} AS ${this.escape(alias)}`;
            });
            const originalQuery = this.clone();
            // preserve original timeTravel value since we set it to "false" in subquery
            const originalQueryTimeTravel = originalQuery.expressionMap.timeTravel;
            rawResults = await new SelectQueryBuilder(this.connection, queryRunner)
                .select(`DISTINCT ${querySelects.join(", ")}`)
                .addSelect(selects)
                .from(`(${originalQuery
                .orderBy()
                .timeTravelQuery(false) // set it to "false" since time travel clause must appear at the very end and applies to the entire SELECT clause.
                .getQuery()})`, "distinctAlias")
                .timeTravelQuery(originalQueryTimeTravel)
                .offset(this.expressionMap.skip)
                .limit(this.expressionMap.take)
                .orderBy(orderBys)
                .cache(this.expressionMap.cache && this.expressionMap.cacheId
                ? `${this.expressionMap.cacheId}-pagination`
                : this.expressionMap.cache, this.expressionMap.cacheDuration)
                .setParameters(this.getParameters())
                .setNativeParameters(this.expressionMap.nativeParameters)
                .getRawMany();
            if (rawResults.length > 0) {
                let condition = "";
                const parameters = {};
                if (metadata.hasMultiplePrimaryKeys) {
                    condition = rawResults
                        .map((result, index) => {
                        return metadata.primaryColumns
                            .map((primaryColumn) => {
                            const paramKey = `orm_distinct_ids_${index}_${primaryColumn.databaseName}`;
                            const paramKeyResult = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, "ids_" + mainAliasName, primaryColumn.databaseName);
                            parameters[paramKey] =
                                result[paramKeyResult];
                            return `${mainAliasName}.${primaryColumn.propertyPath}=:${paramKey}`;
                        })
                            .join(" AND ");
                    })
                        .join(" OR ");
                }
                else {
                    const alias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, "ids_" + mainAliasName, metadata.primaryColumns[0].databaseName);
                    const ids = rawResults.map((result) => result[alias]);
                    const areAllNumbers = ids.every((id) => typeof id === "number");
                    if (areAllNumbers) {
                        // fixes #190. if all numbers then its safe to perform query without parameter
                        condition = `${mainAliasName}.${metadata.primaryColumns[0].propertyPath} IN (${ids.join(", ")})`;
                    }
                    else {
                        parameters["orm_distinct_ids"] = ids;
                        condition =
                            mainAliasName +
                                "." +
                                metadata.primaryColumns[0].propertyPath +
                                " IN (:...orm_distinct_ids)";
                    }
                }
                rawResults = await this.clone()
                    .mergeExpressionMap({
                    extraAppendedAndWhereCondition: condition,
                })
                    .setParameters(parameters)
                    .loadRawResults(queryRunner);
            }
        }
        else {
            rawResults = await this.loadRawResults(queryRunner);
        }
        if (rawResults.length > 0) {
            // transform raw results into entities
            const rawRelationIdResults = await relationIdLoader.load(rawResults);
            const rawRelationCountResults = await relationCountLoader.load(rawResults);
            const transformer = new RawSqlResultsToEntityTransformer_1.RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, rawRelationIdResults, rawRelationCountResults, this.queryRunner);
            entities = transformer.transform(rawResults, this.expressionMap.mainAlias);
            // broadcast all "after load" events
            if (this.expressionMap.callListeners === true &&
                this.expressionMap.mainAlias.hasMetadata) {
                await queryRunner.broadcaster.broadcast("Load", this.expressionMap.mainAlias.metadata, entities);
            }
        }
        if (this.expressionMap.relationLoadStrategy === "query") {
            const queryStrategyRelationIdLoader = new RelationIdLoader_2.RelationIdLoader(this.connection, queryRunner);
            await Promise.all(this.relationMetadatas.map(async (relation) => {
                const relationTarget = relation.inverseEntityMetadata.target;
                const relationAlias = relation.inverseEntityMetadata.targetName;
                const select = Array.isArray(this.findOptions.select)
                    ? OrmUtils_1.OrmUtils.propertyPathsToTruthyObject(this.findOptions.select)
                    : this.findOptions.select;
                const relations = Array.isArray(this.findOptions.relations)
                    ? OrmUtils_1.OrmUtils.propertyPathsToTruthyObject(this.findOptions.relations)
                    : this.findOptions.relations;
                const queryBuilder = this.createQueryBuilder(queryRunner)
                    .select(relationAlias)
                    .from(relationTarget, relationAlias)
                    .setFindOptions({
                    select: select
                        ? OrmUtils_1.OrmUtils.deepValue(select, relation.propertyPath)
                        : undefined,
                    order: this.findOptions.order
                        ? OrmUtils_1.OrmUtils.deepValue(this.findOptions.order, relation.propertyPath)
                        : undefined,
                    relations: relations
                        ? OrmUtils_1.OrmUtils.deepValue(relations, relation.propertyPath)
                        : undefined,
                    withDeleted: this.findOptions.withDeleted,
                    relationLoadStrategy: this.findOptions.relationLoadStrategy,
                });
                if (entities.length > 0) {
                    const relatedEntityGroups = await queryStrategyRelationIdLoader.loadManyToManyRelationIdsAndGroup(relation, entities, undefined, queryBuilder);
                    entities.forEach((entity) => {
                        const relatedEntityGroup = relatedEntityGroups.find((group) => group.entity === entity);
                        if (relatedEntityGroup) {
                            const value = relatedEntityGroup.related === undefined
                                ? null
                                : relatedEntityGroup.related;
                            relation.setEntityValue(entity, value);
                        }
                    });
                }
            }));
        }
        return {
            raw: rawResults,
            entities: entities,
        };
    }
    createOrderByCombinedWithSelectExpression(parentAlias) {
        // if table has a default order then apply it
        const orderBys = this.expressionMap.allOrderBys;
        const selectString = Object.keys(orderBys)
            .map((orderCriteria) => {
            if (orderCriteria.indexOf(".") !== -1) {
                const criteriaParts = orderCriteria.split(".");
                const aliasName = criteriaParts[0];
                const propertyPath = criteriaParts.slice(1).join(".");
                const alias = this.expressionMap.findAliasByName(aliasName);
                const column = alias.metadata.findColumnWithPropertyPath(propertyPath);
                return (this.escape(parentAlias) +
                    "." +
                    this.escape(DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, aliasName, column.databaseName)));
            }
            else {
                if (this.expressionMap.selects.find((select) => select.selection === orderCriteria ||
                    select.aliasName === orderCriteria))
                    return (this.escape(parentAlias) +
                        "." +
                        this.escape(orderCriteria));
                return "";
            }
        })
            .join(", ");
        const orderByObject = {};
        Object.keys(orderBys).forEach((orderCriteria) => {
            if (orderCriteria.indexOf(".") !== -1) {
                const criteriaParts = orderCriteria.split(".");
                const aliasName = criteriaParts[0];
                const propertyPath = criteriaParts.slice(1).join(".");
                const alias = this.expressionMap.findAliasByName(aliasName);
                const column = alias.metadata.findColumnWithPropertyPath(propertyPath);
                orderByObject[this.escape(parentAlias) +
                    "." +
                    this.escape(DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, aliasName, column.databaseName))] = orderBys[orderCriteria];
            }
            else {
                if (this.expressionMap.selects.find((select) => select.selection === orderCriteria ||
                    select.aliasName === orderCriteria)) {
                    orderByObject[this.escape(parentAlias) +
                        "." +
                        this.escape(orderCriteria)] = orderBys[orderCriteria];
                }
                else {
                    orderByObject[orderCriteria] = orderBys[orderCriteria];
                }
            }
        });
        return [selectString, orderByObject];
    }
    /**
     * Loads raw results from the database.
     */
    async loadRawResults(queryRunner) {
        const [sql, parameters] = this.getQueryAndParameters();
        const queryId = sql +
            " -- PARAMETERS: " +
            JSON.stringify(parameters, (_, value) => typeof value === "bigint" ? value.toString() : value);
        const cacheOptions = typeof this.connection.options.cache === "object"
            ? this.connection.options.cache
            : {};
        let savedQueryResultCacheOptions = undefined;
        const isCachingEnabled = 
        // Caching is enabled globally and isn't disabled locally.
        (cacheOptions.alwaysEnabled &&
            this.expressionMap.cache !== false) ||
            // ...or it's enabled locally explicitly.
            this.expressionMap.cache === true;
        let cacheError = false;
        if (this.connection.queryResultCache && isCachingEnabled) {
            try {
                savedQueryResultCacheOptions =
                    await this.connection.queryResultCache.getFromCache({
                        identifier: this.expressionMap.cacheId,
                        query: queryId,
                        duration: this.expressionMap.cacheDuration ||
                            cacheOptions.duration ||
                            1000,
                    }, queryRunner);
                if (savedQueryResultCacheOptions &&
                    !this.connection.queryResultCache.isExpired(savedQueryResultCacheOptions)) {
                    return JSON.parse(savedQueryResultCacheOptions.result);
                }
            }
            catch (error) {
                if (!cacheOptions.ignoreErrors) {
                    throw error;
                }
                cacheError = true;
            }
        }
        const results = await queryRunner.query(sql, parameters, true);
        if (!cacheError &&
            this.connection.queryResultCache &&
            isCachingEnabled) {
            try {
                await this.connection.queryResultCache.storeInCache({
                    identifier: this.expressionMap.cacheId,
                    query: queryId,
                    time: new Date().getTime(),
                    duration: this.expressionMap.cacheDuration ||
                        cacheOptions.duration ||
                        1000,
                    result: JSON.stringify(results.records),
                }, savedQueryResultCacheOptions, queryRunner);
            }
            catch (error) {
                if (!cacheOptions.ignoreErrors) {
                    throw error;
                }
            }
        }
        return results.records;
    }
    /**
     * Merges into expression map given expression map properties.
     */
    mergeExpressionMap(expressionMap) {
        ObjectUtils_1.ObjectUtils.assign(this.expressionMap, expressionMap);
        return this;
    }
    /**
     * Normalizes a give number - converts to int if possible.
     */
    normalizeNumber(num) {
        if (typeof num === "number" || num === undefined || num === null)
            return num;
        return Number(num);
    }
    /**
     * Creates a query builder used to execute sql queries inside this query builder.
     */
    obtainQueryRunner() {
        return (this.queryRunner ||
            this.connection.createQueryRunner(this.connection.defaultReplicationModeForReads()));
    }
    buildSelect(select, metadata, alias, embedPrefix) {
        for (let key in select) {
            if (select[key] === undefined || select[key] === false)
                continue;
            const propertyPath = embedPrefix ? embedPrefix + "." + key : key;
            const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
            const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
            const relation = metadata.findRelationWithPropertyPath(propertyPath);
            if (!embed && !column && !relation)
                throw new EntityPropertyNotFoundError_1.EntityPropertyNotFoundError(propertyPath, metadata);
            if (column) {
                this.selects.push(alias + "." + propertyPath);
                // this.addSelect(alias + "." + propertyPath);
            }
            else if (embed) {
                this.buildSelect(select[key], metadata, alias, propertyPath);
                // } else if (relation) {
                //     const joinAlias = alias + "_" + relation.propertyName;
                //     const existJoin = this.joins.find(join => join.alias === joinAlias);
                //     if (!existJoin) {
                //         this.joins.push({
                //             type: "left",
                //             select: false,
                //             alias: joinAlias,
                //             parentAlias: alias,
                //             relationMetadata: relation
                //         });
                //     }
                //     this.buildOrder(select[key] as FindOptionsOrder<any>, relation.inverseEntityMetadata, joinAlias);
            }
        }
    }
    buildRelations(relations, selection, metadata, alias, embedPrefix) {
        if (!relations)
            return;
        Object.keys(relations).forEach((relationName) => {
            const relationValue = relations[relationName];
            const propertyPath = embedPrefix
                ? embedPrefix + "." + relationName
                : relationName;
            const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
            const relation = metadata.findRelationWithPropertyPath(propertyPath);
            if (!embed && !relation)
                throw new EntityPropertyNotFoundError_1.EntityPropertyNotFoundError(propertyPath, metadata);
            if (embed) {
                this.buildRelations(relationValue, typeof selection === "object"
                    ? OrmUtils_1.OrmUtils.deepValue(selection, embed.propertyPath)
                    : undefined, metadata, alias, propertyPath);
            }
            else if (relation) {
                let joinAlias = alias + "_" + propertyPath.replace(".", "_");
                joinAlias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, { joiner: "__" }, alias, joinAlias);
                if (relationValue === true ||
                    typeof relationValue === "object") {
                    if (this.expressionMap.relationLoadStrategy === "query") {
                        this.concatRelationMetadata(relation);
                    }
                    else {
                        // join
                        this.joins.push({
                            type: "left",
                            select: true,
                            selection: selection &&
                                typeof selection[relationName] === "object"
                                ? selection[relationName]
                                : undefined,
                            alias: joinAlias,
                            parentAlias: alias,
                            relationMetadata: relation,
                        });
                        if (selection &&
                            typeof selection[relationName] === "object") {
                            this.buildSelect(selection[relationName], relation.inverseEntityMetadata, joinAlias);
                        }
                    }
                }
                if (typeof relationValue === "object" &&
                    this.expressionMap.relationLoadStrategy === "join") {
                    this.buildRelations(relationValue, typeof selection === "object"
                        ? OrmUtils_1.OrmUtils.deepValue(selection, relation.propertyPath)
                        : undefined, relation.inverseEntityMetadata, joinAlias, undefined);
                }
            }
        });
    }
    buildEagerRelations(relations, selection, metadata, alias, embedPrefix) {
        if (!relations)
            return;
        Object.keys(relations).forEach((relationName) => {
            const relationValue = relations[relationName];
            const propertyPath = embedPrefix
                ? embedPrefix + "." + relationName
                : relationName;
            const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
            const relation = metadata.findRelationWithPropertyPath(propertyPath);
            if (!embed && !relation)
                throw new EntityPropertyNotFoundError_1.EntityPropertyNotFoundError(propertyPath, metadata);
            if (embed) {
                this.buildEagerRelations(relationValue, typeof selection === "object"
                    ? OrmUtils_1.OrmUtils.deepValue(selection, embed.propertyPath)
                    : undefined, metadata, alias, propertyPath);
            }
            else if (relation) {
                let joinAlias = alias + "_" + propertyPath.replace(".", "_");
                joinAlias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, { joiner: "__" }, alias, joinAlias);
                if (relationValue === true ||
                    typeof relationValue === "object") {
                    relation.inverseEntityMetadata.eagerRelations.forEach((eagerRelation) => {
                        let eagerRelationJoinAlias = joinAlias +
                            "_" +
                            eagerRelation.propertyPath.replace(".", "_");
                        eagerRelationJoinAlias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, { joiner: "__" }, joinAlias, eagerRelationJoinAlias);
                        const existJoin = this.joins.find((join) => join.alias === eagerRelationJoinAlias);
                        if (!existJoin) {
                            this.joins.push({
                                type: "left",
                                select: true,
                                alias: eagerRelationJoinAlias,
                                parentAlias: joinAlias,
                                selection: undefined,
                                relationMetadata: eagerRelation,
                            });
                        }
                        if (selection &&
                            typeof selection[relationName] === "object") {
                            this.buildSelect(selection[relationName], relation.inverseEntityMetadata, joinAlias);
                        }
                    });
                }
                if (typeof relationValue === "object") {
                    this.buildEagerRelations(relationValue, typeof selection === "object"
                        ? OrmUtils_1.OrmUtils.deepValue(selection, relation.propertyPath)
                        : undefined, relation.inverseEntityMetadata, joinAlias, undefined);
                }
            }
        });
    }
    buildOrder(order, metadata, alias, embedPrefix) {
        for (let key in order) {
            if (order[key] === undefined)
                continue;
            const propertyPath = embedPrefix ? embedPrefix + "." + key : key;
            const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
            const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
            const relation = metadata.findRelationWithPropertyPath(propertyPath);
            if (!embed && !column && !relation)
                throw new EntityPropertyNotFoundError_1.EntityPropertyNotFoundError(propertyPath, metadata);
            if (column) {
                let direction = typeof order[key] === "object"
                    ? order[key].direction
                    : order[key];
                direction =
                    direction === "DESC" ||
                        direction === "desc" ||
                        direction === -1
                        ? "DESC"
                        : "ASC";
                let nulls = typeof order[key] === "object"
                    ? order[key].nulls
                    : undefined;
                nulls =
                    nulls?.toLowerCase() === "first"
                        ? "NULLS FIRST"
                        : nulls?.toLowerCase() === "last"
                            ? "NULLS LAST"
                            : undefined;
                let aliasPath = `${alias}.${propertyPath}`;
                // const selection = this.expressionMap.selects.find(
                //     (s) => s.selection === aliasPath,
                // )
                // if (selection) {
                //     // this is not building correctly now???
                //     aliasPath = this.escape(
                //         DriverUtils.buildAlias(
                //             this.connection.driver,
                //             undefined,
                //             alias,
                //             column.databaseName,
                //         ),
                //     )
                //     // selection.aliasName = aliasPath
                // } else {
                //     if (column.isVirtualProperty && column.query) {
                //         aliasPath = `(${column.query(alias)})`
                //     }
                // }
                // console.log("add sort", selection, aliasPath, direction, nulls)
                this.addOrderBy(aliasPath, direction, nulls);
                // this.orderBys.push({ alias: alias + "." + propertyPath, direction, nulls });
            }
            else if (embed) {
                this.buildOrder(order[key], metadata, alias, propertyPath);
            }
            else if (relation) {
                let joinAlias = alias + "_" + propertyPath.replace(".", "_");
                joinAlias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, { joiner: "__" }, alias, joinAlias);
                // console.log("joinAlias", joinAlias, joinAlias.length, this.connection.driver.maxAliasLength)
                // todo: use expressionMap.joinAttributes, and create a new one using
                //  const joinAttribute = new JoinAttribute(this.connection, this.expressionMap);
                const existJoin = this.joins.find((join) => join.alias === joinAlias);
                if (!existJoin) {
                    this.joins.push({
                        type: "left",
                        select: false,
                        alias: joinAlias,
                        parentAlias: alias,
                        selection: undefined,
                        relationMetadata: relation,
                    });
                }
                this.buildOrder(order[key], relation.inverseEntityMetadata, joinAlias);
            }
        }
    }
    buildWhere(where, metadata, alias, embedPrefix) {
        let condition = "";
        // let parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
        if (Array.isArray(where)) {
            if (where.length) {
                condition = where
                    .map((whereItem) => {
                    return this.buildWhere(whereItem, metadata, alias, embedPrefix);
                })
                    .filter((condition) => !!condition)
                    .map((condition) => "(" + condition + ")")
                    .join(" OR ");
            }
        }
        else {
            let andConditions = [];
            for (let key in where) {
                if (where[key] === undefined || where[key] === null)
                    continue;
                const propertyPath = embedPrefix ? embedPrefix + "." + key : key;
                const column = metadata.findColumnWithPropertyPathStrict(propertyPath);
                const embed = metadata.findEmbeddedWithPropertyPath(propertyPath);
                const relation = metadata.findRelationWithPropertyPath(propertyPath);
                if (!embed && !column && !relation)
                    throw new EntityPropertyNotFoundError_1.EntityPropertyNotFoundError(propertyPath, metadata);
                if (column) {
                    let aliasPath = `${alias}.${propertyPath}`;
                    if (column.isVirtualProperty && column.query) {
                        aliasPath = `(${column.query(alias)})`;
                    }
                    // const parameterName = alias + "_" + propertyPath.split(".").join("_") + "_" + parameterIndex;
                    // todo: we need to handle other operators as well?
                    let parameterValue = where[key];
                    if (InstanceChecker_1.InstanceChecker.isEqualOperator(where[key])) {
                        parameterValue = where[key].value;
                    }
                    if (column.transformer) {
                        parameterValue instanceof FindOperator_1.FindOperator
                            ? parameterValue.transformValue(column.transformer)
                            : (parameterValue =
                                ApplyValueTransformers_1.ApplyValueTransformers.transformTo(column.transformer, parameterValue));
                    }
                    // if (parameterValue === null) {
                    //     andConditions.push(`${aliasPath} IS NULL`);
                    //
                    // } else if (parameterValue instanceof FindOperator) {
                    //     // let parameters: any[] = [];
                    //     // if (parameterValue.useParameter) {
                    //     //     const realParameterValues: any[] = parameterValue.multipleParameters ? parameterValue.value : [parameterValue.value];
                    //     //     realParameterValues.forEach((realParameterValue, realParameterValueIndex) => {
                    //     //
                    //     //         // don't create parameters for number to prevent max number of variables issues as much as possible
                    //     //         if (typeof realParameterValue === "number") {
                    //     //             parameters.push(realParameterValue);
                    //     //
                    //     //         } else {
                    //     //             this.expressionMap.nativeParameters[parameterName + realParameterValueIndex] = realParameterValue;
                    //     //             parameterIndex++;
                    //     //             parameters.push(this.connection.driver.createParameter(parameterName + realParameterValueIndex, parameterIndex - 1));
                    //     //         }
                    //     //     });
                    //     // }
                    //     andConditions.push(
                    //         this.createWhereConditionExpression(this.getWherePredicateCondition(aliasPath, parameterValue))
                    //         // parameterValue.toSql(this.connection, aliasPath, parameters));
                    //     )
                    //
                    // } else {
                    //     this.expressionMap.nativeParameters[parameterName] = parameterValue;
                    //     parameterIndex++;
                    //     const parameter = this.connection.driver.createParameter(parameterName, parameterIndex - 1);
                    //     andConditions.push(`${aliasPath} = ${parameter}`);
                    // }
                    andConditions.push(this.createWhereConditionExpression(this.getWherePredicateCondition(aliasPath, parameterValue)));
                    // this.conditions.push(`${alias}.${propertyPath} = :${paramName}`);
                    // this.expressionMap.parameters[paramName] = where[key]; // todo: handle functions and other edge cases
                }
                else if (embed) {
                    const condition = this.buildWhere(where[key], metadata, alias, propertyPath);
                    if (condition)
                        andConditions.push(condition);
                }
                else if (relation) {
                    // if all properties of where are undefined we don't need to join anything
                    // this can happen when user defines map with conditional queries inside
                    if (typeof where[key] === "object") {
                        const allAllUndefined = Object.keys(where[key]).every((k) => where[key][k] === undefined);
                        if (allAllUndefined) {
                            continue;
                        }
                    }
                    if (InstanceChecker_1.InstanceChecker.isFindOperator(where[key])) {
                        if (where[key].type === "moreThan" ||
                            where[key].type === "lessThan" ||
                            where[key].type === "moreThanOrEqual" ||
                            where[key].type === "lessThanOrEqual") {
                            let sqlOperator = "";
                            if (where[key].type === "moreThan") {
                                sqlOperator = ">";
                            }
                            else if (where[key].type === "lessThan") {
                                sqlOperator = "<";
                            }
                            else if (where[key].type === "moreThanOrEqual") {
                                sqlOperator = ">=";
                            }
                            else if (where[key].type === "lessThanOrEqual") {
                                sqlOperator = "<=";
                            }
                            // basically relation count functionality
                            const qb = this.subQuery();
                            if (relation.isManyToManyOwner) {
                                qb.select("COUNT(*)")
                                    .from(relation.joinTableName, relation.joinTableName)
                                    .where(relation.joinColumns
                                    .map((column) => {
                                    return `${relation.joinTableName}.${column.propertyName} = ${alias}.${column.referencedColumn
                                        .propertyName}`;
                                })
                                    .join(" AND "));
                            }
                            else if (relation.isManyToManyNotOwner) {
                                qb.select("COUNT(*)")
                                    .from(relation.inverseRelation.joinTableName, relation.inverseRelation.joinTableName)
                                    .where(relation
                                    .inverseRelation.inverseJoinColumns.map((column) => {
                                    return `${relation.inverseRelation
                                        .joinTableName}.${column.propertyName} = ${alias}.${column.referencedColumn
                                        .propertyName}`;
                                })
                                    .join(" AND "));
                            }
                            else if (relation.isOneToMany) {
                                qb.select("COUNT(*)")
                                    .from(relation.inverseEntityMetadata.target, relation.inverseEntityMetadata
                                    .tableName)
                                    .where(relation
                                    .inverseRelation.joinColumns.map((column) => {
                                    return `${relation
                                        .inverseEntityMetadata
                                        .tableName}.${column.propertyName} = ${alias}.${column.referencedColumn
                                        .propertyName}`;
                                })
                                    .join(" AND "));
                            }
                            else {
                                throw new Error(`This relation isn't supported by given find operator`);
                            }
                            // this
                            //     .addSelect(qb.getSql(), relation.propertyAliasName + "_cnt")
                            //     .andWhere(this.escape(relation.propertyAliasName + "_cnt") + " " + sqlOperator + " " + parseInt(where[key].value));
                            this.andWhere(qb.getSql() +
                                " " +
                                sqlOperator +
                                " " +
                                parseInt(where[key].value));
                        }
                        else {
                            if (relation.isManyToOne ||
                                (relation.isOneToOne &&
                                    relation.isOneToOneOwner)) {
                                const aliasPath = `${alias}.${propertyPath}`;
                                andConditions.push(this.createWhereConditionExpression(this.getWherePredicateCondition(aliasPath, where[key])));
                            }
                            else {
                                throw new Error(`This relation isn't supported by given find operator`);
                            }
                        }
                    }
                    else {
                        // const joinAlias = alias + "_" + relation.propertyName;
                        let joinAlias = alias +
                            "_" +
                            relation.propertyPath.replace(".", "_");
                        joinAlias = DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, { joiner: "__" }, alias, joinAlias);
                        const existJoin = this.joins.find((join) => join.alias === joinAlias);
                        if (!existJoin) {
                            this.joins.push({
                                type: "left",
                                select: false,
                                selection: undefined,
                                alias: joinAlias,
                                parentAlias: alias,
                                relationMetadata: relation,
                            });
                        }
                        const condition = this.buildWhere(where[key], relation.inverseEntityMetadata, joinAlias);
                        if (condition) {
                            andConditions.push(condition);
                            // parameterIndex = Object.keys(this.expressionMap.nativeParameters).length;
                        }
                    }
                }
            }
            condition = andConditions.length
                ? "(" + andConditions.join(") AND (") + ")"
                : andConditions.join(" AND ");
        }
        return condition.length ? "(" + condition + ")" : condition;
    }
}
exports.SelectQueryBuilder = SelectQueryBuilder;

//# sourceMappingURL=SelectQueryBuilder.js.map
