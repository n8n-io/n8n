import { Driver } from "../../driver/Driver";
import { RelationIdLoadResult } from "../relation-id/RelationIdLoadResult";
import { ObjectLiteral } from "../../common/ObjectLiteral";
import { Alias } from "../Alias";
import { RelationCountLoadResult } from "../relation-count/RelationCountLoadResult";
import { QueryExpressionMap } from "../QueryExpressionMap";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { QueryRunner } from "../..";
/**
 * Transforms raw sql results returned from the database into entity object.
 * Entity is constructed based on its entity metadata.
 */
export declare class RawSqlResultsToEntityTransformer {
    protected expressionMap: QueryExpressionMap;
    protected driver: Driver;
    protected rawRelationIdResults: RelationIdLoadResult[];
    protected rawRelationCountResults: RelationCountLoadResult[];
    protected queryRunner?: QueryRunner | undefined;
    /**
     * Contains a hashmap for every rawRelationIdResults given.
     * In the hashmap you will find the idMaps of a result under the hash of this.hashEntityIds for the result.
     */
    private relationIdMaps;
    constructor(expressionMap: QueryExpressionMap, driver: Driver, rawRelationIdResults: RelationIdLoadResult[], rawRelationCountResults: RelationCountLoadResult[], queryRunner?: QueryRunner | undefined);
    /**
     * Since db returns a duplicated rows of the data where accuracies of the same object can be duplicated
     * we need to group our result and we must have some unique id (primary key in our case)
     */
    transform(rawResults: any[], alias: Alias): any[];
    /**
     * Groups given raw results by ids of given alias.
     */
    protected group(rawResults: any[], alias: Alias): Map<string, any[]>;
    /**
     * Transforms set of data results into single entity.
     */
    protected transformRawResultsGroup(rawResults: any[], alias: Alias): ObjectLiteral | undefined;
    protected transformColumns(rawResults: any[], alias: Alias, entity: ObjectLiteral, metadata: EntityMetadata): boolean;
    /**
     * Transforms joined entities in the given raw results by a given alias and stores to the given (parent) entity
     */
    protected transformJoins(rawResults: any[], entity: ObjectLiteral, alias: Alias, metadata: EntityMetadata): boolean;
    protected transformRelationIds(rawSqlResults: any[], alias: Alias, entity: ObjectLiteral, metadata: EntityMetadata): boolean;
    protected transformRelationCounts(rawSqlResults: any[], alias: Alias, entity: ObjectLiteral): boolean;
    private createValueMapFromJoinColumns;
    private extractEntityPrimaryIds;
    /** Prepare data to run #transformRelationIds, as a lot of result independent data is needed in every call */
    private prepareDataForTransformRelationIds;
    /**
     * Use a simple JSON.stringify to create a simple hash of the primary ids of an entity.
     * As this.extractEntityPrimaryIds always creates the primary id object in the same order, if the same relation is
     * given, a simple JSON.stringify should be enough to get a unique hash per entity!
     */
    private hashEntityIds;
}
