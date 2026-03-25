"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindOptionsUtils = void 0;
const error_1 = require("../error");
const DriverUtils_1 = require("../driver/DriverUtils");
const error_2 = require("../error");
/**
 * Utilities to work with FindOptions.
 */
class FindOptionsUtils {
    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------
    /**
     * Checks if given object is really instance of FindOneOptions interface.
     */
    static isFindOneOptions(obj) {
        const possibleOptions = obj;
        return (possibleOptions &&
            (Array.isArray(possibleOptions.select) ||
                Array.isArray(possibleOptions.relations) ||
                typeof possibleOptions.select === "object" ||
                typeof possibleOptions.relations === "object" ||
                typeof possibleOptions.where === "object" ||
                // typeof possibleOptions.where === "string" ||
                typeof possibleOptions.join === "object" ||
                typeof possibleOptions.order === "object" ||
                typeof possibleOptions.cache === "object" ||
                typeof possibleOptions.cache === "boolean" ||
                typeof possibleOptions.cache === "number" ||
                typeof possibleOptions.comment === "string" ||
                typeof possibleOptions.lock === "object" ||
                typeof possibleOptions.loadRelationIds === "object" ||
                typeof possibleOptions.loadRelationIds === "boolean" ||
                typeof possibleOptions.loadEagerRelations === "boolean" ||
                typeof possibleOptions.withDeleted === "boolean" ||
                typeof possibleOptions.relationLoadStrategy === "string" ||
                typeof possibleOptions.transaction === "boolean"));
    }
    /**
     * Checks if given object is really instance of FindManyOptions interface.
     */
    static isFindManyOptions(obj) {
        const possibleOptions = obj;
        return (possibleOptions &&
            (this.isFindOneOptions(possibleOptions) ||
                typeof possibleOptions.skip ===
                    "number" ||
                typeof possibleOptions.take ===
                    "number" ||
                typeof possibleOptions.skip ===
                    "string" ||
                typeof possibleOptions.take ===
                    "string"));
    }
    /**
     * Checks if given object is really instance of FindOptions interface.
     */
    static extractFindManyOptionsAlias(object) {
        if (this.isFindManyOptions(object) && object.join)
            return object.join.alias;
        return undefined;
    }
    /**
     * Applies give find many options to the given query builder.

    static applyFindManyOptionsOrConditionsToQueryBuilder<T>(qb: SelectQueryBuilder<T>, options: FindManyOptions<T>|Partial<T>|undefined): SelectQueryBuilder<T> {
        if (this.isFindManyOptions(options))
            return this.applyOptionsToQueryBuilder(qb, options);

        if (options)
            return qb.where(options);

        return qb;
    }*/
    /**
     * Applies give find options to the given query builder.

    static applyOptionsToQueryBuilder<T>(qb: SelectQueryBuilder<T>, options: FindOneOptions<T>|FindManyOptions<T>|undefined): SelectQueryBuilder<T> {

        // if options are not set then simply return query builder. This is made for simplicity of usage.
        if (!options || (!this.isFindOneOptions(options) && !this.isFindManyOptions(options)))
            return qb;

        if (options.transaction === true) {
            qb.expressionMap.useTransaction = true;
        }

        if (!qb.expressionMap.mainAlias || !qb.expressionMap.mainAlias.hasMetadata)
            return qb;

        const metadata = qb.expressionMap.mainAlias!.metadata;

        // apply all options from FindOptions
        if (options.comment) {
            qb.comment(options.comment);
        }

        if (options.withDeleted) {
            qb.withDeleted();
        }

        if (options.select) {
            qb.select([]);
            options.select.forEach(select => {
                if (!metadata.hasColumnWithPropertyPath(`${select}`))
                    throw new TypeORMError(`${select} column was not found in the ${metadata.name} entity.`);

                const columns = metadata.findColumnsWithPropertyPath(`${select}`);

                for (const column of columns) {
                    qb.addSelect(qb.alias + "." + column.propertyPath);
                }
            });
        }

        if (options.relations) {
            // Copy because `applyRelationsRecursively` modifies it
            const allRelations = [...options.relations];
            this.applyRelationsRecursively(qb, allRelations, qb.expressionMap.mainAlias!.name, qb.expressionMap.mainAlias!.metadata, "");
            // recursive removes found relations from allRelations array
            // if there are relations left in this array it means those relations were not found in the entity structure
            // so, we give an exception about not found relations
            if (allRelations.length > 0)
                throw new FindRelationsNotFoundError(allRelations);
        }

        if (options.join) {
            if (options.join.leftJoin)
                Object.keys(options.join.leftJoin).forEach(key => {
                    qb.leftJoin(options.join!.leftJoin![key], key);
                });

            if (options.join.innerJoin)
                Object.keys(options.join.innerJoin).forEach(key => {
                    qb.innerJoin(options.join!.innerJoin![key], key);
                });

            if (options.join.leftJoinAndSelect)
                Object.keys(options.join.leftJoinAndSelect).forEach(key => {
                    qb.leftJoinAndSelect(options.join!.leftJoinAndSelect![key], key);
                });

            if (options.join.innerJoinAndSelect)
                Object.keys(options.join.innerJoinAndSelect).forEach(key => {
                    qb.innerJoinAndSelect(options.join!.innerJoinAndSelect![key], key);
                });
        }

        if (options.cache) {
            if (options.cache instanceof Object) {
                const cache = options.cache as { id: any, milliseconds: number };
                qb.cache(cache.id, cache.milliseconds);
            } else {
                qb.cache(options.cache);
            }
        }

        if (options.lock) {
            if (options.lock.mode === "optimistic") {
                qb.setLock(options.lock.mode, options.lock.version);
            } else if (
                options.lock.mode === "pessimistic_read" ||
                options.lock.mode === "pessimistic_write" ||
                options.lock.mode === "dirty_read" ||
                options.lock.mode === "pessimistic_partial_write" ||
                options.lock.mode === "pessimistic_write_or_fail" ||
                options.lock.mode === "for_no_key_update" ||
                options.lock.mode === "for_key_share"
            ) {
                const tableNames = options.lock.tables ? options.lock.tables.map((table) => {
                    const tableAlias = qb.expressionMap.aliases.find((alias) => {
                        return alias.metadata.tableNameWithoutPrefix === table;
                    });
                    if (!tableAlias) {
                        throw new TypeORMError(`"${table}" is not part of this query`);
                    }
                    return qb.escape(tableAlias.name);
                }) : undefined;
                qb.setLock(options.lock.mode, undefined, tableNames);
            }
        }

        if (options.loadRelationIds === true) {
            qb.loadAllRelationIds();

        } else if (options.loadRelationIds instanceof Object) {
            qb.loadAllRelationIds(options.loadRelationIds as any);
        }

        if (options.where)
            qb.where(options.where);

        if ((options as FindManyOptions<T>).skip)
            qb.skip((options as FindManyOptions<T>).skip!);

        if ((options as FindManyOptions<T>).take)
            qb.take((options as FindManyOptions<T>).take!);

        if (options.order)
            Object.keys(options.order).forEach(key => {
                const order = ((options as FindOneOptions<T>).order as any)[key as any];

                if (!metadata.findColumnWithPropertyPath(key))
                    throw new Error(`${key} column was not found in the ${metadata.name} entity.`);

                switch (order) {
                    case 1:
                        qb.addOrderBy(qb.alias + "." + key, "ASC");
                        break;
                    case -1:
                        qb.addOrderBy(qb.alias + "." + key, "DESC");
                        break;
                    case "ASC":
                        qb.addOrderBy(qb.alias + "." + key, "ASC");
                        break;
                    case "DESC":
                        qb.addOrderBy(qb.alias + "." + key, "DESC");
                        break;
                }
            });

        return qb;
    }*/
    static applyOptionsToTreeQueryBuilder(qb, options) {
        if (options?.relations) {
            // Copy because `applyRelationsRecursively` modifies it
            const allRelations = [...options.relations];
            FindOptionsUtils.applyRelationsRecursively(qb, allRelations, qb.expressionMap.mainAlias.name, qb.expressionMap.mainAlias.metadata, "");
            // recursive removes found relations from allRelations array
            // if there are relations left in this array it means those relations were not found in the entity structure
            // so, we give an exception about not found relations
            if (allRelations.length > 0)
                throw new error_1.FindRelationsNotFoundError(allRelations);
        }
        return qb;
    }
    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------
    /**
     * Adds joins for all relations and sub-relations of the given relations provided in the find options.
     */
    static applyRelationsRecursively(qb, allRelations, alias, metadata, prefix) {
        // find all relations that match given prefix
        let matchedBaseRelations = [];
        if (prefix) {
            const regexp = new RegExp("^" + prefix.replace(".", "\\.") + "\\.");
            matchedBaseRelations = allRelations
                .filter((relation) => relation.match(regexp))
                .map((relation) => metadata.findRelationWithPropertyPath(relation.replace(regexp, "")))
                .filter((entity) => entity);
        }
        else {
            matchedBaseRelations = allRelations
                .map((relation) => metadata.findRelationWithPropertyPath(relation))
                .filter((entity) => entity);
        }
        // go through all matched relations and add join for them
        matchedBaseRelations.forEach((relation) => {
            // generate a relation alias
            let relationAlias = DriverUtils_1.DriverUtils.buildAlias(qb.connection.driver, { joiner: "__" }, alias, relation.propertyPath);
            // add a join for the found relation
            const selection = alias + "." + relation.propertyPath;
            if (qb.expressionMap.relationLoadStrategy === "query") {
                qb.concatRelationMetadata(relation);
            }
            else {
                qb.leftJoinAndSelect(selection, relationAlias);
            }
            // remove added relations from the allRelations array, this is needed to find all not found relations at the end
            allRelations.splice(allRelations.indexOf(prefix
                ? prefix + "." + relation.propertyPath
                : relation.propertyPath), 1);
            // try to find sub-relations
            let relationMetadata;
            let relationName;
            if (qb.expressionMap.relationLoadStrategy === "query") {
                relationMetadata = relation.inverseEntityMetadata;
                relationName = relationAlias;
            }
            else {
                const join = qb.expressionMap.joinAttributes.find((join) => join.entityOrProperty === selection);
                relationMetadata = join.metadata;
                relationName = join.alias.name;
            }
            if (!relationName || !relationMetadata) {
                throw new error_2.EntityPropertyNotFoundError(relation.propertyPath, metadata);
            }
            this.applyRelationsRecursively(qb, allRelations, relationName, relationMetadata, prefix
                ? prefix + "." + relation.propertyPath
                : relation.propertyPath);
            // join the eager relations of the found relation
            // Only supported for "join" relationLoadStrategy
            if (qb.expressionMap.relationLoadStrategy === "join") {
                const relMetadata = metadata.relations.find((metadata) => metadata.propertyName === relation.propertyPath);
                if (relMetadata) {
                    this.joinEagerRelations(qb, relationAlias, relMetadata.inverseEntityMetadata);
                }
            }
        });
    }
    static joinEagerRelations(qb, alias, metadata) {
        metadata.eagerRelations.forEach((relation) => {
            // generate a relation alias
            let relationAlias = DriverUtils_1.DriverUtils.buildAlias(qb.connection.driver, { joiner: "__" }, alias, relation.propertyName);
            // add a join for the relation
            // Checking whether the relation wasn't joined yet.
            let addJoin = true;
            // TODO: Review this validation
            for (const join of qb.expressionMap.joinAttributes) {
                if (join.condition !== undefined ||
                    join.mapToProperty !== undefined ||
                    join.isMappingMany !== undefined ||
                    join.direction !== "LEFT" ||
                    join.entityOrProperty !==
                        `${alias}.${relation.propertyPath}`) {
                    continue;
                }
                addJoin = false;
                relationAlias = join.alias.name;
                break;
            }
            const joinAlreadyAdded = Boolean(qb.expressionMap.joinAttributes.find((joinAttribute) => joinAttribute.alias.name === relationAlias));
            if (addJoin && !joinAlreadyAdded) {
                qb.leftJoin(alias + "." + relation.propertyPath, relationAlias);
            }
            // Checking whether the relation wasn't selected yet.
            // This check shall be after the join check to detect relationAlias.
            let addSelect = true;
            for (const select of qb.expressionMap.selects) {
                if (select.aliasName !== undefined ||
                    select.virtual !== undefined ||
                    select.selection !== relationAlias) {
                    continue;
                }
                addSelect = false;
                break;
            }
            if (addSelect) {
                qb.addSelect(relationAlias);
            }
            // (recursive) join the eager relations
            this.joinEagerRelations(qb, relationAlias, relation.inverseEntityMetadata);
        });
    }
}
exports.FindOptionsUtils = FindOptionsUtils;

//# sourceMappingURL=FindOptionsUtils.js.map
