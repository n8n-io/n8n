import { JoinOptions } from "./JoinOptions";
import { FindOptionsWhere } from "./FindOptionsWhere";
import { FindOptionsSelect, FindOptionsSelectByString } from "./FindOptionsSelect";
import { FindOptionsRelationByString, FindOptionsRelations } from "./FindOptionsRelations";
import { FindOptionsOrder } from "./FindOptionsOrder";
/**
 * Defines a special criteria to find specific entity.
 */
export interface FindOneOptions<Entity = any> {
    /**
     * Adds a comment with the supplied string in the generated query.  This is
     * helpful for debugging purposes, such as finding a specific query in the
     * database server's logs, or for categorization using an APM product.
     */
    comment?: string;
    /**
     * Specifies what columns should be retrieved.
     */
    select?: FindOptionsSelect<Entity> | FindOptionsSelectByString<Entity>;
    /**
     * Simple condition that should be applied to match entities.
     */
    where?: FindOptionsWhere<Entity>[] | FindOptionsWhere<Entity>;
    /**
     * Indicates what relations of entity should be loaded (simplified left join form).
     */
    relations?: FindOptionsRelations<Entity> | FindOptionsRelationByString;
    /**
     * Specifies how relations must be loaded - using "joins" or separate queries.
     * If you are loading too much data with nested joins it's better to load relations
     * using separate queries.
     *
     * Default strategy is "join", but default can be customized in connection options.
     */
    relationLoadStrategy?: "join" | "query";
    /**
     * Specifies what relations should be loaded.
     *
     * @deprecated
     */
    join?: JoinOptions;
    /**
     * Order, in which entities should be ordered.
     */
    order?: FindOptionsOrder<Entity>;
    /**
     * Enables or disables query result caching.
     */
    cache?: boolean | number | {
        id: any;
        milliseconds: number;
    };
    /**
     * Indicates what locking mode should be used.
     *
     * Note: For lock tables, you must specify the table names and not the relation names
     */
    lock?: {
        mode: "optimistic";
        version: number | Date;
    } | {
        mode: "pessimistic_read" | "pessimistic_write" | "dirty_read" | "pessimistic_partial_write" | "pessimistic_write_or_fail" | "for_no_key_update" | "for_key_share";
        tables?: string[];
        onLocked?: "nowait" | "skip_locked";
    };
    /**
     * Indicates if soft-deleted rows should be included in entity result.
     */
    withDeleted?: boolean;
    /**
     * If sets to true then loads all relation ids of the entity and maps them into relation values (not relation objects).
     * If array of strings is given then loads only relation ids of the given properties.
     */
    loadRelationIds?: boolean | {
        relations?: string[];
        disableMixedMap?: boolean;
    };
    /**
     * Indicates if eager relations should be loaded or not.
     * By default, they are loaded when find methods are used.
     */
    loadEagerRelations?: boolean;
    /**
     * If this is set to true, SELECT query in a `find` method will be executed in a transaction.
     */
    transaction?: boolean;
}
