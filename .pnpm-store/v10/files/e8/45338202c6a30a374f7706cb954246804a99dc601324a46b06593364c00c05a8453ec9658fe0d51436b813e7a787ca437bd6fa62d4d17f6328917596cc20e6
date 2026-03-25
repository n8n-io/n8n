import { OnChangeFn, Table, Row, RowModel, Updater, RowData, TableFeature } from '../types';
export type RowSelectionState = Record<string, boolean>;
export interface RowSelectionTableState {
    rowSelection: RowSelectionState;
}
export interface RowSelectionOptions<TData extends RowData> {
    /**
     * - Enables/disables multiple row selection for all rows in the table OR
     * - A function that given a row, returns whether to enable/disable multiple row selection for that row's children/grandchildren
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#enablemultirowselection)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    enableMultiRowSelection?: boolean | ((row: Row<TData>) => boolean);
    /**
     * - Enables/disables row selection for all rows in the table OR
     * - A function that given a row, returns whether to enable/disable row selection for that row
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#enablerowselection)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
    /**
     * Enables/disables automatic sub-row selection when a parent row is selected, or a function that enables/disables automatic sub-row selection for each row.
     * (Use in combination with expanding or grouping features)
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#enablesubrowselection)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    enableSubRowSelection?: boolean | ((row: Row<TData>) => boolean);
    /**
     * If provided, this function will be called with an `updaterFn` when `state.rowSelection` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#onrowselectionchange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}
export interface RowSelectionRow {
    /**
     * Returns whether or not the row can multi-select.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getcanmultiselect)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getCanMultiSelect: () => boolean;
    /**
     * Returns whether or not the row can be selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getcanselect)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getCanSelect: () => boolean;
    /**
     * Returns whether or not the row can select sub rows automatically when the parent row is selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getcanselectsubrows)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getCanSelectSubRows: () => boolean;
    /**
     * Returns whether or not all of the row's sub rows are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisallsubrowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsAllSubRowsSelected: () => boolean;
    /**
     * Returns whether or not the row is selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsSelected: () => boolean;
    /**
     * Returns whether or not some of the row's sub rows are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getissomeselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsSomeSelected: () => boolean;
    /**
     * Returns a handler that can be used to toggle the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#gettoggleselectedhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getToggleSelectedHandler: () => (event: unknown) => void;
    /**
     * Selects/deselects the row.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#toggleselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    toggleSelected: (value?: boolean, opts?: {
        selectChildren?: boolean;
    }) => void;
}
export interface RowSelectionInstance<TData extends RowData> {
    /**
     * Returns the row model of all rows that are selected after filtering has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getfilteredselectedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getFilteredSelectedRowModel: () => RowModel<TData>;
    /**
     * Returns the row model of all rows that are selected after grouping has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getgroupedselectedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getGroupedSelectedRowModel: () => RowModel<TData>;
    /**
     * Returns whether or not all rows on the current page are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisallpagerowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsAllPageRowsSelected: () => boolean;
    /**
     * Returns whether or not all rows in the table are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getisallrowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsAllRowsSelected: () => boolean;
    /**
     * Returns whether or not any rows on the current page are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getissomepagerowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsSomePageRowsSelected: () => boolean;
    /**
     * Returns whether or not any rows in the table are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getissomerowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getIsSomeRowsSelected: () => boolean;
    /**
     * Returns the core row model of all rows before row selection has been applied.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getpreselectedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getPreSelectedRowModel: () => RowModel<TData>;
    /**
     * Returns the row model of all rows that are selected.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#getselectedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getSelectedRowModel: () => RowModel<TData>;
    /**
     * Returns a handler that can be used to toggle all rows on the current page.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#gettoggleallpagerowsselectedhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getToggleAllPageRowsSelectedHandler: () => (event: unknown) => void;
    /**
     * Returns a handler that can be used to toggle all rows in the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#gettoggleallrowsselectedhandler)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    getToggleAllRowsSelectedHandler: () => (event: unknown) => void;
    /**
     * Resets the **rowSelection** state to the `initialState.rowSelection`, or `true` can be passed to force a default blank state reset to `{}`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#resetrowselection)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    resetRowSelection: (defaultState?: boolean) => void;
    /**
     * Sets or updates the `state.rowSelection` state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#setrowselection)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    setRowSelection: (updater: Updater<RowSelectionState>) => void;
    /**
     * Selects/deselects all rows on the current page.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#toggleallpagerowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    toggleAllPageRowsSelected: (value?: boolean) => void;
    /**
     * Selects/deselects all rows in the table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-selection#toggleallrowsselected)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
     */
    toggleAllRowsSelected: (value?: boolean) => void;
}
export declare const RowSelection: TableFeature;
export declare function selectRowsFn<TData extends RowData>(table: Table<TData>, rowModel: RowModel<TData>): RowModel<TData>;
export declare function isRowSelected<TData extends RowData>(row: Row<TData>, selection: Record<string, boolean>): boolean;
export declare function isSubRowSelected<TData extends RowData>(row: Row<TData>, selection: Record<string, boolean>, table: Table<TData>): boolean | 'some' | 'all';
