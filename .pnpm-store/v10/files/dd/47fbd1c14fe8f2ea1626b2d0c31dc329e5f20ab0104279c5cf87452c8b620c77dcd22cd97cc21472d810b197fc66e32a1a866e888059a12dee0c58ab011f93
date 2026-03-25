import type { Column } from '../interfaces/iColumn';
import type { IRowNode } from '../interfaces/iRowNode';
import type { ValueFormatterParams, ValueParserParams } from './colDef';
export type ValueParserLiteParams<TData, TValue, TContext = any> = Omit<ValueParserParams<TData, TValue, TContext>, 'data' | 'node' | 'oldValue'>;
export interface ValueParserLiteFunc<TData, TValue, TContext = any> {
    (params: ValueParserLiteParams<TData, TValue, TContext>): TValue | null | undefined;
}
export type ValueFormatterLiteParams<TData, TValue, TContext = any> = Omit<ValueFormatterParams<TData, TValue, TContext>, 'data' | 'node'>;
export interface ValueFormatterLiteFunc<TData, TValue, TContext = any> {
    (params: ValueFormatterLiteParams<TData, TValue, TContext>): string;
}
/**
 * The pre-defined base data types.
 *
 * `'text'` is type `string`.
 *
 * `'number'` is type `number`.
 *
 * `'boolean'` is type `boolean`.
 *
 * `'date'` is type `Date`.
 *
 * `'dateString'` is type `string` but represents a date.
 *
 * `'dateTime'` is type `Date`.
 *
 * `'dateTimeString'` is type `string` but represents a date with time.
 *
 * `object` is any other type.
 */
export type BaseCellDataType = 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object' | 'dateTime' | 'dateTimeString';
interface BaseDataTypeDefinition<TValueType extends BaseCellDataType, TData = any, TValue = any, TContext = any> {
    /** The underlying data type */
    baseDataType: TValueType;
    /**
     * The data type that this extends. Either one of the pre-defined data types
     * (`'text'`, `'number'`,  `'boolean'`,  `'date'`,  `'dateString'`, `'dateTime'`, `'dateTimeString'` or  `'object'`)
     * or another custom data type.
     */
    extendsDataType: string;
    /**
     * Parses a value into the correct data type.
     * This will be used as the `colDef.valueParser` (unless overridden),
     * and in other places where parsing is required.
     * As this could be used in places where there is no row,
     * the `params` do not have row node or data properties.
     * If not provided, the value parser of the data type that this extends will be used.
     */
    valueParser?: ValueParserLiteFunc<TData, TValue, TContext>;
    /**
     * Formats a value for display.
     * This will be used as the `colDef.valueFormatter` (unless overridden),
     * and in other places where formatting is required.
     * As this could be used in places where there is no row,
     * the `params` do not have row node or data properties.
     * If not provided, the value formatter of the data type that this extends will be used.
     */
    valueFormatter?: ValueFormatterLiteFunc<TData, TValue, TContext>;
    /**
     * Returns `true` if the `value` is of this data type.
     * Used when inferring cell data types as well as to ensure values of the
     * wrong data type cannot be set into this column.
     * If not provided, the data type matcher of the data type that this extends will be used.
     */
    dataTypeMatcher?: (value: any) => boolean;
    /**
     * A comma separated string or array of strings containing `ColumnType` keys,
     * which can be used as a template for columns of this data type.
     */
    columnTypes?: string | string[];
    /**
     * If `true`, this data type will append any specified column types to those of the data type that this extends.
     * If `false`, the column types for this data type will replace any of the data type that this extends.
     * @default false
     */
    appendColumnTypes?: boolean;
    /**
     * By default, certain column definition properties are set based on the base data type.
     * If this is set to `true`, these properties will not be set.
     * @default false
     */
    suppressDefaultProperties?: boolean;
}
/** Represents a `'text'` data type (type `string`). */
export interface TextDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'text', TData, string, TContext> {
}
/** Represents a `'number'` data type (type `number`). */
export interface NumberDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'number', TData, number, TContext> {
}
/** Represents a `'boolean'` data type (type `boolean`). */
export interface BooleanDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'boolean', TData, boolean, TContext> {
}
/** Represents a `'date'` data type (type `Date`). */
export interface DateDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'date', TData, Date, TContext> {
}
/** Represents a `'dateString'` data type (type `string` that represents a date). */
export interface DateStringDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'dateString', TData, string, TContext> {
    /** Converts a date in `string` format to a `Date`. */
    dateParser?: (value: string | undefined) => Date | undefined;
    /** Converts a date in `Date` format to a `string`. */
    dateFormatter?: (value: Date | undefined) => string | undefined;
}
/** Represents a `'dateTime'` data type (type `Date`). */
export interface DateTimeDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'dateTime', TData, Date, TContext> {
}
/** Represents a `'dateTimeString'` data type (type `string` that represents a dateTime). */
export interface DateTimeStringDataTypeDefinition<TData = any, TContext = any> extends BaseDataTypeDefinition<'dateTimeString', TData, string, TContext> {
    /** Converts a date in `string` format to a `Date`. */
    dateParser?: (value: string | undefined) => Date | undefined;
    /** Converts a date in `Date` format to a `string`. */
    dateFormatter?: (value: Date | undefined) => string | undefined;
}
/** Represents an `'object'` data type (any type). */
export interface ObjectDataTypeDefinition<TData, TValue, TContext> extends BaseDataTypeDefinition<'object', TData, TValue, TContext> {
}
/** Throws an error if not all keys K are present in Record Obj, as well as if Obj has extra keys (though only if you try to access properties) */
export type CheckDataTypes<Obj extends Record<K, any>, K extends keyof any = BaseCellDataType> = keyof Obj extends K ? Obj : never;
/** Configuration options for a cell data type. */
export type DataTypeDefinition<TData = any, TValue = any, TContext = any> = TextDataTypeDefinition<TData, TContext> | NumberDataTypeDefinition<TData, TContext> | BooleanDataTypeDefinition<TData, TContext> | DateDataTypeDefinition<TData, TContext> | DateStringDataTypeDefinition<TData, TContext> | DateTimeDataTypeDefinition<TData, TContext> | DateTimeStringDataTypeDefinition<TData, TContext> | ObjectDataTypeDefinition<TData, TValue, TContext>;
/** Configuration options for pre-defined data types. */
export type CoreDataTypeDefinition<TData = any, TValue = any, TContext = any> = Omit<DataTypeDefinition<TData, TValue, TContext>, 'extendsDataType'>;
export type DataTypeFormatValueFunc = (params: {
    column: Column;
    node: IRowNode | null;
    value: any;
}) => string;
export {};
