import { TableCheckOptions } from "../options/TableCheckOptions";
import { CheckMetadata } from "../../metadata/CheckMetadata";
/**
 * Database's table check constraint stored in this class.
 */
export declare class TableCheck {
    readonly "@instanceof": symbol;
    /**
     * Constraint name.
     */
    name?: string;
    /**
     * Column that contains this constraint.
     */
    columnNames?: string[];
    /**
     * Check expression.
     */
    expression?: string;
    constructor(options: TableCheckOptions);
    /**
     * Creates a new copy of this constraint with exactly same properties.
     */
    clone(): TableCheck;
    /**
     * Creates checks from the check metadata object.
     */
    static create(checkMetadata: CheckMetadata): TableCheck;
}
