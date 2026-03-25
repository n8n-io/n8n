import { RowData, Cell, Column, Row, Table } from '../types';
import { Getter } from '../utils';
export interface CellContext<TData extends RowData, TValue> {
    cell: Cell<TData, TValue>;
    column: Column<TData, TValue>;
    getValue: Getter<TValue>;
    renderValue: Getter<TValue | null>;
    row: Row<TData>;
    table: Table<TData>;
}
export interface CoreCell<TData extends RowData, TValue> {
    /**
     * The associated Column object for the cell.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/cell#column)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/cells)
     */
    column: Column<TData, TValue>;
    /**
     * Returns the rendering context (or props) for cell-based components like cells and aggregated cells. Use these props with your framework's `flexRender` utility to render these using the template of your choice:
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/cell#getcontext)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/cells)
     */
    getContext: () => CellContext<TData, TValue>;
    /**
     * Returns the value for the cell, accessed via the associated column's accessor key or accessor function.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/cell#getvalue)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/cells)
     */
    getValue: CellContext<TData, TValue>['getValue'];
    /**
     * The unique ID for the cell across the entire table.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/cell#id)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/cells)
     */
    id: string;
    /**
     * Renders the value for a cell the same as `getValue`, but will return the `renderFallbackValue` if no value is found.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/cell#rendervalue)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/cells)
     */
    renderValue: CellContext<TData, TValue>['renderValue'];
    /**
     * The associated Row object for the cell.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/cell#row)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/cells)
     */
    row: Row<TData>;
}
export declare function createCell<TData extends RowData, TValue>(table: Table<TData>, row: Row<TData>, column: Column<TData, TValue>, columnId: string): Cell<TData, TValue>;
