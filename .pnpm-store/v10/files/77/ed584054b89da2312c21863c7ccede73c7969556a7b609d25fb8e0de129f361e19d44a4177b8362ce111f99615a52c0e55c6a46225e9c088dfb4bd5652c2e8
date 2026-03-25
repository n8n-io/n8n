import { ColumnOptions } from "../options/ColumnOptions";
import { ColumnType } from "../../driver/types/ColumnTypes";
/**
 * Describes all primary key column's options.
 * If specified, the nullable field must be set to false.
 */
export type PrimaryColumnOptions = ColumnOptions & {
    nullable?: false;
};
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * Primary columns also creates a PRIMARY KEY for this column in a db.
 */
export declare function PrimaryColumn(options?: PrimaryColumnOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * Primary columns also creates a PRIMARY KEY for this column in a db.
 */
export declare function PrimaryColumn(type?: ColumnType, options?: PrimaryColumnOptions): PropertyDecorator;
