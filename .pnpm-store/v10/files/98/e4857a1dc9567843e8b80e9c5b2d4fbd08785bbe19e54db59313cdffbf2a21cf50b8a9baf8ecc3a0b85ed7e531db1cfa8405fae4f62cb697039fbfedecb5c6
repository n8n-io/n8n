import { RelationType } from "../metadata/types/RelationTypes";
import { RelationOptions } from "../decorator/options/RelationOptions";
import { PropertyTypeFactory } from "../metadata/types/PropertyTypeInFunction";
import { RelationTypeInFunction } from "../metadata/types/RelationTypeInFunction";
/**
 * Arguments for RelationMetadata class.
 */
export interface RelationMetadataArgs {
    /**
     * Class to which this relation is applied.
     */
    readonly target: Function | string;
    /**
     * In the case if this relation is without a target, targetId must be specified.
     * This is used for entity schemas without classes.
     */
    /**
     * Class's property name to which this relation is applied.
     */
    readonly propertyName: string;
    /**
     * Indicates if this relation will be lazily loaded.
     */
    readonly isLazy: boolean;
    /**
     * Original (reflected) class's property type.
     *
     * todo: this can be empty for relations from entity schemas.
     */
    /**
     * Type of relation. Can be one of the value of the RelationTypes class.
     */
    readonly relationType: RelationType;
    /**
     * Type of the relation. This type is in function because of language specifics and problems with recursive
     * referenced classes.
     */
    readonly type: RelationTypeInFunction;
    /**
     * Inverse side of the relation.
     */
    readonly inverseSideProperty?: PropertyTypeFactory<any>;
    /**
     * Additional relation options.
     */
    readonly options: RelationOptions;
    /**
     * Indicates if this is a parent (can be only many-to-one relation) relation in the tree tables.
     */
    readonly isTreeParent?: boolean;
    /**
     * Indicates if this is a children (can be only one-to-many relation) relation in the tree tables.
     */
    readonly isTreeChildren?: boolean;
}
