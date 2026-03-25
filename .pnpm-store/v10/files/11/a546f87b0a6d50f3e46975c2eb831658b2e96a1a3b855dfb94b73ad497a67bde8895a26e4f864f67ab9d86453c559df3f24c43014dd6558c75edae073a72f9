import { PrimaryGeneratedColumnType } from "../../driver/types/ColumnTypes";
/**
 * Describes all options for PrimaryGeneratedColumn decorator with numeric generation strategy.
 */
export interface PrimaryGeneratedColumnNumericOptions {
    /**
     * Column type. Must be one of the value from the ColumnTypes class.
     */
    type?: PrimaryGeneratedColumnType;
    /**
     * Column name in the database.
     */
    name?: string;
    /**
     * Column comment. Not supported by all database types.
     */
    comment?: string;
    /**
     * Puts ZEROFILL attribute on to numeric column. Works only for MySQL.
     * If you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to the column
     */
    zerofill?: boolean;
    /**
     * Puts UNSIGNED attribute on to numeric column. Works only for MySQL.
     */
    unsigned?: boolean;
    /**
     * Name of the primary key constraint.
     */
    primaryKeyConstraintName?: string;
}
