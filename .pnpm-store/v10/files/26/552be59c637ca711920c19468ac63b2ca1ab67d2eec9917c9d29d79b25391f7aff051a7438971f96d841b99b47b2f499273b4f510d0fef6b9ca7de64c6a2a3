import { BulkWriterSchema } from './Types';
export declare class ColumnBuffer {
    private schema;
    private columns;
    private _dynamicRows;
    private _rowCount;
    private activeFields;
    private fieldNames;
    private fieldDataTypes;
    constructor(schema: BulkWriterSchema);
    get rowCount(): number;
    get dynamicRows(): Record<string, any>[];
    getColumn(name: string): any[];
    getColumns(): Map<string, any[]>;
    getRow(index: number): Record<string, any>;
    append(row: Record<string, any>): number;
    private estimateFieldSize;
}
