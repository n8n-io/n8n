"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationIdLoader = void 0;
const DriverUtils_1 = require("../../driver/DriverUtils");
const TypeORMError_1 = require("../../error/TypeORMError");
const OrmUtils_1 = require("../../util/OrmUtils");
class RelationIdLoader {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection, queryRunner, relationIdAttributes) {
        this.connection = connection;
        this.queryRunner = queryRunner;
        this.relationIdAttributes = relationIdAttributes;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    async load(rawEntities) {
        const promises = this.relationIdAttributes.map(async (relationIdAttr) => {
            if (relationIdAttr.relation.isManyToOne ||
                relationIdAttr.relation.isOneToOneOwner) {
                // example: Post and Tag
                // loadRelationIdAndMap("post.tagId", "post.tag")
                // we expect it to load id of tag
                if (relationIdAttr.queryBuilderFactory)
                    throw new TypeORMError_1.TypeORMError("Additional condition can not be used with ManyToOne or OneToOne owner relations.");
                const duplicates = {};
                const results = rawEntities
                    .map((rawEntity) => {
                    const result = {};
                    const duplicateParts = [];
                    relationIdAttr.relation.joinColumns.forEach((joinColumn) => {
                        result[joinColumn.databaseName] =
                            this.connection.driver.prepareHydratedValue(rawEntity[DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, relationIdAttr.parentAlias, joinColumn.databaseName)], joinColumn.referencedColumn);
                        const duplicatePart = `${joinColumn.databaseName}:${result[joinColumn.databaseName]}`;
                        if (duplicateParts.indexOf(duplicatePart) === -1) {
                            duplicateParts.push(duplicatePart);
                        }
                    });
                    relationIdAttr.relation.entityMetadata.primaryColumns.forEach((primaryColumn) => {
                        result[primaryColumn.databaseName] =
                            this.connection.driver.prepareHydratedValue(rawEntity[DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, relationIdAttr.parentAlias, primaryColumn.databaseName)], primaryColumn);
                        const duplicatePart = `${primaryColumn.databaseName}:${result[primaryColumn.databaseName]}`;
                        if (duplicateParts.indexOf(duplicatePart) === -1) {
                            duplicateParts.push(duplicatePart);
                        }
                    });
                    duplicateParts.sort();
                    const duplicate = duplicateParts.join("::");
                    if (duplicates[duplicate]) {
                        return null;
                    }
                    duplicates[duplicate] = true;
                    return result;
                })
                    .filter((v) => v);
                return {
                    relationIdAttribute: relationIdAttr,
                    results: results,
                };
            }
            else if (relationIdAttr.relation.isOneToMany ||
                relationIdAttr.relation.isOneToOneNotOwner) {
                // example: Post and Category
                // loadRelationIdAndMap("post.categoryIds", "post.categories")
                // we expect it to load array of category ids
                const relation = relationIdAttr.relation; // "post.categories"
                const joinColumns = relation.isOwning
                    ? relation.joinColumns
                    : relation.inverseRelation.joinColumns;
                const table = relation.inverseEntityMetadata.target; // category
                const tableName = relation.inverseEntityMetadata.tableName; // category
                const tableAlias = relationIdAttr.alias || tableName; // if condition (custom query builder factory) is set then relationIdAttr.alias defined
                const duplicates = {};
                const parameters = {};
                const condition = rawEntities
                    .map((rawEntity, index) => {
                    const duplicateParts = [];
                    const parameterParts = {};
                    const queryPart = joinColumns
                        .map((joinColumn) => {
                        const parameterName = joinColumn.databaseName + index;
                        const parameterValue = rawEntity[DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, relationIdAttr.parentAlias, joinColumn.referencedColumn
                            .databaseName)];
                        const duplicatePart = `${tableAlias}:${joinColumn.propertyPath}:${parameterValue}`;
                        if (duplicateParts.indexOf(duplicatePart) !== -1) {
                            return "";
                        }
                        duplicateParts.push(duplicatePart);
                        parameterParts[parameterName] =
                            parameterValue;
                        return (tableAlias +
                            "." +
                            joinColumn.propertyPath +
                            " = :" +
                            parameterName);
                    })
                        .filter((v) => v)
                        .join(" AND ");
                    duplicateParts.sort();
                    const duplicate = duplicateParts.join("::");
                    if (duplicates[duplicate]) {
                        return "";
                    }
                    duplicates[duplicate] = true;
                    Object.assign(parameters, parameterParts);
                    return queryPart;
                })
                    .filter((v) => v)
                    .map((condition) => "(" + condition + ")")
                    .join(" OR ");
                // ensure we won't perform redundant queries for joined data which was not found in selection
                // example: if post.category was not found in db then no need to execute query for category.imageIds
                if (!condition)
                    return {
                        relationIdAttribute: relationIdAttr,
                        results: [],
                    };
                // generate query:
                // SELECT category.id, category.postId FROM category category ON category.postId = :postId
                const qb = this.connection.createQueryBuilder(this.queryRunner);
                const columns = OrmUtils_1.OrmUtils.uniq([
                    ...joinColumns,
                    ...relation.inverseRelation.entityMetadata
                        .primaryColumns,
                ], (column) => column.propertyPath);
                columns.forEach((joinColumn) => {
                    qb.addSelect(tableAlias + "." + joinColumn.propertyPath, joinColumn.databaseName);
                });
                qb.from(table, tableAlias)
                    .where("(" + condition + ")") // need brackets because if we have additional condition and no brackets, it looks like (a = 1) OR (a = 2) AND b = 1, that is incorrect
                    .setParameters(parameters);
                // apply condition (custom query builder factory)
                if (relationIdAttr.queryBuilderFactory)
                    relationIdAttr.queryBuilderFactory(qb);
                const results = await qb.getRawMany();
                results.forEach((result) => {
                    joinColumns.forEach((column) => {
                        result[column.databaseName] =
                            this.connection.driver.prepareHydratedValue(result[column.databaseName], column.referencedColumn);
                    });
                    relation.inverseRelation.entityMetadata.primaryColumns.forEach((column) => {
                        result[column.databaseName] =
                            this.connection.driver.prepareHydratedValue(result[column.databaseName], column);
                    });
                });
                return {
                    relationIdAttribute: relationIdAttr,
                    results,
                };
            }
            else {
                // many-to-many
                // example: Post and Category
                // owner side: loadRelationIdAndMap("post.categoryIds", "post.categories")
                // inverse side: loadRelationIdAndMap("category.postIds", "category.posts")
                // we expect it to load array of post ids
                const relation = relationIdAttr.relation;
                const joinColumns = relation.isOwning
                    ? relation.joinColumns
                    : relation.inverseRelation.inverseJoinColumns;
                const inverseJoinColumns = relation.isOwning
                    ? relation.inverseJoinColumns
                    : relation.inverseRelation.joinColumns;
                const junctionAlias = relationIdAttr.junctionAlias;
                const inverseSideTableName = relationIdAttr.joinInverseSideMetadata.tableName;
                const inverseSideTableAlias = relationIdAttr.alias || inverseSideTableName;
                const junctionTableName = relation.isOwning
                    ? relation.junctionEntityMetadata.tableName
                    : relation.inverseRelation.junctionEntityMetadata
                        .tableName;
                const mappedColumns = rawEntities.map((rawEntity) => {
                    return joinColumns.reduce((map, joinColumn) => {
                        map[joinColumn.propertyPath] =
                            rawEntity[DriverUtils_1.DriverUtils.buildAlias(this.connection.driver, undefined, relationIdAttr.parentAlias, joinColumn.referencedColumn
                                .databaseName)];
                        return map;
                    }, {});
                });
                // ensure we won't perform redundant queries for joined data which was not found in selection
                // example: if post.category was not found in db then no need to execute query for category.imageIds
                if (mappedColumns.length === 0)
                    return {
                        relationIdAttribute: relationIdAttr,
                        results: [],
                    };
                const parameters = {};
                const duplicates = {};
                const joinColumnConditions = mappedColumns
                    .map((mappedColumn, index) => {
                    const duplicateParts = [];
                    const parameterParts = {};
                    const queryPart = Object.keys(mappedColumn)
                        .map((key) => {
                        const parameterName = key + index;
                        const parameterValue = mappedColumn[key];
                        const duplicatePart = `${junctionAlias}:${key}:${parameterValue}`;
                        if (duplicateParts.indexOf(duplicatePart) !== -1) {
                            return "";
                        }
                        duplicateParts.push(duplicatePart);
                        parameterParts[parameterName] =
                            parameterValue;
                        return (junctionAlias +
                            "." +
                            key +
                            " = :" +
                            parameterName);
                    })
                        .filter((s) => s)
                        .join(" AND ");
                    duplicateParts.sort();
                    const duplicate = duplicateParts.join("::");
                    if (duplicates[duplicate]) {
                        return "";
                    }
                    duplicates[duplicate] = true;
                    Object.assign(parameters, parameterParts);
                    return queryPart;
                })
                    .filter((s) => s);
                const inverseJoinColumnCondition = inverseJoinColumns
                    .map((joinColumn) => {
                    return (junctionAlias +
                        "." +
                        joinColumn.propertyPath +
                        " = " +
                        inverseSideTableAlias +
                        "." +
                        joinColumn.referencedColumn.propertyPath);
                })
                    .join(" AND ");
                const condition = joinColumnConditions
                    .map((condition) => {
                    return ("(" +
                        condition +
                        " AND " +
                        inverseJoinColumnCondition +
                        ")");
                })
                    .join(" OR ");
                const qb = this.connection.createQueryBuilder(this.queryRunner);
                inverseJoinColumns.forEach((joinColumn) => {
                    qb.addSelect(junctionAlias + "." + joinColumn.propertyPath, joinColumn.databaseName).addOrderBy(junctionAlias + "." + joinColumn.propertyPath);
                });
                joinColumns.forEach((joinColumn) => {
                    qb.addSelect(junctionAlias + "." + joinColumn.propertyPath, joinColumn.databaseName).addOrderBy(junctionAlias + "." + joinColumn.propertyPath);
                });
                qb.from(inverseSideTableName, inverseSideTableAlias)
                    .innerJoin(junctionTableName, junctionAlias, condition)
                    .setParameters(parameters);
                // apply condition (custom query builder factory)
                if (relationIdAttr.queryBuilderFactory)
                    relationIdAttr.queryBuilderFactory(qb);
                const results = await qb.getRawMany();
                results.forEach((result) => {
                    ;
                    [...joinColumns, ...inverseJoinColumns].forEach((column) => {
                        result[column.databaseName] =
                            this.connection.driver.prepareHydratedValue(result[column.databaseName], column.referencedColumn);
                    });
                });
                return {
                    relationIdAttribute: relationIdAttr,
                    results,
                };
            }
        });
        return Promise.all(promises);
    }
}
exports.RelationIdLoader = RelationIdLoader;

//# sourceMappingURL=RelationIdLoader.js.map
