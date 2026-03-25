"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryExpressionMap = void 0;
const Alias_1 = require("./Alias");
const JoinAttribute_1 = require("./JoinAttribute");
const RelationIdAttribute_1 = require("./relation-id/RelationIdAttribute");
const RelationCountAttribute_1 = require("./relation-count/RelationCountAttribute");
const error_1 = require("../error");
/**
 * Contains all properties of the QueryBuilder that needs to be build a final query.
 */
class QueryExpressionMap {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        this.connection = connection;
        // -------------------------------------------------------------------------
        // Public Properties
        // -------------------------------------------------------------------------
        /**
         * Strategy to load relations.
         */
        this.relationLoadStrategy = "join";
        /**
         * Indicates if QueryBuilder used to select entities and not a raw results.
         */
        this.queryEntity = false;
        /**
         * All aliases (including main alias) used in the query.
         */
        this.aliases = [];
        /**
         * Represents query type. QueryBuilder is able to build SELECT, UPDATE and DELETE queries.
         */
        this.queryType = "select";
        /**
         * Data needs to be SELECT-ed.
         */
        this.selects = [];
        /**
         * Max execution time in millisecond.
         */
        this.maxExecutionTime = 0;
        /**
         * Whether SELECT is DISTINCT.
         */
        this.selectDistinct = false;
        /**
         * SELECT DISTINCT ON query (postgres).
         */
        this.selectDistinctOn = [];
        /**
         * Extra returning columns to be added to the returning statement if driver supports it.
         */
        this.extraReturningColumns = [];
        /**
         * Optional on conflict statement used in insertion query in postgres.
         */
        this.onConflict = "";
        /**
         * Optional on ignore statement used in insertion query in databases.
         */
        this.onIgnore = false;
        /**
         * JOIN queries.
         */
        this.joinAttributes = [];
        /**
         * RelationId queries.
         */
        this.relationIdAttributes = [];
        /**
         * Relation count queries.
         */
        this.relationCountAttributes = [];
        /**
         * WHERE queries.
         */
        this.wheres = [];
        /**
         * HAVING queries.
         */
        this.havings = [];
        /**
         * ORDER BY queries.
         */
        this.orderBys = {};
        /**
         * GROUP BY queries.
         */
        this.groupBys = [];
        /**
         * Indicates if soft-deleted rows should be included in entity result.
         * By default the soft-deleted rows are not included.
         */
        this.withDeleted = false;
        /**
         * Parameters used to be escaped in final query.
         */
        this.parameters = {};
        /**
         * Indicates if alias, table names and column names will be escaped by driver, or not.
         *
         * todo: rename to isQuotingDisabled, also think if it should be named "escaping"
         */
        this.disableEscaping = true;
        /**
         * Indicates if virtual columns should be included in entity result.
         *
         * todo: what to do with it? is it properly used? what about persistence?
         */
        this.enableRelationIdValues = false;
        /**
         * Extra where condition appended to the end of original where conditions with AND keyword.
         * Original condition will be wrapped into brackets.
         */
        this.extraAppendedAndWhereCondition = "";
        /**
         * Indicates if query builder creates a subquery.
         */
        this.subQuery = false;
        /**
         * Indicates if property names are prefixed with alias names during property replacement.
         * By default this is enabled, however we need this because aliases are not supported in UPDATE and DELETE queries,
         * but user can use them in WHERE expressions.
         */
        this.aliasNamePrefixingEnabled = true;
        /**
         * Options that define QueryBuilder behaviour.
         */
        this.options = [];
        /**
         * List of columns where data should be inserted.
         * Used in INSERT query.
         */
        this.insertColumns = [];
        /**
         * Used if user wants to update or delete a specific entities.
         */
        this.whereEntities = [];
        /**
         * Indicates if entity must be updated after insertion / updation.
         * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
         */
        this.updateEntity = true;
        /**
         * Indicates if listeners and subscribers must be called before and after query execution.
         */
        this.callListeners = true;
        /**
         * Indicates if query must be wrapped into transaction.
         */
        this.useTransaction = false;
        /**
         * Extra parameters.
         *
         * @deprecated Use standard parameters instead
         */
        this.nativeParameters = {};
        /**
         * Items from an entity that have been locally generated & are recorded here for later use.
         * Examples include the UUID generation when the database does not natively support it.
         * These are included in the entity index order.
         */
        this.locallyGenerated = {};
        this.commonTableExpressions = [];
        if (connection.options.relationLoadStrategy) {
            this.relationLoadStrategy = connection.options.relationLoadStrategy;
        }
        this.timeTravel = false;
    }
    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------
    /**
     * Get all ORDER BY queries - if order by is specified by user then it uses them,
     * otherwise it uses default entity order by if it was set.
     */
    get allOrderBys() {
        if (!Object.keys(this.orderBys).length &&
            this.mainAlias.hasMetadata &&
            this.options.indexOf("disable-global-order") === -1) {
            const entityOrderBy = this.mainAlias.metadata.orderBy || {};
            return Object.keys(entityOrderBy).reduce((orderBy, key) => {
                orderBy[this.mainAlias.name + "." + key] = entityOrderBy[key];
                return orderBy;
            }, {});
        }
        return this.orderBys;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a main alias and adds it to the current expression map.
     */
    setMainAlias(alias) {
        // if main alias is already set then remove it from the array
        // if (this.mainAlias)
        //     this.aliases.splice(this.aliases.indexOf(this.mainAlias));
        // set new main alias
        this.mainAlias = alias;
        return alias;
    }
    /**
     * Creates a new alias and adds it to the current expression map.
     */
    createAlias(options) {
        let aliasName = options.name;
        if (!aliasName && options.tablePath)
            aliasName = options.tablePath;
        if (!aliasName && typeof options.target === "function")
            aliasName = options.target.name;
        if (!aliasName && typeof options.target === "string")
            aliasName = options.target;
        const alias = new Alias_1.Alias();
        alias.type = options.type;
        if (aliasName)
            alias.name = aliasName;
        if (options.metadata)
            alias.metadata = options.metadata;
        if (options.target && !alias.hasMetadata)
            alias.metadata = this.connection.getMetadata(options.target);
        if (options.tablePath)
            alias.tablePath = options.tablePath;
        if (options.subQuery)
            alias.subQuery = options.subQuery;
        this.aliases.push(alias);
        return alias;
    }
    /**
     * Finds alias with the given name.
     * If alias was not found it throw an exception.
     */
    findAliasByName(aliasName) {
        const alias = this.aliases.find((alias) => alias.name === aliasName);
        if (!alias)
            throw new error_1.TypeORMError(`"${aliasName}" alias was not found. Maybe you forgot to join it?`);
        return alias;
    }
    findColumnByAliasExpression(aliasExpression) {
        const [aliasName, propertyPath] = aliasExpression.split(".");
        const alias = this.findAliasByName(aliasName);
        return alias.metadata.findColumnWithPropertyName(propertyPath);
    }
    /**
     * Gets relation metadata of the relation this query builder works with.
     *
     * todo: add proper exceptions
     */
    get relationMetadata() {
        if (!this.mainAlias)
            throw new error_1.TypeORMError(`Entity to work with is not specified!`); // todo: better message
        const relationMetadata = this.mainAlias.metadata.findRelationWithPropertyPath(this.relationPropertyPath);
        if (!relationMetadata)
            throw new error_1.TypeORMError(`Relation ${this.relationPropertyPath} was not found in entity ${this.mainAlias.name}`); // todo: better message
        return relationMetadata;
    }
    /**
     * Copies all properties of the current QueryExpressionMap into a new one.
     * Useful when QueryBuilder needs to create a copy of itself.
     */
    clone() {
        const map = new QueryExpressionMap(this.connection);
        map.queryType = this.queryType;
        map.selects = this.selects.map((select) => select);
        map.maxExecutionTime = this.maxExecutionTime;
        map.selectDistinct = this.selectDistinct;
        map.selectDistinctOn = this.selectDistinctOn;
        this.aliases.forEach((alias) => map.aliases.push(new Alias_1.Alias(alias)));
        map.relationLoadStrategy = this.relationLoadStrategy;
        map.mainAlias = this.mainAlias;
        map.valuesSet = this.valuesSet;
        map.returning = this.returning;
        map.onConflict = this.onConflict;
        map.onIgnore = this.onIgnore;
        map.onUpdate = this.onUpdate;
        map.joinAttributes = this.joinAttributes.map((join) => new JoinAttribute_1.JoinAttribute(this.connection, this, join));
        map.relationIdAttributes = this.relationIdAttributes.map((relationId) => new RelationIdAttribute_1.RelationIdAttribute(this, relationId));
        map.relationCountAttributes = this.relationCountAttributes.map((relationCount) => new RelationCountAttribute_1.RelationCountAttribute(this, relationCount));
        map.wheres = this.wheres.map((where) => ({ ...where }));
        map.havings = this.havings.map((having) => ({ ...having }));
        map.orderBys = Object.assign({}, this.orderBys);
        map.groupBys = this.groupBys.map((groupBy) => groupBy);
        map.limit = this.limit;
        map.offset = this.offset;
        map.skip = this.skip;
        map.take = this.take;
        map.lockMode = this.lockMode;
        map.onLocked = this.onLocked;
        map.lockVersion = this.lockVersion;
        map.lockTables = this.lockTables;
        map.withDeleted = this.withDeleted;
        map.parameters = Object.assign({}, this.parameters);
        map.disableEscaping = this.disableEscaping;
        map.enableRelationIdValues = this.enableRelationIdValues;
        map.extraAppendedAndWhereCondition = this.extraAppendedAndWhereCondition;
        map.subQuery = this.subQuery;
        map.aliasNamePrefixingEnabled = this.aliasNamePrefixingEnabled;
        map.cache = this.cache;
        map.cacheId = this.cacheId;
        map.cacheDuration = this.cacheDuration;
        map.relationPropertyPath = this.relationPropertyPath;
        map.of = this.of;
        map.insertColumns = this.insertColumns;
        map.whereEntities = this.whereEntities;
        map.updateEntity = this.updateEntity;
        map.callListeners = this.callListeners;
        map.useTransaction = this.useTransaction;
        map.timeTravel = this.timeTravel;
        map.nativeParameters = Object.assign({}, this.nativeParameters);
        map.comment = this.comment;
        map.commonTableExpressions = this.commonTableExpressions.map((cteOptions) => ({
            alias: cteOptions.alias,
            queryBuilder: typeof cteOptions.queryBuilder === "string"
                ? cteOptions.queryBuilder
                : cteOptions.queryBuilder.clone(),
            options: cteOptions.options,
        }));
        return map;
    }
}
exports.QueryExpressionMap = QueryExpressionMap;

//# sourceMappingURL=QueryExpressionMap.js.map
