import { QueryBuilder } from "./QueryBuilder";
import { QueryExpressionMap } from "./QueryExpressionMap";
/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
export declare class RelationUpdater {
    protected queryBuilder: QueryBuilder<any>;
    protected expressionMap: QueryExpressionMap;
    constructor(queryBuilder: QueryBuilder<any>, expressionMap: QueryExpressionMap);
    /**
     * Performs set or add operation on a relation.
     */
    update(value: any | any[]): Promise<void>;
}
