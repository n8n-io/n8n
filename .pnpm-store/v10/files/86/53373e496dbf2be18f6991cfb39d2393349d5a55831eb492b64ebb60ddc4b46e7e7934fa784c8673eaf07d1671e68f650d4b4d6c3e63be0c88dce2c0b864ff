import { TableUniqueOptions } from "../options/TableUniqueOptions";
import { UniqueMetadata } from "../../metadata/UniqueMetadata";
/**
 * Database's table unique constraint stored in this class.
 */
export declare class TableUnique {
    readonly "@instanceof": symbol;
    /**
     * Constraint name.
     */
    name?: string;
    /**
     * Columns that contains this constraint.
     */
    columnNames: string[];
    /**
     * Set this foreign key constraint as "DEFERRABLE" e.g. check constraints at start
     * or at the end of a transaction
     */
    deferrable?: string;
    constructor(options: TableUniqueOptions);
    /**
     * Creates a new copy of this constraint with exactly same properties.
     */
    clone(): TableUnique;
    /**
     * Creates unique from the unique metadata object.
     */
    static create(uniqueMetadata: UniqueMetadata): TableUnique;
}
