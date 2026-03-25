import { RelationCountMetadataArgs } from "../metadata-args/RelationCountMetadataArgs";
import { EntityMetadata } from "./EntityMetadata";
import { RelationMetadata } from "./RelationMetadata";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
/**
 * Contains all information about entity's relation count.
 */
export declare class RelationCountMetadata {
    /**
     * Entity metadata where this column metadata is.
     */
    entityMetadata: EntityMetadata;
    /**
     * Relation which needs to be counted.
     */
    relation: RelationMetadata;
    /**
     * Relation name which need to count.
     */
    relationNameOrFactory: string | ((object: any) => any);
    /**
     * Target class to which metadata is applied.
     */
    target: Function | string;
    /**
     * Target's property name to which this metadata is applied.
     */
    propertyName: string;
    /**
     * Alias of the joined (destination) table.
     */
    alias?: string;
    /**
     * Extra condition applied to "ON" section of join.
     */
    queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;
    constructor(options: {
        entityMetadata: EntityMetadata;
        args: RelationCountMetadataArgs;
    });
    /**
     * Builds some depend relation count metadata properties.
     * This builder method should be used only after entity metadata, its properties map and all relations are build.
     */
    build(): void;
}
