"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawSqlResultsToEntityTransformer = void 0;
const OrmUtils_1 = require("../../util/OrmUtils");
const DriverUtils_1 = require("../../driver/DriverUtils");
const ObjectUtils_1 = require("../../util/ObjectUtils");
/**
 * Transforms raw sql results returned from the database into entity object.
 * Entity is constructed based on its entity metadata.
 */
class RawSqlResultsToEntityTransformer {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(expressionMap, driver, rawRelationIdResults, rawRelationCountResults, queryRunner) {
        this.expressionMap = expressionMap;
        this.driver = driver;
        this.rawRelationIdResults = rawRelationIdResults;
        this.rawRelationCountResults = rawRelationCountResults;
        this.queryRunner = queryRunner;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Since db returns a duplicated rows of the data where accuracies of the same object can be duplicated
     * we need to group our result and we must have some unique id (primary key in our case)
     */
    transform(rawResults, alias) {
        const group = this.group(rawResults, alias);
        const entities = [];
        group.forEach((results) => {
            const entity = this.transformRawResultsGroup(results, alias);
            if (entity !== undefined &&
                !Object.values(entity).every((value) => value === null))
                entities.push(entity);
        });
        return entities;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Groups given raw results by ids of given alias.
     */
    group(rawResults, alias) {
        const map = new Map();
        const keys = [];
        if (alias.metadata.tableType === "view") {
            keys.push(...alias.metadata.columns.map((column) => DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, alias.name, column.databaseName)));
        }
        else {
            keys.push(...alias.metadata.primaryColumns.map((column) => DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, alias.name, column.databaseName)));
        }
        rawResults.forEach((rawResult) => {
            const id = keys
                .map((key) => {
                const keyValue = rawResult[key];
                if (Buffer.isBuffer(keyValue)) {
                    return keyValue.toString("hex");
                }
                if (ObjectUtils_1.ObjectUtils.isObject(keyValue)) {
                    return JSON.stringify(keyValue);
                }
                return keyValue;
            })
                .join("_"); // todo: check partial
            const items = map.get(id);
            if (!items) {
                map.set(id, [rawResult]);
            }
            else {
                items.push(rawResult);
            }
        });
        return map;
    }
    /**
     * Transforms set of data results into single entity.
     */
    transformRawResultsGroup(rawResults, alias) {
        // let hasColumns = false; // , hasEmbeddedColumns = false, hasParentColumns = false, hasParentEmbeddedColumns = false;
        let metadata = alias.metadata;
        if (metadata.discriminatorColumn) {
            const discriminatorValues = rawResults.map((result) => result[DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, alias.name, alias.metadata.discriminatorColumn.databaseName)]);
            const discriminatorMetadata = metadata.childEntityMetadatas.find((childEntityMetadata) => {
                return (typeof discriminatorValues.find((value) => value ===
                    childEntityMetadata.discriminatorValue) !== "undefined");
            });
            if (discriminatorMetadata)
                metadata = discriminatorMetadata;
        }
        let entity = metadata.create(this.queryRunner, {
            fromDeserializer: true,
            pojo: this.expressionMap.options.indexOf("create-pojo") !== -1,
        });
        // get value from columns selections and put them into newly created entity
        const hasColumns = this.transformColumns(rawResults, alias, entity, metadata);
        const hasRelations = this.transformJoins(rawResults, entity, alias, metadata);
        const hasRelationIds = this.transformRelationIds(rawResults, alias, entity, metadata);
        const hasRelationCounts = this.transformRelationCounts(rawResults, alias, entity);
        // if we have at least one selected column then return this entity
        // since entity must have at least primary columns to be really selected and transformed into entity
        if (hasColumns)
            return entity;
        // if we don't have any selected column we should not return entity,
        // except for the case when entity only contain a primary column as a relation to another entity
        // in this case its absolutely possible our entity to not have any columns except a single relation
        const hasOnlyVirtualPrimaryColumns = metadata.primaryColumns.filter((column) => column.isVirtual === false).length === 0; // todo: create metadata.hasOnlyVirtualPrimaryColumns
        if (hasOnlyVirtualPrimaryColumns &&
            (hasRelations || hasRelationIds || hasRelationCounts))
            return entity;
        return undefined;
    }
    // get value from columns selections and put them into object
    transformColumns(rawResults, alias, entity, metadata) {
        let hasData = false;
        metadata.columns.forEach((column) => {
            // if table inheritance is used make sure this column is not child's column
            if (metadata.childEntityMetadatas.length > 0 &&
                metadata.childEntityMetadatas.findIndex((childMetadata) => childMetadata.target === column.target) !== -1)
                return;
            const value = rawResults[0][DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, alias.name, column.databaseName)];
            if (value === undefined || column.isVirtual)
                return;
            // if user does not selected the whole entity or he used partial selection and does not select this particular column
            // then we don't add this column and its value into the entity
            if (!this.expressionMap.selects.find((select) => select.selection === alias.name ||
                select.selection ===
                    alias.name + "." + column.propertyPath))
                return;
            column.setEntityValue(entity, this.driver.prepareHydratedValue(value, column));
            if (value !== null)
                // we don't mark it as has data because if we will have all nulls in our object - we don't need such object
                hasData = true;
        });
        return hasData;
    }
    /**
     * Transforms joined entities in the given raw results by a given alias and stores to the given (parent) entity
     */
    transformJoins(rawResults, entity, alias, metadata) {
        let hasData = false;
        // let discriminatorValue: string = "";
        // if (metadata.discriminatorColumn)
        //     discriminatorValue = rawResults[0][DriverUtils.buildAlias(this.connection.driver, alias.name, alias.metadata.discriminatorColumn!.databaseName)];
        this.expressionMap.joinAttributes.forEach((join) => {
            // todo: we have problem here - when inner joins are used without selects it still create empty array
            // skip joins without metadata
            if (!join.metadata)
                return;
            // if simple left or inner join was performed without selection then we don't need to do anything
            if (!join.isSelected)
                return;
            // this check need to avoid setting properties than not belong to entity when single table inheritance used. (todo: check if we still need it)
            // const metadata = metadata.childEntityMetadatas.find(childEntityMetadata => discriminatorValue === childEntityMetadata.discriminatorValue);
            if (join.relation &&
                !metadata.relations.find((relation) => relation === join.relation))
                return;
            // some checks to make sure this join is for current alias
            if (join.mapToProperty) {
                if (join.mapToPropertyParentAlias !== alias.name)
                    return;
            }
            else {
                if (!join.relation ||
                    join.parentAlias !== alias.name ||
                    join.relationPropertyPath !== join.relation.propertyPath)
                    return;
            }
            // transform joined data into entities
            let result = this.transform(rawResults, join.alias);
            result = !join.isMany ? result[0] : result;
            result = !join.isMany && result === undefined ? null : result; // this is needed to make relations to return null when its joined but nothing was found in the database
            if (result === undefined)
                // if nothing was joined then simply return
                return;
            // if join was mapped to some property then save result to that property
            if (join.mapToPropertyPropertyName) {
                entity[join.mapToPropertyPropertyName] = result; // todo: fix embeds
            }
            else {
                // otherwise set to relation
                join.relation.setEntityValue(entity, result);
            }
            hasData = true;
        });
        return hasData;
    }
    transformRelationIds(rawSqlResults, alias, entity, metadata) {
        let hasData = false;
        this.rawRelationIdResults.forEach((rawRelationIdResult, index) => {
            if (rawRelationIdResult.relationIdAttribute.parentAlias !==
                alias.name)
                return;
            const relation = rawRelationIdResult.relationIdAttribute.relation;
            const valueMap = this.createValueMapFromJoinColumns(relation, rawRelationIdResult.relationIdAttribute.parentAlias, rawSqlResults);
            if (valueMap === undefined || valueMap === null) {
                return;
            }
            // prepare common data for this call
            this.prepareDataForTransformRelationIds();
            // Extract idMaps from prepared data by hash
            const hash = this.hashEntityIds(relation, valueMap);
            const idMaps = this.relationIdMaps[index][hash] || [];
            // Map data to properties
            const properties = rawRelationIdResult.relationIdAttribute.mapToPropertyPropertyPath.split(".");
            const mapToProperty = (properties, map, value) => {
                const property = properties.shift();
                if (property && properties.length === 0) {
                    map[property] = value;
                    return map;
                }
                if (property && properties.length > 0) {
                    mapToProperty(properties, map[property], value);
                }
                else {
                    return map;
                }
            };
            if (relation.isOneToOne || relation.isManyToOne) {
                if (idMaps[0] !== undefined) {
                    mapToProperty(properties, entity, idMaps[0]);
                    hasData = true;
                }
            }
            else {
                mapToProperty(properties, entity, idMaps);
                hasData = hasData || idMaps.length > 0;
            }
        });
        return hasData;
    }
    transformRelationCounts(rawSqlResults, alias, entity) {
        let hasData = false;
        this.rawRelationCountResults
            .filter((rawRelationCountResult) => rawRelationCountResult.relationCountAttribute
            .parentAlias === alias.name)
            .forEach((rawRelationCountResult) => {
            const relation = rawRelationCountResult.relationCountAttribute.relation;
            let referenceColumnName;
            if (relation.isOneToMany) {
                referenceColumnName =
                    relation.inverseRelation.joinColumns[0]
                        .referencedColumn.databaseName; // todo: fix joinColumns[0]
            }
            else {
                referenceColumnName = relation.isOwning
                    ? relation.joinColumns[0].referencedColumn.databaseName
                    : relation.inverseRelation.joinColumns[0]
                        .referencedColumn.databaseName;
            }
            const referenceColumnValue = rawSqlResults[0][DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, alias.name, referenceColumnName)]; // we use zero index since its grouped data // todo: selection with alias for entity columns wont work
            if (referenceColumnValue !== undefined &&
                referenceColumnValue !== null) {
                entity[rawRelationCountResult.relationCountAttribute.mapToPropertyPropertyName] = 0;
                rawRelationCountResult.results
                    .filter((result) => result["parentId"] === referenceColumnValue)
                    .forEach((result) => {
                    entity[rawRelationCountResult.relationCountAttribute.mapToPropertyPropertyName] = parseInt(result["cnt"]);
                    hasData = true;
                });
            }
        });
        return hasData;
    }
    createValueMapFromJoinColumns(relation, parentAlias, rawSqlResults) {
        let columns;
        if (relation.isManyToOne || relation.isOneToOneOwner) {
            columns = relation.entityMetadata.primaryColumns.map((joinColumn) => joinColumn);
        }
        else if (relation.isOneToMany || relation.isOneToOneNotOwner) {
            columns = relation.inverseRelation.joinColumns.map((joinColumn) => joinColumn);
        }
        else {
            if (relation.isOwning) {
                columns = relation.joinColumns.map((joinColumn) => joinColumn);
            }
            else {
                columns = relation.inverseRelation.inverseJoinColumns.map((joinColumn) => joinColumn);
            }
        }
        return columns.reduce((valueMap, column) => {
            rawSqlResults.forEach((rawSqlResult) => {
                if (relation.isManyToOne || relation.isOneToOneOwner) {
                    valueMap[column.databaseName] =
                        this.driver.prepareHydratedValue(rawSqlResult[DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, parentAlias, column.databaseName)], column);
                }
                else {
                    valueMap[column.databaseName] =
                        this.driver.prepareHydratedValue(rawSqlResult[DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, parentAlias, column.referencedColumn.databaseName)], column.referencedColumn);
                }
            });
            return valueMap;
        }, {});
    }
    extractEntityPrimaryIds(relation, relationIdRawResult) {
        let columns;
        if (relation.isManyToOne || relation.isOneToOneOwner) {
            columns = relation.entityMetadata.primaryColumns.map((joinColumn) => joinColumn);
        }
        else if (relation.isOneToMany || relation.isOneToOneNotOwner) {
            columns = relation.inverseRelation.joinColumns.map((joinColumn) => joinColumn);
        }
        else {
            if (relation.isOwning) {
                columns = relation.joinColumns.map((joinColumn) => joinColumn);
            }
            else {
                columns = relation.inverseRelation.inverseJoinColumns.map((joinColumn) => joinColumn);
            }
        }
        return columns.reduce((data, column) => {
            data[column.databaseName] = relationIdRawResult[column.databaseName];
            return data;
        }, {});
    }
    /*private removeVirtualColumns(entity: ObjectLiteral, alias: Alias) {
        const virtualColumns = this.expressionMap.selects
            .filter(select => select.virtual)
            .map(select => select.selection.replace(alias.name + ".", ""));

        virtualColumns.forEach(virtualColumn => delete entity[virtualColumn]);
    }*/
    /** Prepare data to run #transformRelationIds, as a lot of result independent data is needed in every call */
    prepareDataForTransformRelationIds() {
        // Return early if the relationIdMaps were already calculated
        if (this.relationIdMaps) {
            return;
        }
        // Ensure this prepare function is only called once
        this.relationIdMaps = this.rawRelationIdResults.map((rawRelationIdResult) => {
            const relation = rawRelationIdResult.relationIdAttribute.relation;
            // Calculate column metadata
            let columns;
            if (relation.isManyToOne || relation.isOneToOneOwner) {
                columns = relation.joinColumns;
            }
            else if (relation.isOneToMany ||
                relation.isOneToOneNotOwner) {
                columns = relation.inverseEntityMetadata.primaryColumns;
            }
            else {
                // ManyToMany
                if (relation.isOwning) {
                    columns = relation.inverseJoinColumns;
                }
                else {
                    columns = relation.inverseRelation.joinColumns;
                }
            }
            // Calculate the idMaps for the rawRelationIdResult
            return rawRelationIdResult.results.reduce((agg, result) => {
                let idMap = columns.reduce((idMap, column) => {
                    let value = result[column.databaseName];
                    if (relation.isOneToMany ||
                        relation.isOneToOneNotOwner) {
                        if (column.isVirtual &&
                            column.referencedColumn &&
                            column.referencedColumn.propertyName !==
                                column.propertyName) {
                            // if column is a relation
                            value =
                                column.referencedColumn.createValueMap(value);
                        }
                        return OrmUtils_1.OrmUtils.mergeDeep(idMap, column.createValueMap(value));
                    }
                    if (!column.isPrimary &&
                        column.referencedColumn.referencedColumn) {
                        // if column is a relation
                        value =
                            column.referencedColumn.referencedColumn.createValueMap(value);
                    }
                    return OrmUtils_1.OrmUtils.mergeDeep(idMap, column.referencedColumn.createValueMap(value));
                }, {});
                if (columns.length === 1 &&
                    !rawRelationIdResult.relationIdAttribute.disableMixedMap) {
                    if (relation.isOneToMany ||
                        relation.isOneToOneNotOwner) {
                        idMap = columns[0].getEntityValue(idMap);
                    }
                    else {
                        idMap =
                            columns[0].referencedColumn.getEntityValue(idMap);
                    }
                }
                // If an idMap is found, set it in the aggregator under the correct hash
                if (idMap !== undefined) {
                    const hash = this.hashEntityIds(relation, result);
                    if (agg[hash]) {
                        agg[hash].push(idMap);
                    }
                    else {
                        agg[hash] = [idMap];
                    }
                }
                return agg;
            }, {});
        });
    }
    /**
     * Use a simple JSON.stringify to create a simple hash of the primary ids of an entity.
     * As this.extractEntityPrimaryIds always creates the primary id object in the same order, if the same relation is
     * given, a simple JSON.stringify should be enough to get a unique hash per entity!
     */
    hashEntityIds(relation, data) {
        const entityPrimaryIds = this.extractEntityPrimaryIds(relation, data);
        return JSON.stringify(entityPrimaryIds);
    }
}
exports.RawSqlResultsToEntityTransformer = RawSqlResultsToEntityTransformer;

//# sourceMappingURL=RawSqlResultsToEntityTransformer.js.map
