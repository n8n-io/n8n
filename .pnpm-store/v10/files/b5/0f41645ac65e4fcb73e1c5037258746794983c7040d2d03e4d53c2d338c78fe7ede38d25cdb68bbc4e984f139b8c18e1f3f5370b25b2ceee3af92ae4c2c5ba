import { Column, Table, AccessorFn, ColumnDef, RowData } from '../types';
export interface CoreColumn<TData extends RowData, TValue> {
    /**
     * The resolved accessor function to use when extracting the value for the column from each row. Will only be defined if the column def has a valid accessor key or function defined.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#accessorfn)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    accessorFn?: AccessorFn<TData, TValue>;
    /**
     * The original column def used to create the column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#columndef)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    columnDef: ColumnDef<TData, TValue>;
    /**
     * The child column (if the column is a group column). Will be an empty array if the column is not a group column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#columns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    columns: Column<TData, TValue>[];
    /**
     * The depth of the column (if grouped) relative to the root column def array.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#depth)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    depth: number;
    /**
     * Returns the flattened array of this column and all child/grand-child columns for this column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#getflatcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    getFlatColumns: () => Column<TData, TValue>[];
    /**
     * Returns an array of all leaf-node columns for this column. If a column has no children, it is considered the only leaf-node column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#getleafcolumns)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    getLeafColumns: () => Column<TData, TValue>[];
    /**
     * The resolved unique identifier for the column resolved in this priority:
        - A manual `id` property from the column def
        - The accessor key from the column def
        - The header string from the column def
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#id)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    id: string;
    /**
     * The parent column for this column. Will be undefined if this is a root column.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#parent)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
     */
    parent?: Column<TData, TValue>;
}
export declare function createColumn<TData extends RowData, TValue>(table: Table<TData>, columnDef: ColumnDef<TData, TValue>, depth: number, parent?: Column<TData, TValue>): Column<TData, TValue>;
