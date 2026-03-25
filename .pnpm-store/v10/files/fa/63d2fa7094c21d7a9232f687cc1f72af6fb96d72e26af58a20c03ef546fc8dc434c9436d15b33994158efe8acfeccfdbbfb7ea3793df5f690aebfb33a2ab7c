import { QueryBuilder } from "./QueryBuilder";
import { QueryExpressionMap } from "./QueryExpressionMap";
/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
export declare class RelationRemover {
    protected queryBuilder: QueryBuilder<any>;
    protected expressionMap: QueryExpressionMap;
    constructor(queryBuilder: QueryBuilder<any>, expressionMap: QueryExpressionMap);
    /**
     * Performs remove operation on a relation.
     */
    remove(value: any | any[]): Promise<void>;
}
