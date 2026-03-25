"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationLoader = void 0;
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
/**
 * Wraps entities and creates getters/setters for their relations
 * to be able to lazily load relations when accessing these relations.
 */
class RelationLoader {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        this.connection = connection;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Loads relation data for the given entity and its relation.
     */
    load(relation, entityOrEntities, queryRunner, queryBuilder) {
        // todo: check all places where it uses non array
        if (queryRunner && queryRunner.isReleased)
            queryRunner = undefined; // get new one if already closed
        if (relation.isManyToOne || relation.isOneToOneOwner) {
            return this.loadManyToOneOrOneToOneOwner(relation, entityOrEntities, queryRunner, queryBuilder);
        }
        else if (relation.isOneToMany || relation.isOneToOneNotOwner) {
            return this.loadOneToManyOrOneToOneNotOwner(relation, entityOrEntities, queryRunner, queryBuilder);
        }
        else if (relation.isManyToManyOwner) {
            return this.loadManyToManyOwner(relation, entityOrEntities, queryRunner, queryBuilder);
        }
        else {
            // many-to-many non owner
            return this.loadManyToManyNotOwner(relation, entityOrEntities, queryRunner, queryBuilder);
        }
    }
    /**
     * Loads data for many-to-one and one-to-one owner relations.
     *
     * (ow) post.category<=>category.post
     * loaded: category from post
     * example: SELECT category.id AS category_id, category.name AS category_name FROM category category
     *              INNER JOIN post Post ON Post.category=category.id WHERE Post.id=1
     */
    loadManyToOneOrOneToOneOwner(relation, entityOrEntities, queryRunner, queryBuilder) {
        const entities = Array.isArray(entityOrEntities)
            ? entityOrEntities
            : [entityOrEntities];
        const joinAliasName = relation.entityMetadata.name;
        const qb = queryBuilder
            ? queryBuilder
            : this.connection
                .createQueryBuilder(queryRunner)
                .select(relation.propertyName) // category
                .from(relation.type, relation.propertyName);
        const mainAlias = qb.expressionMap.mainAlias.name;
        const columns = relation.entityMetadata.primaryColumns;
        const joinColumns = relation.isOwning
            ? relation.joinColumns
            : relation.inverseRelation.joinColumns;
        const conditions = joinColumns
            .map((joinColumn) => {
            return `${relation.entityMetadata.name}.${joinColumn.propertyName} = ${mainAlias}.${joinColumn.referencedColumn.propertyName}`;
        })
            .join(" AND ");
        qb.innerJoin(relation.entityMetadata.target, joinAliasName, conditions);
        if (columns.length === 1) {
            qb.where(`${joinAliasName}.${columns[0].propertyPath} IN (:...${joinAliasName + "_" + columns[0].propertyName})`);
            qb.setParameter(joinAliasName + "_" + columns[0].propertyName, entities.map((entity) => columns[0].getEntityValue(entity, true)));
        }
        else {
            const condition = entities
                .map((entity, entityIndex) => {
                return columns
                    .map((column, columnIndex) => {
                    const paramName = joinAliasName +
                        "_entity_" +
                        entityIndex +
                        "_" +
                        columnIndex;
                    qb.setParameter(paramName, column.getEntityValue(entity, true));
                    return (joinAliasName +
                        "." +
                        column.propertyPath +
                        " = :" +
                        paramName);
                })
                    .join(" AND ");
            })
                .map((condition) => "(" + condition + ")")
                .join(" OR ");
            qb.where(condition);
        }
        FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
        return qb.getMany();
        // return qb.getOne(); todo: fix all usages
    }
    /**
     * Loads data for one-to-many and one-to-one not owner relations.
     *
     * SELECT post
     * FROM post post
     * WHERE post.[joinColumn.name] = entity[joinColumn.referencedColumn]
     */
    loadOneToManyOrOneToOneNotOwner(relation, entityOrEntities, queryRunner, queryBuilder) {
        const entities = Array.isArray(entityOrEntities)
            ? entityOrEntities
            : [entityOrEntities];
        const columns = relation.inverseRelation.joinColumns;
        const qb = queryBuilder
            ? queryBuilder
            : this.connection
                .createQueryBuilder(queryRunner)
                .select(relation.propertyName)
                .from(relation.inverseRelation.entityMetadata.target, relation.propertyName);
        const aliasName = qb.expressionMap.mainAlias.name;
        if (columns.length === 1) {
            qb.where(`${aliasName}.${columns[0].propertyPath} IN (:...${aliasName + "_" + columns[0].propertyName})`);
            qb.setParameter(aliasName + "_" + columns[0].propertyName, entities.map((entity) => columns[0].referencedColumn.getEntityValue(entity, true)));
        }
        else {
            const condition = entities
                .map((entity, entityIndex) => {
                return columns
                    .map((column, columnIndex) => {
                    const paramName = aliasName +
                        "_entity_" +
                        entityIndex +
                        "_" +
                        columnIndex;
                    qb.setParameter(paramName, column.referencedColumn.getEntityValue(entity, true));
                    return (aliasName +
                        "." +
                        column.propertyPath +
                        " = :" +
                        paramName);
                })
                    .join(" AND ");
            })
                .map((condition) => "(" + condition + ")")
                .join(" OR ");
            qb.where(condition);
        }
        FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
        return qb.getMany();
        // return relation.isOneToMany ? qb.getMany() : qb.getOne(); todo: fix all usages
    }
    /**
     * Loads data for many-to-many owner relations.
     *
     * SELECT category
     * FROM category category
     * INNER JOIN post_categories post_categories
     * ON post_categories.postId = :postId
     * AND post_categories.categoryId = category.id
     */
    loadManyToManyOwner(relation, entityOrEntities, queryRunner, queryBuilder) {
        const entities = Array.isArray(entityOrEntities)
            ? entityOrEntities
            : [entityOrEntities];
        const parameters = relation.joinColumns.reduce((parameters, joinColumn) => {
            parameters[joinColumn.propertyName] = entities.map((entity) => joinColumn.referencedColumn.getEntityValue(entity, true));
            return parameters;
        }, {});
        const qb = queryBuilder
            ? queryBuilder
            : this.connection
                .createQueryBuilder(queryRunner)
                .select(relation.propertyName)
                .from(relation.type, relation.propertyName);
        const mainAlias = qb.expressionMap.mainAlias.name;
        const joinAlias = relation.junctionEntityMetadata.tableName;
        const joinColumnConditions = relation.joinColumns.map((joinColumn) => {
            return `${joinAlias}.${joinColumn.propertyName} IN (:...${joinColumn.propertyName})`;
        });
        const inverseJoinColumnConditions = relation.inverseJoinColumns.map((inverseJoinColumn) => {
            return `${joinAlias}.${inverseJoinColumn.propertyName}=${mainAlias}.${inverseJoinColumn.referencedColumn.propertyName}`;
        });
        qb.innerJoin(joinAlias, joinAlias, [...joinColumnConditions, ...inverseJoinColumnConditions].join(" AND ")).setParameters(parameters);
        FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
        return qb.getMany();
    }
    /**
     * Loads data for many-to-many not owner relations.
     *
     * SELECT post
     * FROM post post
     * INNER JOIN post_categories post_categories
     * ON post_categories.postId = post.id
     * AND post_categories.categoryId = post_categories.categoryId
     */
    loadManyToManyNotOwner(relation, entityOrEntities, queryRunner, queryBuilder) {
        const entities = Array.isArray(entityOrEntities)
            ? entityOrEntities
            : [entityOrEntities];
        const qb = queryBuilder
            ? queryBuilder
            : this.connection
                .createQueryBuilder(queryRunner)
                .select(relation.propertyName)
                .from(relation.type, relation.propertyName);
        const mainAlias = qb.expressionMap.mainAlias.name;
        const joinAlias = relation.junctionEntityMetadata.tableName;
        const joinColumnConditions = relation.inverseRelation.joinColumns.map((joinColumn) => {
            return `${joinAlias}.${joinColumn.propertyName} = ${mainAlias}.${joinColumn.referencedColumn.propertyName}`;
        });
        const inverseJoinColumnConditions = relation.inverseRelation.inverseJoinColumns.map((inverseJoinColumn) => {
            return `${joinAlias}.${inverseJoinColumn.propertyName} IN (:...${inverseJoinColumn.propertyName})`;
        });
        const parameters = relation.inverseRelation.inverseJoinColumns.reduce((parameters, joinColumn) => {
            parameters[joinColumn.propertyName] = entities.map((entity) => joinColumn.referencedColumn.getEntityValue(entity, true));
            return parameters;
        }, {});
        qb.innerJoin(joinAlias, joinAlias, [...joinColumnConditions, ...inverseJoinColumnConditions].join(" AND ")).setParameters(parameters);
        FindOptionsUtils_1.FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
        return qb.getMany();
    }
    /**
     * Wraps given entity and creates getters/setters for its given relation
     * to be able to lazily load data when accessing this relation.
     */
    enableLazyLoad(relation, entity, queryRunner) {
        const relationLoader = this;
        const dataIndex = "__" + relation.propertyName + "__"; // in what property of the entity loaded data will be stored
        const promiseIndex = "__promise_" + relation.propertyName + "__"; // in what property of the entity loading promise will be stored
        const resolveIndex = "__has_" + relation.propertyName + "__"; // indicates if relation data already was loaded or not, we need this flag if loaded data is empty
        const setData = (entity, value) => {
            entity[dataIndex] = value;
            entity[resolveIndex] = true;
            delete entity[promiseIndex];
            return value;
        };
        const setPromise = (entity, value) => {
            delete entity[resolveIndex];
            delete entity[dataIndex];
            entity[promiseIndex] = value;
            value.then(
            // ensure different value is not assigned yet
            (result) => entity[promiseIndex] === value
                ? setData(entity, result)
                : result);
            return value;
        };
        Object.defineProperty(entity, relation.propertyName, {
            get: function () {
                if (this[resolveIndex] === true ||
                    this[dataIndex] !== undefined)
                    // if related data already was loaded then simply return it
                    return Promise.resolve(this[dataIndex]);
                if (this[promiseIndex])
                    // if related data is loading then return a promise relationLoader loads it
                    return this[promiseIndex];
                // nothing is loaded yet, load relation data and save it in the model once they are loaded
                const loader = relationLoader
                    .load(relation, this, queryRunner)
                    .then((result) => relation.isOneToOne || relation.isManyToOne
                    ? result.length === 0
                        ? null
                        : result[0]
                    : result);
                return setPromise(this, loader);
            },
            set: function (value) {
                if (value instanceof Promise) {
                    // if set data is a promise then wait for its resolve and save in the object
                    setPromise(this, value);
                }
                else {
                    // if its direct data set (non promise, probably not safe-typed)
                    setData(this, value);
                }
            },
            configurable: true,
            enumerable: false,
        });
    }
}
exports.RelationLoader = RelationLoader;

//# sourceMappingURL=RelationLoader.js.map
