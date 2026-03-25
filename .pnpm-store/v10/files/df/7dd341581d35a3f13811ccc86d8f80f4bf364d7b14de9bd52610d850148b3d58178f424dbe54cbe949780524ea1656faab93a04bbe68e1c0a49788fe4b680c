import { JoinColumnMetadataArgs } from "./JoinColumnMetadataArgs";
/**
 * Arguments for JoinTableMetadata class.
 */
export interface JoinTableMetadataArgs {
    /**
     * Class to which this column is applied.
     */
    readonly target: Function | string;
    /**
     * Class's property name to which this column is applied.
     */
    readonly propertyName: string;
    /**
     * Name of the table that will be created to store values of the both tables (join table).
     * By default is auto generated.
     */
    readonly name?: string;
    /**
     * First column of the join table.
     */
    readonly joinColumns?: JoinColumnMetadataArgs[];
    /**
     * Second (inverse) column of the join table.
     */
    readonly inverseJoinColumns?: JoinColumnMetadataArgs[];
    /**
     * Database where join table will be created.
     * Works only in some databases (like mysql).
     */
    readonly database?: string;
    /**
     * Schema where join table will be created.
     * Works only in some databases (like postgres).
     */
    readonly schema?: string;
    /**
     * Indicates if schema synchronization is enabled or disabled junction table.
     * If it will be set to false then schema sync will and migrations ignores junction table.
     * By default schema synchronization is enabled.
     */
    readonly synchronize?: boolean;
}
