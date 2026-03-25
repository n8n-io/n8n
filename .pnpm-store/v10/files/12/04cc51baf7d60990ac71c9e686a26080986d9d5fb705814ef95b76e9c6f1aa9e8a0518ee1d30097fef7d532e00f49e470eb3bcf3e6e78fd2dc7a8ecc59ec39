import { InsertOrUpdateOptions } from "../query-builder/InsertOrUpdateOptions";
import { UpsertType } from "../driver/types/UpsertType";
/**
 * Special options passed to Repository#upsert
 */
export interface UpsertOptions<Entity> extends InsertOrUpdateOptions {
    conflictPaths: string[] | {
        [P in keyof Entity]?: true;
    };
    /**
     * If true, postgres will skip the update if no values would be changed (reduces writes)
     */
    skipUpdateIfNoValuesChanged?: boolean;
    /**
     * Define the type of upsert to use (currently, CockroachDB only).
     *
     * If none provided, it will use the default for the database (first one in the list)
     */
    upsertType?: UpsertType;
}
