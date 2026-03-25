import { RowModel } from '..';
import { OnChangeFn, Table, Row, Updater, RowData, TableFeature } from '../types';
export type ExpandedStateList = Record<string, boolean>;
export type ExpandedState = true | Record<string, boolean>;
export interface ExpandedTableState {
    expanded: ExpandedState;
}
export interface ExpandedRow {
    /**
     * Returns whether the row can be expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getcanexpand)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getCanExpand: () => boolean;
    /**
     * Returns whether all parent rows of the row are expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getisallparentsexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getIsAllParentsExpanded: () => boolean;
    /**
     * Returns whether the row is expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getisexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getIsExpanded: () => boolean;
    /**
     * Returns a function that can be used to toggle the expanded state of the row. This function can be used to bind to an event handler to a button.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#gettoggleexpandedhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getToggleExpandedHandler: () => () => void;
    /**
     * Toggles the expanded state (or sets it if `expanded` is provided) for the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#toggleexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    toggleExpanded: (expanded?: boolean) => void;
}
export interface ExpandedOptions<TData extends RowData> {
    /**
     * Enable this setting to automatically reset the expanded state of the table when expanding state changes.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#autoresetexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    autoResetExpanded?: boolean;
    /**
     * Enable/disable expanding for all rows.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#enableexpanding)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    enableExpanding?: boolean;
    /**
     * This function is responsible for returning the expanded row model. If this function is not provided, the table will not expand rows. You can use the default exported `getExpandedRowModel` function to get the expanded row model or implement your own.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getexpandedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getExpandedRowModel?: (table: Table<any>) => () => RowModel<any>;
    /**
     * If provided, allows you to override the default behavior of determining whether a row is currently expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getisrowexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getIsRowExpanded?: (row: Row<TData>) => boolean;
    /**
     * If provided, allows you to override the default behavior of determining whether a row can be expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getrowcanexpand)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getRowCanExpand?: (row: Row<TData>) => boolean;
    /**
     * Enables manual row expansion. If this is set to `true`, `getExpandedRowModel` will not be used to expand rows and you would be expected to perform the expansion in your own data model. This is useful if you are doing server-side expansion.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#manualexpanding)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    manualExpanding?: boolean;
    /**
     * This function is called when the `expanded` table state changes. If a function is provided, you will be responsible for managing this state on your own. To pass the managed state back to the table, use the `tableOptions.state.expanded` option.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#onexpandedchange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    onExpandedChange?: OnChangeFn<ExpandedState>;
    /**
     * If `true` expanded rows will be paginated along with the rest of the table (which means expanded rows may span multiple pages). If `false` expanded rows will not be considered for pagination (which means expanded rows will always render on their parents page. This also means more rows will be rendered than the set page size)
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#paginateexpandedrows)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    paginateExpandedRows?: boolean;
}
export interface ExpandedInstance<TData extends RowData> {
    _autoResetExpanded: () => void;
    _getExpandedRowModel?: () => RowModel<TData>;
    /**
     * Returns whether there are any rows that can be expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getcansomerowsexpand)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getCanSomeRowsExpand: () => boolean;
    /**
     * Returns the maximum depth of the expanded rows.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getexpandeddepth)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getExpandedDepth: () => number;
    /**
     * Returns the row model after expansion has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getexpandedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getExpandedRowModel: () => RowModel<TData>;
    /**
     * Returns whether all rows are currently expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getisallrowsexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getIsAllRowsExpanded: () => boolean;
    /**
     * Returns whether there are any rows that are currently expanded.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getissomerowsexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getIsSomeRowsExpanded: () => boolean;
    /**
     * Returns the row model before expansion has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#getpreexpandedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getPreExpandedRowModel: () => RowModel<TData>;
    /**
     * Returns a handler that can be used to toggle the expanded state of all rows. This handler is meant to be used with an `input[type=checkbox]` element.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#gettoggleallrowsexpandedhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    getToggleAllRowsExpandedHandler: () => (event: unknown) => void;
    /**
     * Resets the expanded state of the table to the initial state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#resetexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    resetExpanded: (defaultState?: boolean) => void;
    /**
     * Updates the expanded state of the table via an update function or value.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#setexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    setExpanded: (updater: Updater<ExpandedState>) => void;
    /**
     * Toggles the expanded state for all rows.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/expanding#toggleallrowsexpanded)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/expanding)
     */
    toggleAllRowsExpanded: (expanded?: boolean) => void;
}
export declare const RowExpanding: TableFeature;
