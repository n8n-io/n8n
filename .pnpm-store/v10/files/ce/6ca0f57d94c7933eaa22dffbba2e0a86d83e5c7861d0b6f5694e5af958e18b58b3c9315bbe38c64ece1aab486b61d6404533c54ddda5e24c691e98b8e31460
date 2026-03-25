import type { Column } from './iColumn';
import type { IRowNode } from './iRowNode';
export interface GetCellsParams<TData = any> {
    /** Optional list of row nodes to restrict operation to */
    rowNodes?: IRowNode<TData>[];
    /** Optional list of columns to restrict operation to */
    columns?: (string | Column)[];
}
interface RefreshParams<TData = any> extends GetCellsParams<TData> {
    /** Skip change detection, refresh everything. */
    force?: boolean;
    /** Skip cell flashing, if cell flashing is enabled. */
    suppressFlash?: boolean;
}
export interface RefreshCellsParams<TData = any> extends RefreshParams<TData> {
}
export interface RefreshRowsParams<TData = any> extends RefreshParams<TData> {
}
export interface FlashCellsParams<TData = any> extends GetCellsParams<TData> {
    /** The duration in milliseconds of how long a cell should remain in its "flashed" state. */
    flashDuration?: number;
    /** The duration in milliseconds of how long the "flashed" state animation takes to fade away after the timer set by `flashDuration` has completed. */
    fadeDuration?: number;
}
export {};
