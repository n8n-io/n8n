import type { ColumnModel } from '../columns/columnModel';
import type { ColumnNameService } from '../columns/columnNameService';
import type { AgColumn } from '../entities/agColumn';
import type { RowNode } from '../entities/rowNode';
import type { GridOptionsService } from '../gridOptionsService';
import type { ProcessCellForExportParams, ProcessGroupHeaderForExportParams, ProcessHeaderForExportParams, ProcessRowGroupForExportParams } from '../interfaces/exportParams';
import type { IColsService } from '../interfaces/iColsService';
import type { ColumnGroup } from '../interfaces/iColumn';
import type { ValueService } from '../valueService/valueService';
export interface RowAccumulator {
    onColumn(column: AgColumn, index: number, node?: RowNode): void;
}
export interface RowSpanningAccumulator {
    onColumn(columnGroup: ColumnGroup, header: string, index: number, span: number, collapsibleGroupRanges: number[][]): void;
}
export interface GridSerializingParams {
    colModel: ColumnModel;
    rowGroupColsSvc?: IColsService;
    colNames: ColumnNameService;
    valueSvc: ValueService;
    gos: GridOptionsService;
    processCellCallback?: (params: ProcessCellForExportParams) => string;
    processHeaderCallback?: (params: ProcessHeaderForExportParams) => string;
    processGroupHeaderCallback?: (params: ProcessGroupHeaderForExportParams) => string;
    processRowGroupCallback?: (params: ProcessRowGroupForExportParams) => string;
}
export interface GridSerializingSession<T> {
    prepare(columnsToExport: AgColumn[]): void;
    onNewHeaderGroupingRow(): RowSpanningAccumulator;
    onNewHeaderRow(): RowAccumulator;
    onNewBodyRow(node?: RowNode): RowAccumulator;
    addCustomContent(customContent: T): void;
    /**
     * FINAL RESULT
     */
    parse(): string;
}
