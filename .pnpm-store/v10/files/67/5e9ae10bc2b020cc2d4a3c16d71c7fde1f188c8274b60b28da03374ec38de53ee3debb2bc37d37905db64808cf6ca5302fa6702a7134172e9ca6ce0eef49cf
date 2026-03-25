import { JoinColumnOptions } from "./JoinColumnOptions";
/**
 * Describes join table options.
 */
export interface JoinTableOptions {
    /**
     * Name of the table that will be created to store values of the both tables (join table).
     * By default is auto generated.
     */
    name?: string;
    /**
     * First column of the join table.
     */
    joinColumn?: JoinColumnOptions;
    /**
     * Second (inverse) column of the join table.
     */
    inverseJoinColumn?: JoinColumnOptions;
    /**
     * Database where join table will be created.
     * Works only in some databases (like mysql).
     */
    database?: string;
    /**
     * Schema where join table will be created.
     * Works only in some databases (like postgres).
     */
    schema?: string;
    /**
     * Indicates if schema synchronization is enabled or disabled junction table.
     * If it will be set to false then schema sync will and migrations ignores junction table.
     * By default schema synchronization is enabled.
     */
    synchronize?: boolean;
}
