import { Table, Row, RowModel, RowData } from '../types';
export declare function getExpandedRowModel<TData extends RowData>(): (table: Table<TData>) => () => RowModel<TData>;
export declare function expandRows<TData extends RowData>(rowModel: RowModel<TData>): {
    rows: Row<TData>[];
    flatRows: Row<TData>[];
    rowsById: Record<string, Row<TData>>;
};
