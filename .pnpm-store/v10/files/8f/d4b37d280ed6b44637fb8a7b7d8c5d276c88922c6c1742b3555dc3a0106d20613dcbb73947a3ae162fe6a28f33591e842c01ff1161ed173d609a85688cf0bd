import { ColumnType } from "../driver/types/ColumnTypes";
import { ValueTransformer } from "../decorator/options/ValueTransformer";
import { SpatialColumnOptions } from "../decorator/options/SpatialColumnOptions";
export interface EntitySchemaColumnOptions extends SpatialColumnOptions {
    /**
     * Indicates if this column is a primary column.
     */
    primary?: boolean;
    /**
     * Indicates if this column is of type ObjectId
     */
    objectId?: boolean;
    /**
     * Indicates if this column is a created date column.
     */
    createDate?: boolean;
    /**
     * Indicates if this column is an update date column.
     */
    updateDate?: boolean;
    /**
     * Indicates if this column is a delete date column.
     */
    deleteDate?: boolean;
    /**
     * Indicates if this column is a version column.
     */
    version?: boolean;
    /**
     * Indicates if this column is a treeChildrenCount column.
     */
    treeChildrenCount?: boolean;
    /**
     * Indicates if this column is a treeLevel column.
     */
    treeLevel?: boolean;
    /**
     * Column type. Must be one of the value from the ColumnTypes class.
     */
    type: ColumnType;
    /**
     * Column name in the database.
     */
    name?: string;
    /**
     * Column type's length. For example type = "string" and length = 100 means that ORM will create a column with
     * type varchar(100).
     */
    length?: string | number;
    /**
     * Column type's display width. Used only on some column types in MySQL.
     * For example, INT(4) specifies an INT with a display width of four digits.
     */
    width?: number;
    /**
     * Indicates if column's value can be set to NULL.
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
     * If false you'll be able to write this value only when you first time insert the object.
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
     * Specifies if this column will use AUTO_INCREMENT or not (e.g. generated number).
     */
    generated?: true | "increment" | "uuid" | "rowid";
    /**
     * Specifies if column's value must be unique or not.
     */
    unique?: boolean;
    /**
     * Extra column definition. Should be used only in emergency situations. Note that if you'll use this property
     * auto schema generation will not work properly anymore. Avoid using it.
     */
    columnDefinition?: string;
    /**
     * Column comment.
     */
    comment?: string;
    /**
     * Default database value.
     */
    default?: any;
    /**
     * ON UPDATE trigger. Works only for MySQL.
     */
    onUpdate?: string;
    /**
     * The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
     * number of digits that are stored for the values.
     */
    precision?: number;
    /**
     * The scale for a decimal (exact numeric) column (applies only for decimal column), which represents the number
     * of digits to the right of the decimal point and must not be greater than precision.
     */
    scale?: number;
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
    enum?: any[] | Object;
    /**
     * Exact name of enum
     */
    enumName?: string;
    /**
     * Generated column expression.
     */
    asExpression?: string;
    /**
     * Generated column type.
     */
    generatedType?: "VIRTUAL" | "STORED";
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
     * Name of the primary key constraint.
     */
    primaryKeyConstraintName?: string;
}
