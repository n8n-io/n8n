import { ForeignKeyMetadata } from "../../metadata/ForeignKeyMetadata";
import { TableForeignKeyOptions } from "../options/TableForeignKeyOptions";
import { Driver } from "../../driver/Driver";
/**
 * Foreign key from the database stored in this class.
 */
export declare class TableForeignKey {
    readonly "@instanceof": symbol;
    /**
     * Name of the foreign key constraint.
     */
    name?: string;
    /**
     * Column names which included by this foreign key.
     */
    columnNames: string[];
    /**
     * Database of Table referenced in the foreign key.
     */
    referencedDatabase?: string;
    /**
     * Database of Table referenced in the foreign key.
     */
    referencedSchema?: string;
    /**
     * Table referenced in the foreign key.
     */
    referencedTableName: string;
    /**
     * Column names which included by this foreign key.
     */
    referencedColumnNames: string[];
    /**
     * "ON DELETE" of this foreign key, e.g. what action database should perform when
     * referenced stuff is being deleted.
     */
    onDelete?: string;
    /**
     * "ON UPDATE" of this foreign key, e.g. what action database should perform when
     * referenced stuff is being updated.
     */
    onUpdate?: string;
    /**
     * Set this foreign key constraint as "DEFERRABLE" e.g. check constraints at start
     * or at the end of a transaction
     */
    deferrable?: string;
    constructor(options: TableForeignKeyOptions);
    /**
     * Creates a new copy of this foreign key with exactly same properties.
     */
    clone(): TableForeignKey;
    /**
     * Creates a new table foreign key from the given foreign key metadata.
     */
    static create(metadata: ForeignKeyMetadata, driver: Driver): TableForeignKey;
}
