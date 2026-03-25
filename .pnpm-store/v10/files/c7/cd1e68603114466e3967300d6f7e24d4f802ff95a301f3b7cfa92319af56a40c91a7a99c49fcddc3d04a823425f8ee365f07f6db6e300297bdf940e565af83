import TableInternal from './internalTable/internal-table';
import { Dictionary } from './models/common';
import { ColumnOptionsRaw, ComplexOptions } from './models/external-table';
import { RowOptionsRaw } from './utils/table-helpers';
export default class Table {
    table: TableInternal;
    constructor(options?: ComplexOptions | string[]);
    addColumn(column: string | ColumnOptionsRaw): this;
    addColumns(columns: string[] | ColumnOptionsRaw[]): this;
    addRow(text: Dictionary, rowOptions?: RowOptionsRaw): this;
    addRows(toBeInsertedRows: any, rowOptions?: RowOptionsRaw): this;
    printTable(): void;
    render(): string;
}
