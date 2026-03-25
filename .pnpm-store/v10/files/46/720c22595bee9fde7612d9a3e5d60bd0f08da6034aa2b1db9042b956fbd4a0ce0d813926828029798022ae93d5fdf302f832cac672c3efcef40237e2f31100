"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectChangedColumnsComputer = void 0;
const DateUtils_1 = require("../util/DateUtils");
const OrmUtils_1 = require("../util/OrmUtils");
const ApplyValueTransformers_1 = require("../util/ApplyValueTransformers");
const ObjectUtils_1 = require("../util/ObjectUtils");
/**
 * Finds what columns are changed in the subject entities.
 */
class SubjectChangedColumnsComputer {
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Finds what columns are changed in the subject entities.
     */
    compute(subjects) {
        subjects.forEach((subject) => {
            this.computeDiffColumns(subject);
            this.computeDiffRelationalColumns(subjects, subject);
        });
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Differentiate columns from the updated entity and entity stored in the database.
     */
    computeDiffColumns(subject) {
        // if there is no persisted entity then nothing to compute changed in it
        if (!subject.entity)
            return;
        subject.metadata.columns.forEach((column) => {
            // ignore special columns
            if (column.isVirtual ||
                column.isDiscriminator // ||
            // column.isUpdateDate ||
            // column.isVersion ||
            // column.isCreateDate
            )
                return;
            const changeMap = subject.changeMaps.find((changeMap) => changeMap.column === column);
            if (changeMap) {
                subject.changeMaps.splice(subject.changeMaps.indexOf(changeMap), 1);
            }
            // get user provided value - column value from the user provided persisted entity
            const entityValue = column.getEntityValue(subject.entity);
            // we don't perform operation over undefined properties (but we DO need null properties!)
            if (entityValue === undefined)
                return;
            // if there is no database entity then all columns are treated as new, e.g. changed
            if (subject.databaseEntity) {
                // skip transform database value for json / jsonb for comparison later on
                const shouldTransformDatabaseEntity = column.type !== "json" && column.type !== "jsonb";
                // get database value of the column
                let databaseValue = column.getEntityValue(subject.databaseEntity, shouldTransformDatabaseEntity);
                // filter out "relational columns" only in the case if there is a relation object in entity
                if (column.relationMetadata) {
                    const value = column.relationMetadata.getEntityValue(subject.entity);
                    if (value !== null && value !== undefined)
                        return;
                }
                let normalizedValue = entityValue;
                // normalize special values to make proper comparision
                if (entityValue !== null) {
                    switch (column.type) {
                        case "date":
                            normalizedValue =
                                DateUtils_1.DateUtils.mixedDateToDateString(entityValue);
                            break;
                        case "time":
                        case "time with time zone":
                        case "time without time zone":
                        case "timetz":
                            normalizedValue =
                                DateUtils_1.DateUtils.mixedDateToTimeString(entityValue);
                            break;
                        case "datetime":
                        case Date:
                        case "timestamp":
                        case "timestamp without time zone":
                        case "timestamp with time zone":
                        case "timestamptz":
                            normalizedValue =
                                DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(entityValue);
                            databaseValue =
                                DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(databaseValue);
                            break;
                        case "json":
                        case "jsonb":
                            // JSON.stringify doesn't work because postgresql sorts jsonb before save.
                            // If you try to save json '[{"messages": "", "attribute Key": "", "level":""}] ' as jsonb,
                            // then postgresql will save it as '[{"level": "", "message":"", "attributeKey": ""}]'
                            if (OrmUtils_1.OrmUtils.deepCompare(entityValue, databaseValue))
                                return;
                            break;
                        case "simple-array":
                            normalizedValue =
                                DateUtils_1.DateUtils.simpleArrayToString(entityValue);
                            databaseValue =
                                DateUtils_1.DateUtils.simpleArrayToString(databaseValue);
                            break;
                        case "simple-enum":
                            normalizedValue =
                                DateUtils_1.DateUtils.simpleEnumToString(entityValue);
                            databaseValue =
                                DateUtils_1.DateUtils.simpleEnumToString(databaseValue);
                            break;
                        case "simple-json":
                            normalizedValue =
                                DateUtils_1.DateUtils.simpleJsonToString(entityValue);
                            databaseValue =
                                DateUtils_1.DateUtils.simpleJsonToString(databaseValue);
                            break;
                    }
                    if (column.transformer) {
                        normalizedValue = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(column.transformer, entityValue);
                    }
                }
                // if value is not changed - then do nothing
                if (Buffer.isBuffer(normalizedValue) &&
                    Buffer.isBuffer(databaseValue)) {
                    if (normalizedValue.equals(databaseValue)) {
                        return;
                    }
                }
                else {
                    if (normalizedValue === databaseValue)
                        return;
                }
            }
            if (!subject.diffColumns.includes(column))
                subject.diffColumns.push(column);
            subject.changeMaps.push({
                column: column,
                value: entityValue,
            });
        });
    }
    /**
     * Difference columns of the owning one-to-one and many-to-one columns.
     */
    computeDiffRelationalColumns(allSubjects, subject) {
        // if there is no persisted entity then nothing to compute changed in it
        if (!subject.entity)
            return;
        subject.metadata.relationsWithJoinColumns.forEach((relation) => {
            // get the related entity from the persisted entity
            let relatedEntity = relation.getEntityValue(subject.entity);
            // we don't perform operation over undefined properties (but we DO need null properties!)
            if (relatedEntity === undefined)
                return;
            // if there is no database entity then all relational columns are treated as new, e.g. changed
            if (subject.databaseEntity) {
                // here we cover two scenarios:
                // 1. related entity can be another entity which is natural way
                // 2. related entity can be just an entity id
                // if relation entity is just a relation id set (for example post.tag = 1)
                // then we create an id map from it to make a proper comparision
                let relatedEntityRelationIdMap = relatedEntity;
                if (relatedEntityRelationIdMap !== null &&
                    ObjectUtils_1.ObjectUtils.isObject(relatedEntityRelationIdMap))
                    relatedEntityRelationIdMap = relation.getRelationIdMap(relatedEntityRelationIdMap);
                // get database related entity. Since loadRelationIds are used on databaseEntity
                // related entity will contain only its relation ids
                const databaseRelatedEntityRelationIdMap = relation.getEntityValue(subject.databaseEntity);
                // if relation ids are equal then we don't need to update anything
                const areRelatedIdsEqual = OrmUtils_1.OrmUtils.compareIds(relatedEntityRelationIdMap, databaseRelatedEntityRelationIdMap);
                if (areRelatedIdsEqual) {
                    return;
                }
                else {
                    subject.diffRelations.push(relation);
                }
            }
            // if there is an inserted subject for the related entity of the persisted entity then use it as related entity
            // this code is used for related entities without ids to be properly inserted (and then updated if needed)
            const valueSubject = allSubjects.find((subject) => subject.mustBeInserted && subject.entity === relatedEntity);
            if (valueSubject)
                relatedEntity = valueSubject;
            // find if there is already a relation to be changed
            const changeMap = subject.changeMaps.find((changeMap) => changeMap.relation === relation);
            if (changeMap) {
                // and update its value if it was found
                changeMap.value = relatedEntity;
            }
            else {
                // if it wasn't found add a new relation for change
                subject.changeMaps.push({
                    relation: relation,
                    value: relatedEntity,
                });
            }
        });
    }
}
exports.SubjectChangedColumnsComputer = SubjectChangedColumnsComputer;

//# sourceMappingURL=SubjectChangedColumnsComputer.js.map
