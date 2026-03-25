import { ColumnPinningPosition } from '..';
import { Cell, Column, OnChangeFn, Table, Updater, RowData, TableFeature } from '../types';
export type VisibilityState = Record<string, boolean>;
export interface VisibilityTableState {
    columnVisibility: VisibilityState;
}
export interface VisibilityOptions {
    /**
     * Whether to enable column hiding. Defaults to `true`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#enablehiding)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    enableHiding?: boolean;
    /**
     * If provided, this function will be called with an `updaterFn` when `state.columnVisibility` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#oncolumnvisibilitychange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}
export type VisibilityDefaultOptions = Pick<VisibilityOptions, 'onColumnVisibilityChange'>;
export interface VisibilityInstance<TData extends RowData> {
    /**
     * If column pinning, returns a flat array of leaf-node columns that are visible in the unpinned/center portion of the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getcentervisibleleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getCenterVisibleLeafColumns: () => Column<TData, unknown>[];
    /**
     * Returns whether all columns are visible
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getisallcolumnsvisible)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getIsAllColumnsVisible: () => boolean;
    /**
     * Returns whether any columns are visible
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getissomecolumnsvisible)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getIsSomeColumnsVisible: () => boolean;
    /**
     * If column pinning, returns a flat array of leaf-node columns that are visible in the left portion of the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getleftvisibleleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getLeftVisibleLeafColumns: () => Column<TData, unknown>[];
    /**
     * If column pinning, returns a flat array of leaf-node columns that are visible in the right portion of the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getrightvisibleleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getRightVisibleLeafColumns: () => Column<TData, unknown>[];
    /**
     * Returns a handler for toggling the visibility of all columns, meant to be bound to a `input[type=checkbox]` element.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#gettoggleallcolumnsvisibilityhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getToggleAllColumnsVisibilityHandler: () => (event: unknown) => void;
    /**
     * Returns a flat array of columns that are visible, including parent columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getvisibleflatcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getVisibleFlatColumns: () => Column<TData, unknown>[];
    /**
     * Returns a flat array of leaf-node columns that are visible.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getvisibleleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getVisibleLeafColumns: () => Column<TData, unknown>[];
    /**
     * Resets the column visibility state to the initial state. If `defaultState` is provided, the state will be reset to `{}`
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#resetcolumnvisibility)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    resetColumnVisibility: (defaultState?: boolean) => void;
    /**
     * Sets or updates the `state.columnVisibility` state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#setcolumnvisibility)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    setColumnVisibility: (updater: Updater<VisibilityState>) => void;
    /**
     * Toggles the visibility of all columns.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#toggleallcolumnsvisible)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    toggleAllColumnsVisible: (value?: boolean) => void;
}
export interface VisibilityColumnDef {
    enableHiding?: boolean;
}
export interface VisibilityRow<TData extends RowData> {
    _getAllVisibleCells: () => Cell<TData, unknown>[];
    /**
     * Returns an array of cells that account for column visibility for the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getvisiblecells)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getVisibleCells: () => Cell<TData, unknown>[];
}
export interface VisibilityColumn {
    /**
     * Returns whether the column can be hidden
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getcanhide)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getCanHide: () => boolean;
    /**
     * Returns whether the column is visible
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#getisvisible)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getIsVisible: () => boolean;
    /**
     * Returns a function that can be used to toggle the column visibility. This function can be used to bind to an event handler to a checkbox.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#gettogglevisibilityhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    getToggleVisibilityHandler: () => (event: unknown) => void;
    /**
     * Toggles the visibility of the column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-visibility#togglevisibility)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
     */
    toggleVisibility: (value?: boolean) => void;
}
export declare const ColumnVisibility: TableFeature;
export declare function _getVisibleLeafColumns<TData extends RowData>(table: Table<TData>, position?: ColumnPinningPosition | 'center'): Column<TData, unknown>[];
