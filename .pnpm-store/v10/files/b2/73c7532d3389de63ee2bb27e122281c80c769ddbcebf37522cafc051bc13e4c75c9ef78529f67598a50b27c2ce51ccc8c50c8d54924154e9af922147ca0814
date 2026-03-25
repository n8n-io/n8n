import { ColumnType } from "../../driver/types/ColumnTypes";
import { ValueTransformer } from "./ValueTransformer";
import { ColumnCommonOptions } from "./ColumnCommonOptions";
/**
 * Describes all column's options.
 */
export interface ColumnOptions extends ColumnCommonOptions {
    /**
     * Column type. Must be one of the value from the ColumnTypes class.
     */
    type?: ColumnType;
    /**
     * Column name in the database.
     */
    name?: string;
    /**
     * Column type's length. Used only on some column types.
     * For example type = "string" and length = "100" means that ORM will create a column with type varchar(100).
     */
    length?: string | number;
    /**
     * Column type's display width. Used only on some column types in MySQL.
     * For example, INT(4) specifies an INT with a display width of four digits.
     */
    width?: number;
    /**
     * Indicates if column's value can be set to NULL.
     * Default value is "false".
     */
    nullable?: boolean;
    /**
     * Indicates if column value is not updated by "save" operation.
     * It means you'll be able to write this value only when you first time insert the object.
     * Default value is "false".
     *
     * @deprecated Please use the `update` option instead.  Careful, it takes
     * the opposite value to readonly.
     *
     */
    readonly?: boolean;
    /**
     * Indicates if column value is updated by "save" operation.
     * If false, you'll be able to write this value only when you first time insert the object.
     * Default value is "true".
     */
    update?: boolean;
    /**
     * Indicates if column is always selected by QueryBuilder and find operations.
     * Default value is "true".
     */
    select?: boolean;
    /**
     * Indicates if column is inserted by default.
     * Default value is "true".
     */
    insert?: boolean;
    /**
     * Default database value.
     */
    default?: any;
    /**
     * ON UPDATE trigger. Works only for MySQL.
     */
    onUpdate?: string;
    /**
     * Indicates if this column is a primary key.
     * Same can be achieved when @PrimaryColumn decorator is used.
     */
    primary?: boolean;
    /**
     * Specifies if column's value must be unique or not.
     */
    unique?: boolean;
    /**
     * Column comment. Not supported by all database types.
     */
    comment?: string;
    /**
     * The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
     * number of digits that are stored for the values.
     */
    precision?: number | null;
    /**
     * The scale for a decimal (exact numeric) column (applies only for decimal column), which represents the number
     * of digits to the right of the decimal point and must not be greater than precision.
     */
    scale?: number;
    /**
     * Puts ZEROFILL attribute on to numeric column. Works only for MySQL.
     * If you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to this column
     */
    zerofill?: boolean;
    /**
     * Puts UNSIGNED attribute on to numeric column. Works only for MySQL.
     */
    unsigned?: boolean;
    /**
     * Defines a column character set.
     * Not supported by all database types.
     */
    charset?: string;
    /**
     * Defines a column collation.
     */
    collation?: string;
    /**
     * Array of possible enumerated values.
     */
    enum?: (string | number)[] | Object;
    /**
     * Exact name of enum
     */
    enumName?: string;
    /**
     * If this column is primary key then this specifies the name for it.
     */
    primaryKeyConstraintName?: string;
    /**
     * If this column is foreign key then this specifies the name for it.
     */
    foreignKeyConstraintName?: string;
    /**
     * Generated column expression.
     */
    asExpression?: string;
    /**
     * Generated column type.
     */
    generatedType?: "VIRTUAL" | "STORED";
    /**
     * Identity column type. Supports only in Postgres 10+.
     */
    generatedIdentity?: "ALWAYS" | "BY DEFAULT";
    /**
     * Return type of HSTORE column.
     * Returns value as string or as object.
     */
    hstoreType?: "object" | "string";
    /**
     * Indicates if this column is an array.
     * Can be simply set to true or array length can be specified.
     * Supported only by postgres.
     */
    array?: boolean;
    /**
     * Specifies a value transformer that is to be used to (un)marshal
     * this column when reading or writing to the database.
     */
    transformer?: ValueTransformer | ValueTransformer[];
    /**
     * Spatial Feature Type (Geometry, Point, Polygon, etc.)
     */
    spatialFeatureType?: string;
    /**
     * SRID (Spatial Reference ID (EPSG code))
     */
    srid?: number;
}
