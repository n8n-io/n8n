import { EmbeddedMetadata } from "./EmbeddedMetadata";
import { EntityMetadata } from "./EntityMetadata";
import { NamingStrategyInterface } from "../naming-strategy/NamingStrategyInterface";
import { ColumnMetadata } from "./ColumnMetadata";
import { UniqueMetadataArgs } from "../metadata-args/UniqueMetadataArgs";
import { DeferrableType } from "./types/DeferrableType";
/**
 * Unique metadata contains all information about table's unique constraints.
 */
export declare class UniqueMetadata {
    /**
     * Entity metadata of the class to which this unique constraint is applied.
     */
    entityMetadata: EntityMetadata;
    /**
     * Embedded metadata if this unique was applied on embedded.
     */
    embeddedMetadata?: EmbeddedMetadata;
    /**
     * Target class to which metadata is applied.
     */
    target?: Function | string;
    /**
     * Unique columns.
     */
    columns: ColumnMetadata[];
    /**
     * Indicate if unique constraints can be deferred.
     */
    deferrable?: DeferrableType;
    /**
     * User specified unique constraint name.
     */
    givenName?: string;
    /**
     * User specified column names.
     */
    givenColumnNames?: ((object?: any) => any[] | {
        [key: string]: number;
    }) | string[];
    /**
     * Final unique constraint name.
     * If unique constraint name was given by a user then it stores normalized (by naming strategy) givenName.
     * If unique constraint name was not given then its generated.
     */
    name: string;
    /**
     * Map of column names with order set.
     * Used only by MongoDB driver.
     */
    columnNamesWithOrderingMap: {
        [key: string]: number;
    };
    constructor(options: {
        entityMetadata: EntityMetadata;
        embeddedMetadata?: EmbeddedMetadata;
        columns?: ColumnMetadata[];
        args?: UniqueMetadataArgs;
    });
    /**
     * Builds some depend unique constraint properties.
     * Must be called after all entity metadata's properties map, columns and relations are built.
     */
    build(namingStrategy: NamingStrategyInterface): this;
}
