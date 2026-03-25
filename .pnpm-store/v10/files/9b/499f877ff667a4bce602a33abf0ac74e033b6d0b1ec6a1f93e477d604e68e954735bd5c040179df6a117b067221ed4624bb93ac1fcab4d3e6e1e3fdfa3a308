import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
export interface EntitySchemaRelationIdOptions {
    /**
     * Name of relation.
     */
    relationName: string;
    /**
     * Alias of the joined (destination) table.
     */
    alias?: string;
    /**
     * Extra condition applied to "ON" section of join.
     */
    queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;
}
