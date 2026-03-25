"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationRemover = void 0;
const ObjectUtils_1 = require("../util/ObjectUtils");
/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
class RelationRemover {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(queryBuilder, expressionMap) {
        this.queryBuilder = queryBuilder;
        this.expressionMap = expressionMap;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs remove operation on a relation.
     */
    async remove(value) {
        const relation = this.expressionMap.relationMetadata;
        if (relation.isOneToMany) {
            // if (this.expressionMap.of instanceof Array)
            //     throw new TypeORMError(`You cannot update relations of multiple entities with the same related object. Provide a single entity into .of method.`);
            // DELETE FROM post WHERE post.categoryId = of AND post.id = id
            const ofs = Array.isArray(this.expressionMap.of)
                ? this.expressionMap.of
                : [this.expressionMap.of];
            const values = Array.isArray(value) ? value : [value];
            const updateSet = {};
            relation.inverseRelation.joinColumns.forEach((column) => {
                updateSet[column.propertyName] = null;
            });
            const parameters = {};
            const conditions = [];
            ofs.forEach((of, ofIndex) => {
                conditions.push(...values.map((value, valueIndex) => {
                    return [
                        ...relation.inverseRelation.joinColumns.map((column, columnIndex) => {
                            const parameterName = "joinColumn_" +
                                ofIndex +
                                "_" +
                                valueIndex +
                                "_" +
                                columnIndex;
                            parameters[parameterName] =
                                ObjectUtils_1.ObjectUtils.isObject(of)
                                    ? column.referencedColumn.getEntityValue(of)
                                    : of;
                            return `${column.propertyPath} = :${parameterName}`;
                        }),
                        ...relation.inverseRelation.entityMetadata.primaryColumns.map((column, columnIndex) => {
                            const parameterName = "primaryColumn_" +
                                valueIndex +
                                "_" +
                                valueIndex +
                                "_" +
                                columnIndex;
                            parameters[parameterName] =
                                ObjectUtils_1.ObjectUtils.isObject(value)
                                    ? column.getEntityValue(value)
                                    : value;
                            return `${column.propertyPath} = :${parameterName}`;
                        }),
                    ].join(" AND ");
                }));
            });
            const condition = conditions
                .map((str) => "(" + str + ")")
                .join(" OR ");
            if (!condition)
                return;
            await this.queryBuilder
                .createQueryBuilder()
                .update(relation.inverseEntityMetadata.target)
                .set(updateSet)
                .where(condition)
                .setParameters(parameters)
                .execute();
        }
        else {
            // many to many
            const junctionMetadata = relation.junctionEntityMetadata;
            const ofs = Array.isArray(this.expressionMap.of)
                ? this.expressionMap.of
                : [this.expressionMap.of];
            const values = Array.isArray(value) ? value : [value];
            const firstColumnValues = relation.isManyToManyOwner ? ofs : values;
            const secondColumnValues = relation.isManyToManyOwner ? values : ofs;
            const parameters = {};
            const conditions = [];
            firstColumnValues.forEach((firstColumnVal, firstColumnValIndex) => {
                conditions.push(...secondColumnValues.map((secondColumnVal, secondColumnValIndex) => {
                    return [
                        ...junctionMetadata.ownerColumns.map((column, columnIndex) => {
                            const parameterName = "firstValue_" +
                                firstColumnValIndex +
                                "_" +
                                secondColumnValIndex +
                                "_" +
                                columnIndex;
                            parameters[parameterName] =
                                ObjectUtils_1.ObjectUtils.isObject(firstColumnVal)
                                    ? column.referencedColumn.getEntityValue(firstColumnVal)
                                    : firstColumnVal;
                            return `${column.databaseName} = :${parameterName}`;
                        }),
                        ...junctionMetadata.inverseColumns.map((column, columnIndex) => {
                            const parameterName = "secondValue_" +
                                firstColumnValIndex +
                                "_" +
                                secondColumnValIndex +
                                "_" +
                                columnIndex;
                            parameters[parameterName] =
                                ObjectUtils_1.ObjectUtils.isObject(secondColumnVal)
                                    ? column.referencedColumn.getEntityValue(secondColumnVal)
                                    : secondColumnVal;
                            return `${column.databaseName} = :${parameterName}`;
                        }),
                    ].join(" AND ");
                }));
            });
            const condition = conditions
                .map((str) => "(" + str + ")")
                .join(" OR ");
            await this.queryBuilder
                .createQueryBuilder()
                .delete()
                .from(junctionMetadata.tableName)
                .where(condition)
                .setParameters(parameters)
                .execute();
        }
    }
}
exports.RelationRemover = RelationRemover;

//# sourceMappingURL=RelationRemover.js.map
