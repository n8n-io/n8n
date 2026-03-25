import { SimpleColumnType, SpatialColumnType, WithLengthColumnType, WithPrecisionColumnType, WithWidthColumnType } from "../../driver/types/ColumnTypes";
import { ColumnCommonOptions } from "../options/ColumnCommonOptions";
import { SpatialColumnOptions } from "../options/SpatialColumnOptions";
import { ColumnWithLengthOptions } from "../options/ColumnWithLengthOptions";
import { ColumnNumericOptions } from "../options/ColumnNumericOptions";
import { ColumnEnumOptions } from "../options/ColumnEnumOptions";
import { ColumnEmbeddedOptions } from "../options/ColumnEmbeddedOptions";
import { ColumnHstoreOptions } from "../options/ColumnHstoreOptions";
import { ColumnWithWidthOptions } from "../options/ColumnWithWidthOptions";
import { ColumnOptions } from "../options/ColumnOptions";
/**
 * Column decorator is used to mark a specific class property as a table column. Only properties decorated with this
 * decorator will be persisted to the database when entity be saved.
 */
export declare function Column(): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(options: ColumnOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: SimpleColumnType, options?: ColumnCommonOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: SpatialColumnType, options?: ColumnCommonOptions & SpatialColumnOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: WithLengthColumnType, options?: ColumnCommonOptions & ColumnWithLengthOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: WithWidthColumnType, options?: ColumnCommonOptions & ColumnWithWidthOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: WithPrecisionColumnType, options?: ColumnCommonOptions & ColumnNumericOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: "enum", options?: ColumnCommonOptions & ColumnEnumOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: "simple-enum", options?: ColumnCommonOptions & ColumnEnumOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: "set", options?: ColumnCommonOptions & ColumnEnumOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export declare function Column(type: "hstore", options?: ColumnCommonOptions & ColumnHstoreOptions): PropertyDecorator;
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 *
 * Property in entity can be marked as Embedded, and on persist all columns from the embedded are mapped to the
 * single table of the entity where Embedded is used. And on hydration all columns which supposed to be in the
 * embedded will be mapped to it from the single table.
 */
export declare function Column(type: (type?: any) => Function, options?: ColumnEmbeddedOptions): PropertyDecorator;
