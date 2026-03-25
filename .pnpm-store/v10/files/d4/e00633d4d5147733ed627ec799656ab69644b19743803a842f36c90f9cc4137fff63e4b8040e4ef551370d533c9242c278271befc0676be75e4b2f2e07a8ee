import { UpsertType } from "../driver/types/UpsertType";
export type InsertOrUpdateOptions = {
    /**
     * If true, postgres will skip the update if no values would be changed (reduces writes)
     */
    skipUpdateIfNoValuesChanged?: boolean;
    /**
     * If included, postgres will apply the index predicate to a conflict target (partial index)
     */
    indexPredicate?: string;
    upsertType?: UpsertType;
};
