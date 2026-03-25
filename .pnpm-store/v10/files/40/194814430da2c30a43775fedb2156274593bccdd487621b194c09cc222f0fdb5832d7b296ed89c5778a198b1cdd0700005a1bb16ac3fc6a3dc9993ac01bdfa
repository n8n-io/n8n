import { RelationMetadata } from "../../metadata/RelationMetadata";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { QueryExpressionMap } from "../QueryExpressionMap";
import { SelectQueryBuilder } from "../SelectQueryBuilder";
/**
 * Stores all join relation id attributes which will be used to build a JOIN query.
 */
export declare class RelationIdAttribute {
    private queryExpressionMap;
    /**
     * Alias of the joined (destination) table.
     */
    alias?: string;
    /**
     * Name of relation.
     */
    relationName: string;
    /**
     * Property + alias of the object where to joined data should be mapped.
     */
    mapToProperty: string;
    /**
     * Extra condition applied to "ON" section of join.
     */
    queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;
    /**
     * Indicates if relation id should NOT be loaded as id map.
     */
    disableMixedMap: boolean;
    constructor(queryExpressionMap: QueryExpressionMap, relationIdAttribute?: Partial<RelationIdAttribute>);
    get joinInverseSideMetadata(): EntityMetadata;
    /**
     * Alias of the parent of this join.
     * For example, if we join ("post.category", "categoryAlias") then "post" is a parent alias.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get parentAlias(): string;
    /**
     * Relation property name of the parent.
     * This is used to understand what is joined.
     * For example, if we join ("post.category", "categoryAlias") then "category" is a relation property.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get relationPropertyPath(): string;
    /**
     * Relation of the parent.
     * This is used to understand what is joined.
     * This is available when join was made using "post.category" syntax.
     */
    get relation(): RelationMetadata;
    /**
     * Generates alias of junction table, whose ids we get.
     */
    get junctionAlias(): string;
    /**
     * Metadata of the joined entity.
     * If extra condition without entity was joined, then it will return undefined.
     */
    get junctionMetadata(): EntityMetadata;
    get mapToPropertyParentAlias(): string;
    get mapToPropertyPropertyPath(): string;
}
