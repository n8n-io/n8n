import type { Column } from './iColumn';
export interface IColumnLimit {
    /** Selector for the column to which these dimension limits will apply */
    key: Column | string;
    /** Defines a minimum width for this column (does not override the column minimum width) */
    minWidth?: number;
    /** Defines a maximum width for this column (does not override the column maximum width) */
    maxWidth?: number;
}
export interface ISizeColumnsToFitParams {
    /** Defines a default minimum width for every column (does not override the column minimum width) */
    defaultMinWidth?: number;
    /** Defines a default maximum width for every column (does not override the column maximum width) */
    defaultMaxWidth?: number;
    /** Provides a minimum and/or maximum width to specific columns */
    columnLimits?: IColumnLimit[];
}
/** Limit a column width when auto-sizing to fit grid width. */
export interface SizeColumnsToFitGridColumnLimits {
    colId: string;
    /** Minimum width for this column (does not override the column minimum width) */
    minWidth?: number;
    /** Maximum width for this column (does not override the column maximum width) */
    maxWidth?: number;
}
/** Auto-size columns to fit the grid width. */
export interface SizeColumnsToFitGridStrategy {
    type: 'fitGridWidth';
    /** Default minimum width for every column (does not override the column minimum width). */
    defaultMinWidth?: number;
    /** Default maximum width for every column (does not override the column maximum width). */
    defaultMaxWidth?: number;
    /** Provide to limit specific column widths when sizing. */
    columnLimits?: SizeColumnsToFitGridColumnLimits[];
}
/** Auto-size columns to fit a provided width. */
export interface SizeColumnsToFitProvidedWidthStrategy {
    type: 'fitProvidedWidth';
    width: number;
}
export interface SizeColumnsToContentColumnLimits {
    colId: string;
    /** Minimum width for this column (does not override the column minimum width) */
    minWidth?: number;
    /** Maximum width for this column (does not override the column maximum width) */
    maxWidth?: number;
}
/**
 * Auto-size columns to fit their cell contents.
 *
 * Not supported by the Viewport Row Model
 */
export interface SizeColumnsToContentStrategy {
    type: 'fitCellContents';
    /** If true, the header won't be included when calculating the column widths. */
    skipHeader?: boolean;
    /** If not provided will auto-size all columns. Otherwise will size the specified columns. */
    colIds?: string[];
    /** Default minimum width for every column (does not override the column minimum width). */
    defaultMinWidth?: number;
    /** Default maximum width for every column (does not override the column maximum width). */
    defaultMaxWidth?: number;
    /** Provide to limit specific column widths when sizing. */
    columnLimits?: SizeColumnsToContentColumnLimits[];
}
export interface ISizeAllColumnsToContentParams {
    /** If true, the header won't be included when calculating the column widths. */
    skipHeader?: boolean;
    /** Default minimum width for every column (does not override the column minimum width). */
    defaultMinWidth?: number;
    /** Default maximum width for every column (does not override the column maximum width). */
    defaultMaxWidth?: number;
    /** Provide to limit specific column widths when sizing. */
    columnLimits?: SizeColumnsToContentColumnLimits[];
}
export interface ISizeColumnsToContentParams extends ISizeAllColumnsToContentParams {
    /** If not provided will auto-size all columns. Otherwise will size the specified columns. */
    colIds?: string[];
}
