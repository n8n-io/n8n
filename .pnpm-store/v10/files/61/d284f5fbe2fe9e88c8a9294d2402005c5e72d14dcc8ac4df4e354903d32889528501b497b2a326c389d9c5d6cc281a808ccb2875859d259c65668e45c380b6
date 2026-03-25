import type { Column, ColumnGroup } from './iColumn';
import type { AgGridCommon } from './iCommon';
import type { IRowNode } from './iRowNode';
import type { RowPosition } from './iRowPosition';
export interface ExportFileNameGetterParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
}
export type ExportFileNameGetter = (params?: ExportFileNameGetterParams) => string;
export interface BaseExportParams {
    /**
     * If `true`, all columns will be exported in the order they appear in the columnDefs.
     * When `false` only the columns currently being displayed will be exported.
     * @default false
     */
    allColumns?: boolean;
    /**
     * Provide a list (an array) of column keys or Column objects if you want to export specific columns.
     */
    columnKeys?: (string | Column)[];
    /** Row node positions. */
    rowPositions?: RowPosition[];
    /**
     * String to use as the file name or a function that returns a string.
     */
    fileName?: string | ExportFileNameGetter;
    /**
     * Determines whether rows are exported before being filtered and sorted.
     * @default 'filteredAndSorted'
     */
    exportedRows?: 'all' | 'filteredAndSorted';
    /**
     * Export only selected rows.
     * @default false
     */
    onlySelected?: boolean;
    /**
     * Only export selected rows including other pages (only makes sense when using pagination).
     * @default false
     */
    onlySelectedAllPages?: boolean;
    /**
     * Set to `true` to exclude header column groups.
     * @default false
     */
    skipColumnGroupHeaders?: boolean;
    /**
     * Set to `true` if you don't want to export column headers.
     * @default false
     */
    skipColumnHeaders?: boolean;
    /**
     * Set to `true` to skip row group headers if grouping rows. Only relevant when grouping rows.
     * @default false
     */
    skipRowGroups?: boolean;
    /**
     * Set to `true` to suppress exporting rows pinned to the top of the grid.
     * @default false
     */
    skipPinnedTop?: boolean;
    /**
     * Set to `true` to suppress exporting rows pinned to the bottom of the grid.
     * @default false
     */
    skipPinnedBottom?: boolean;
    /**
     * A callback function that will be invoked once per row in the grid. Return true to omit the row from the export.
     */
    shouldRowBeSkipped?(params: ShouldRowBeSkippedParams): boolean;
    /**
     * A callback function invoked once per cell in the grid. Return a string value to be displayed in the export. For example this is useful for formatting date values.
     */
    processCellCallback?(params: ProcessCellForExportParams): string;
    /**
     * A callback function invoked once per column. Return a string to be displayed in the column header.
     */
    processHeaderCallback?(params: ProcessHeaderForExportParams): string;
    /**
     * A callback function invoked once per column group. Return a `string` to be displayed in the column group header.
     * Note that column groups are exported by default, this option will not work with `skipColumnGroupHeaders=true`.
     */
    processGroupHeaderCallback?(params: ProcessGroupHeaderForExportParams): string;
    /**
     * A callback function invoked once per row group. Return a `string` to be displayed in the group cell.
     */
    processRowGroupCallback?(params: ProcessRowGroupForExportParams): string;
}
export interface ExportParams<T> extends BaseExportParams {
    /**
     * Content to put at the top of the exported sheet.
     */
    prependContent?: T;
    /**
     * Content to put at the bottom of the exported sheet.
     */
    appendContent?: T;
    /** A callback function to return content to be inserted below a row in the export. */
    getCustomContentBelowRow?: (params: ProcessRowGroupForExportParams) => T | undefined;
    /**
     * Set to `true` to allow the contents of the Header Row Column to be exported.
     */
    exportRowNumbers?: boolean;
}
export type PackageFileParams<T> = T & {
    data: string[];
};
export interface CsvCell {
    /** The data that will be added to the cell. */
    data: CsvCellData;
    /**
     * The number of cells to span across (1 means span 2 columns).
     * @default 0
     */
    mergeAcross?: number;
}
export interface CsvCellData {
    /** The value of the cell. */
    value: string | null;
}
export type CsvCustomContent = CsvCell[][] | string;
export interface CsvExportParams extends ExportParams<CsvCustomContent> {
    /**
     * Delimiter to insert between cell values.
     * @default ,
     */
    columnSeparator?: string;
    /**
     * By default cell values are encoded according to CSV format rules: values are wrapped in double quotes, and any double quotes within the values are escaped, so my value becomes \"my\"\"value\". Pass `true` to insert the value into the CSV file without escaping.
     * In this case it is your responsibility to ensure that no cells contain the columnSeparator character.
     * @default false
     */
    suppressQuotes?: boolean;
}
export interface ShouldRowBeSkippedParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** Row node. */
    node: IRowNode<TData>;
}
export interface ProcessCellForExportParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    value: any;
    accumulatedRowIndex?: number;
    node?: IRowNode<TData> | null;
    column: Column;
    type: string;
    /** Utility function to parse a value using the column's `colDef.valueParser` */
    parseValue: (value: string) => any;
    /** Utility function to format a value using the column's `colDef.valueFormatter` */
    formatValue: (value: any) => string;
}
export interface ProcessHeaderForExportParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    column: Column;
}
export interface ProcessGroupHeaderForExportParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    columnGroup: ColumnGroup;
}
export interface ProcessRowGroupForExportParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    node: IRowNode<TData>;
    column?: Column;
}
