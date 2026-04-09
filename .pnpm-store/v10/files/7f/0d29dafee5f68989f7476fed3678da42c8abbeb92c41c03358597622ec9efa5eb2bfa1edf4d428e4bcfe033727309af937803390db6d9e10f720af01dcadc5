import { BaseGridSerializingSession } from '../export/baseGridSerializingSession';
import type { GridSerializingParams, RowAccumulator, RowSpanningAccumulator } from '../export/iGridSerializer';
import type { CsvCustomContent } from '../interfaces/exportParams';
interface CsvSerializingParams extends GridSerializingParams {
    suppressQuotes: boolean;
    columnSeparator: string;
}
export declare class CsvSerializingSession extends BaseGridSerializingSession<CsvCustomContent> {
    private readonly config;
    private isFirstLine;
    private result;
    private readonly suppressQuotes;
    private readonly columnSeparator;
    constructor(config: CsvSerializingParams);
    addCustomContent(content: CsvCustomContent): void;
    onNewHeaderGroupingRow(): RowSpanningAccumulator;
    private onNewHeaderGroupingRowColumn;
    private appendEmptyCells;
    onNewHeaderRow(): RowAccumulator;
    private onNewHeaderRowColumn;
    onNewBodyRow(): RowAccumulator;
    private onNewBodyRowColumn;
    private putInQuotes;
    parse(): string;
    private beginNewLine;
}
export {};
