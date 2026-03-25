import { FindManyOptions } from "./FindManyOptions";
import { FindOneOptions } from "./FindOneOptions";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { FindTreeOptions } from "./FindTreeOptions";
import { ObjectLiteral } from "../common/ObjectLiteral";
/**
 * Utilities to work with FindOptions.
 */
export declare class FindOptionsUtils {
    /**
     * Checks if given object is really instance of FindOneOptions interface.
     */
    static isFindOneOptions<Entity = any>(obj: any): obj is FindOneOptions<Entity>;
    /**
     * Checks if given object is really instance of FindManyOptions interface.
     */
    static isFindManyOptions<Entity = any>(obj: any): obj is FindManyOptions<Entity>;
    /**
     * Checks if given object is really instance of FindOptions interface.
     */
    static extractFindManyOptionsAlias(object: any): string | undefined;
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
    static applyOptionsToTreeQueryBuilder<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, options?: FindTreeOptions): SelectQueryBuilder<T>;
    /**
     * Adds joins for all relations and sub-relations of the given relations provided in the find options.
     */
    static applyRelationsRecursively(qb: SelectQueryBuilder<any>, allRelations: string[], alias: string, metadata: EntityMetadata, prefix: string): void;
    static joinEagerRelations(qb: SelectQueryBuilder<any>, alias: string, metadata: EntityMetadata): void;
}
