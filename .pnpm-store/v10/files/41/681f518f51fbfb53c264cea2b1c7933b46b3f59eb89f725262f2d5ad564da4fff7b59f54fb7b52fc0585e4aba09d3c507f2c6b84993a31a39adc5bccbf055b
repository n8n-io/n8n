import type { Column } from './iColumn';
interface WidthLimits {
    /** Defines a minimum width for this column (does not override the column minimum width) */
    minWidth?: number;
    /** Defines a maximum width for this column (does not override the column maximum width) */
    maxWidth?: number;
}
interface DefaultWidthLimits {
    /** Defines a default minimum width for every column (does not override the column minimum width) */
    defaultMinWidth?: number;
    /** Defines a default maximum width for every column (does not override the column maximum width) */
    defaultMaxWidth?: number;
}
export interface IColumnLimit extends WidthLimits {
    /** Selector for the column to which these dimension limits will apply */
    key: Column | string;
}
export interface ISizeColumnsToFitParams extends DefaultWidthLimits {
    /** Provides a minimum and/or maximum width to specific columns */
    columnLimits?: IColumnLimit[];
}
/** Limit a column width when auto-sizing to fit grid width. */
export interface SizeColumnsToFitGridColumnLimits extends WidthLimits {
    colId: string;
}
/** Auto-size columns to fit the grid width. */
export interface SizeColumnsToFitGridStrategy extends DefaultWidthLimits {
    type: 'fitGridWidth';
    /** Provide to limit specific column widths when sizing. */
    columnLimits?: SizeColumnsToFitGridColumnLimits[];
}
/** Auto-size columns to fit a provided width. */
export interface SizeColumnsToFitProvidedWidthStrategy {
    type: 'fitProvidedWidth';
    width: number;
}
export interface SizeColumnsToContentColumnLimits extends WidthLimits {
    colId: string;
}
/**
 * Auto-size columns to fit their cell contents.
 *
 * Not supported by the Viewport Row Model
 */
export interface SizeColumnsToContentStrategy extends ISizeAllColumnsToContentParams {
    type: 'fitCellContents';
}
export interface ISizeAllColumnsToContentParams extends DefaultWidthLimits {
    /** If true, the header won't be included when calculating the column widths. */
    skipHeader?: boolean;
    /** If not provided will auto-size all columns. Otherwise will size the specified columns. */
    colIds?: string[];
    /** Provide to limit specific column widths when sizing. */
    columnLimits?: SizeColumnsToContentColumnLimits[];
    /** Proportionally scale up columns after sizing to fill any empty space remaining in the grid. */
    scaleUpToFitGridWidth?: boolean;
}
export interface ISizeColumnsToContentParams extends ISizeAllColumnsToContentParams {
    /** If not provided will auto-size all columns. Otherwise will size the specified columns. */
    colIds?: string[];
}
export type AutoSizeStrategy = SizeColumnsToFitGridStrategy | SizeColumnsToFitProvidedWidthStrategy | SizeColumnsToContentStrategy;
export {};
