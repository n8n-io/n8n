import type { ColumnModel } from '../columns/columnModel';
import type { AgColumn } from '../entities/agColumn';
import type { RowNode } from '../entities/rowNode';
import type { GridOptionsService } from '../gridOptionsService';
import type { ProcessCellForExportParams, ProcessGroupHeaderForExportParams, ProcessHeaderForExportParams, ProcessRowGroupForExportParams } from '../interfaces/exportParams';
import type { IColsService } from '../interfaces/iColsService';
import type { ValueService } from '../valueService/valueService';
import type { RowAccumulator, RowSpanningAccumulator } from './iGridSerializer';
import type { GridSerializingParams, GridSerializingSession } from './iGridSerializer';
export declare abstract class BaseGridSerializingSession<T> implements GridSerializingSession<T> {
    colModel: ColumnModel;
    private colNames;
    rowGroupColsSvc?: IColsService;
    valueSvc: ValueService;
    gos: GridOptionsService;
    processCellCallback?: (params: ProcessCellForExportParams) => string;
    processHeaderCallback?: (params: ProcessHeaderForExportParams) => string;
    processGroupHeaderCallback?: (params: ProcessGroupHeaderForExportParams) => string;
    processRowGroupCallback?: (params: ProcessRowGroupForExportParams) => string;
    constructor(config: GridSerializingParams);
    abstract addCustomContent(customContent: T): void;
    abstract onNewHeaderGroupingRow(): RowSpanningAccumulator;
    abstract onNewHeaderRow(): RowAccumulator;
    abstract onNewBodyRow(node?: RowNode): RowAccumulator;
    abstract parse(): string;
    prepare(_columnsToExport: AgColumn[]): void;
    extractHeaderValue(column: AgColumn): string;
    extractRowCellValue(column: AgColumn, currentColumnIndex: number, accumulatedRowIndex: number, type: string, node: RowNode): {
        value: any;
        valueFormatted?: string | null;
    };
    private getHeaderName;
}
