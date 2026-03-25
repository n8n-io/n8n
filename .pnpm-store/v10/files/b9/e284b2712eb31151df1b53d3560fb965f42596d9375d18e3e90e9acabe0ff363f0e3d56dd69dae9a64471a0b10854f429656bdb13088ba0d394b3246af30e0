import { RowModel } from '..';
import { BuiltInSortingFn } from '../sortingFns';
import { OnChangeFn, Table, Row, Updater, RowData, SortingFns, TableFeature } from '../types';
export type SortDirection = 'asc' | 'desc';
export interface ColumnSort {
    desc: boolean;
    id: string;
}
export type SortingState = ColumnSort[];
export interface SortingTableState {
    sorting: SortingState;
}
export interface SortingFn<TData extends RowData> {
    (rowA: Row<TData>, rowB: Row<TData>, columnId: string): number;
}
export type CustomSortingFns<TData extends RowData> = Record<string, SortingFn<TData>>;
export type SortingFnOption<TData extends RowData> = 'auto' | keyof SortingFns | BuiltInSortingFn | SortingFn<TData>;
export interface SortingColumnDef<TData extends RowData> {
    /**
     * Enables/Disables multi-sorting for this column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablemultisort)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    enableMultiSort?: boolean;
    /**
     * Enables/Disables sorting for this column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablesorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    enableSorting?: boolean;
    /**
     * Inverts the order of the sorting for this column. This is useful for values that have an inverted best/worst scale where lower numbers are better, eg. a ranking (1st, 2nd, 3rd) or golf-like scoring
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#invertsorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    invertSorting?: boolean;
    /**
     * Set to `true` for sorting toggles on this column to start in the descending direction.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortdescfirst)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    sortDescFirst?: boolean;
    /**
     * The sorting function to use with this column.
     * - A `string` referencing a built-in sorting function
     * - A custom sorting function
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortingfn)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    sortingFn?: SortingFnOption<TData>;
    /**
     * The priority of undefined values when sorting this column.
     * - `false`
     *   - Undefined values will be considered tied and need to be sorted by the next column filter or original index (whichever applies)
     * - `-1`
     *   - Undefined values will be sorted with higher priority (ascending) (if ascending, undefined will appear on the beginning of the list)
     * - `1`
     *   - Undefined values will be sorted with lower priority (descending) (if ascending, undefined will appear on the end of the list)
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortundefined)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    sortUndefined?: false | -1 | 1 | 'first' | 'last';
}
export interface SortingColumn<TData extends RowData> {
    /**
     * Removes this column from the table's sorting state
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#clearsorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    clearSorting: () => void;
    /**
     * Returns a sort direction automatically inferred based on the columns values.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getautosortdir)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getAutoSortDir: () => SortDirection;
    /**
     * Returns a sorting function automatically inferred based on the columns values.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getautosortingfn)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getAutoSortingFn: () => SortingFn<TData>;
    /**
     * Returns whether this column can be multi-sorted.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getcanmultisort)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getCanMultiSort: () => boolean;
    /**
     * Returns whether this column can be sorted.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getcansort)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getCanSort: () => boolean;
    /**
     * Returns the first direction that should be used when sorting this column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getfirstsortdir)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getFirstSortDir: () => SortDirection;
    /**
     * Returns the current sort direction of this column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getissorted)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getIsSorted: () => false | SortDirection;
    /**
     * Returns the next sorting order.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getnextsortingorder)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getNextSortingOrder: () => SortDirection | false;
    /**
     * Returns the index position of this column's sorting within the sorting state
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortindex)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getSortIndex: () => number;
    /**
     * Returns the resolved sorting function to be used for this column
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortingfn)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getSortingFn: () => SortingFn<TData>;
    /**
     * Returns a function that can be used to toggle this column's sorting state. This is useful for attaching a click handler to the column header.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#gettogglesortinghandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getToggleSortingHandler: () => undefined | ((event: unknown) => void);
    /**
     * Toggles this columns sorting state. If `desc` is provided, it will force the sort direction to that value. If `isMulti` is provided, it will additivity multi-sort the column (or toggle it if it is already sorted).
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#togglesorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    toggleSorting: (desc?: boolean, isMulti?: boolean) => void;
}
interface SortingOptionsBase {
    /**
     * Enables/disables the ability to remove multi-sorts
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablemultiremove)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    enableMultiRemove?: boolean;
    /**
     * Enables/Disables multi-sorting for the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablemultisort)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    enableMultiSort?: boolean;
    /**
     * Enables/Disables sorting for the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablesorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    enableSorting?: boolean;
    /**
     * Enables/Disables the ability to remove sorting for the table.
     * - If `true` then changing sort order will circle like: 'none' -> 'desc' -> 'asc' -> 'none' -> ...
     * - If `false` then changing sort order will circle like: 'none' -> 'desc' -> 'asc' -> 'desc' -> 'asc' -> ...
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablesortingremoval)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    enableSortingRemoval?: boolean;
    /**
     * This function is used to retrieve the sorted row model. If using server-side sorting, this function is not required. To use client-side sorting, pass the exported `getSortedRowModel()` from your adapter to your table or implement your own.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getSortedRowModel?: (table: Table<any>) => () => RowModel<any>;
    /**
     * Pass a custom function that will be used to determine if a multi-sort event should be triggered. It is passed the event from the sort toggle handler and should return `true` if the event should trigger a multi-sort.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#ismultisortevent)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    isMultiSortEvent?: (e: unknown) => boolean;
    /**
     * Enables manual sorting for the table. If this is `true`, you will be expected to sort your data before it is passed to the table. This is useful if you are doing server-side sorting.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#manualsorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    manualSorting?: boolean;
    /**
     * Set a maximum number of columns that can be multi-sorted.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#maxmultisortcolcount)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    maxMultiSortColCount?: number;
    /**
     * If provided, this function will be called with an `updaterFn` when `state.sorting` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#onsortingchange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    onSortingChange?: OnChangeFn<SortingState>;
    /**
     * If `true`, all sorts will default to descending as their first toggle state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortdescfirst)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    sortDescFirst?: boolean;
}
type ResolvedSortingFns = keyof SortingFns extends never ? {
    sortingFns?: Record<string, SortingFn<any>>;
} : {
    sortingFns: Record<keyof SortingFns, SortingFn<any>>;
};
export interface SortingOptions<TData extends RowData> extends SortingOptionsBase, ResolvedSortingFns {
}
export interface SortingInstance<TData extends RowData> {
    _getSortedRowModel?: () => RowModel<TData>;
    /**
     * Returns the row model for the table before any sorting has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getpresortedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getPreSortedRowModel: () => RowModel<TData>;
    /**
     * Returns the row model for the table after sorting has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    getSortedRowModel: () => RowModel<TData>;
    /**
     * Resets the **sorting** state to `initialState.sorting`, or `true` can be passed to force a default blank state reset to `[]`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#resetsorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    resetSorting: (defaultState?: boolean) => void;
    /**
     * Sets or updates the `state.sorting` state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#setsorting)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
     */
    setSorting: (updater: Updater<SortingState>) => void;
}
export declare const RowSorting: TableFeature;
export {};
