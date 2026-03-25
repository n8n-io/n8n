import { OnChangeFn, Updater, Row, RowData, TableFeature } from '../types';
export type RowPinningPosition = false | 'top' | 'bottom';
export interface RowPinningState {
    bottom?: string[];
    top?: string[];
}
export interface RowPinningTableState {
    rowPinning: RowPinningState;
}
export interface RowPinningOptions<TData extends RowData> {
    /**
     * Enables/disables row pinning for the table. Defaults to `true`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#enablerowpinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    enableRowPinning?: boolean | ((row: Row<TData>) => boolean);
    /**
     * When `false`, pinned rows will not be visible if they are filtered or paginated out of the table. When `true`, pinned rows will always be visible regardless of filtering or pagination. Defaults to `true`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#keeppinnedrows)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    keepPinnedRows?: boolean;
    /**
     * If provided, this function will be called with an `updaterFn` when `state.rowPinning` changes. This overrides the default internal state management, so you will also need to supply `state.rowPinning` from your own managed state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#onrowpinningchange)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/onrowpinningchange)
     */
    onRowPinningChange?: OnChangeFn<RowPinningState>;
}
export interface RowPinningDefaultOptions {
    onRowPinningChange: OnChangeFn<RowPinningState>;
}
export interface RowPinningRow {
    /**
     * Returns whether or not the row can be pinned.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getcanpin-1)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getCanPin: () => boolean;
    /**
     * Returns the pinned position of the row. (`'top'`, `'bottom'` or `false`)
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getispinned-1)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getIsPinned: () => RowPinningPosition;
    /**
     * Returns the numeric pinned index of the row within a pinned row group.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getpinnedindex-1)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getPinnedIndex: () => number;
    /**
     * Pins a row to the `'top'` or `'bottom'`, or unpins the row to the center if `false` is passed.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#pin-1)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    pin: (position: RowPinningPosition, includeLeafRows?: boolean, includeParentRows?: boolean) => void;
}
export interface RowPinningInstance<TData extends RowData> {
    _getPinnedRows: (visiblePinnedRows: Array<Row<TData>>, pinnedRowIds: Array<string> | undefined, position: 'top' | 'bottom') => Row<TData>[];
    /**
     * Returns all bottom pinned rows.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getbottomrows)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getBottomRows: () => Row<TData>[];
    /**
     * Returns all rows that are not pinned to the top or bottom.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getcenterrows)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getCenterRows: () => Row<TData>[];
    /**
     * Returns whether or not any rows are pinned. Optionally specify to only check for pinned rows in either the `top` or `bottom` position.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getissomerowspinned)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getIsSomeRowsPinned: (position?: RowPinningPosition) => boolean;
    /**
     * Returns all top pinned rows.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#gettoprows)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    getTopRows: () => Row<TData>[];
    /**
     * Resets the **rowPinning** state to `initialState.rowPinning`, or `true` can be passed to force a default blank state reset to `{ top: [], bottom: [], }`.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#resetrowpinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    resetRowPinning: (defaultState?: boolean) => void;
    /**
     * Sets or updates the `state.rowPinning` state.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#setrowpinning)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
     */
    setRowPinning: (updater: Updater<RowPinningState>) => void;
}
export declare const RowPinning: TableFeature;
