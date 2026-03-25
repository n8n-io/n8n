import { RelationIdMetadataArgs } from "../metadata-args/RelationIdMetadataArgs";
import { EntityMetadata } from "./EntityMetadata";
import { RelationMetadata } from "./RelationMetadata";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { ObjectLiteral } from "../common/ObjectLiteral";
/**
 * Contains all information about entity's relation count.
 */
export declare class RelationIdMetadata {
    /**
     * Entity metadata where this column metadata is.
     */
    entityMetadata: EntityMetadata;
    /**
     * Relation from which ids will be extracted.
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
        args: RelationIdMetadataArgs;
    });
    /**
     * Sets relation id value from the given entity.
     *
     * todo: make it to work in embeds as well.
     */
    setValue(entity: ObjectLiteral): void;
    /**
     * Builds some depend relation id properties.
     * This builder method should be used only after entity metadata, its properties map and all relations are build.
     */
    build(): void;
}
