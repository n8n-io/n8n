import { EntityMetadata } from "../metadata/EntityMetadata";
import { DataSource } from "../data-source/DataSource";
import { RelationMetadata } from "../metadata/RelationMetadata";
import { QueryExpressionMap } from "./QueryExpressionMap";
import { Alias } from "./Alias";
/**
 * Stores all join attributes which will be used to build a JOIN query.
 */
export declare class JoinAttribute {
    private connection;
    private queryExpressionMap;
    /**
     * Join direction.
     */
    direction: "LEFT" | "INNER";
    /**
     * Alias of the joined (destination) table.
     */
    alias: Alias;
    /**
     * Joined table, entity target, or relation in "post.category" format.
     */
    entityOrProperty: Function | string;
    /**
     * Extra condition applied to "ON" section of join.
     */
    condition?: string;
    /**
     * Property + alias of the object where to joined data should be mapped.
     */
    mapToProperty?: string;
    /**
     * Indicates if user maps one or many objects from the join.
     */
    isMappingMany?: boolean;
    /**
     * Useful when the joined expression is a custom query to support mapping.
     */
    mapAsEntity?: Function | string;
    constructor(connection: DataSource, queryExpressionMap: QueryExpressionMap, joinAttribute?: JoinAttribute);
    get isMany(): boolean;
    isSelectedCache: boolean;
    isSelectedEvaluated: boolean;
    /**
     * Indicates if this join is selected.
     */
    get isSelected(): boolean;
    /**
     * Name of the table which we should join.
     */
    get tablePath(): string;
    /**
     * Alias of the parent of this join.
     * For example, if we join ("post.category", "categoryAlias") then "post" is a parent alias.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get parentAlias(): string | undefined;
    /**
     * Relation property name of the parent.
     * This is used to understand what is joined.
     * For example, if we join ("post.category", "categoryAlias") then "category" is a relation property.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get relationPropertyPath(): string | undefined;
    relationCache: RelationMetadata | undefined;
    relationEvaluated: boolean;
    /**
     * Relation of the parent.
     * This is used to understand what is joined.
     * This is available when join was made using "post.category" syntax.
     * Relation can be undefined if entityOrProperty is regular entity or custom table.
     */
    get relation(): RelationMetadata | undefined;
    /**
     * Metadata of the joined entity.
     * If table without entity was joined, then it will return undefined.
     */
    get metadata(): EntityMetadata | undefined;
    /**
     * Generates alias of junction table, whose ids we get.
     */
    get junctionAlias(): string;
    get mapToPropertyParentAlias(): string | undefined;
    get mapToPropertyPropertyName(): string | undefined;
}
