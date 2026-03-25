import { OnChangeFn, Updater, Column, Cell, RowData, TableFeature } from '../types';
export type ColumnPinningPosition = false | 'left' | 'right';
export interface ColumnPinningState {
    left?: string[];
    right?: string[];
}
export interface ColumnPinningTableState {
    columnPinning: ColumnPinningState;
}
export interface ColumnPinningOptions {
    /**
     * Enables/disables column pinning for the table. Defaults to `true`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#enablecolumnpinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    enableColumnPinning?: boolean;
    /**
     * @deprecated Use `enableColumnPinning` or `enableRowPinning` instead.
     * Enables/disables all pinning for the table. Defaults to `true`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#enablepinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    enablePinning?: boolean;
    /**
     * If provided, this function will be called with an `updaterFn` when `state.columnPinning` changes. This overrides the default internal state management, so you will also need to supply `state.columnPinning` from your own managed state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#oncolumnpinningchange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/oncolumnpinningchange)
     */
    onColumnPinningChange?: OnChangeFn<ColumnPinningState>;
}
export interface ColumnPinningDefaultOptions {
    onColumnPinningChange: OnChangeFn<ColumnPinningState>;
}
export interface ColumnPinningColumnDef {
    /**
     * Enables/disables column pinning for this column. Defaults to `true`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#enablepinning-1)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    enablePinning?: boolean;
}
export interface ColumnPinningColumn {
    /**
     * Returns whether or not the column can be pinned.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getcanpin)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getCanPin: () => boolean;
    /**
     * Returns the pinned position of the column. (`'left'`, `'right'` or `false`)
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getispinned)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getIsPinned: () => ColumnPinningPosition;
    /**
     * Returns the numeric pinned index of the column within a pinned column group.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getpinnedindex)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getPinnedIndex: () => number;
    /**
     * Pins a column to the `'left'` or `'right'`, or unpins the column to the center if `false` is passed.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#pin)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    pin: (position: ColumnPinningPosition) => void;
}
export interface ColumnPinningRow<TData extends RowData> {
    /**
     * Returns all center pinned (unpinned) leaf cells in the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getcentervisiblecells)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getCenterVisibleCells: () => Cell<TData, unknown>[];
    /**
     * Returns all left pinned leaf cells in the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getleftvisiblecells)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getLeftVisibleCells: () => Cell<TData, unknown>[];
    /**
     * Returns all right pinned leaf cells in the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getrightvisiblecells)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getRightVisibleCells: () => Cell<TData, unknown>[];
}
export interface ColumnPinningInstance<TData extends RowData> {
    /**
     * Returns all center pinned (unpinned) leaf columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getcenterleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getCenterLeafColumns: () => Column<TData, unknown>[];
    /**
     * Returns whether or not any columns are pinned. Optionally specify to only check for pinned columns in either the `left` or `right` position.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getissomecolumnspinned)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getIsSomeColumnsPinned: (position?: ColumnPinningPosition) => boolean;
    /**
     * Returns all left pinned leaf columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getleftleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getLeftLeafColumns: () => Column<TData, unknown>[];
    /**
     * Returns all right pinned leaf columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getrightleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    getRightLeafColumns: () => Column<TData, unknown>[];
    /**
     * Resets the **columnPinning** state to `initialState.columnPinning`, or `true` can be passed to force a default blank state reset to `{ left: [], right: [], }`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#resetcolumnpinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    resetColumnPinning: (defaultState?: boolean) => void;
    /**
     * Sets or updates the `state.columnPinning` state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#setcolumnpinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
     */
    setColumnPinning: (updater: Updater<ColumnPinningState>) => void;
}
export declare const ColumnPinning: TableFeature;
