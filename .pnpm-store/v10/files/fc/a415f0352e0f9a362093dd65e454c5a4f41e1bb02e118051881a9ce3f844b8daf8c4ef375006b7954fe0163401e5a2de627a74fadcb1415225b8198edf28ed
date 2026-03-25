import type { Column } from '../interfaces/iColumn';
export interface IClipboardCopyParams {
    includeHeaders?: boolean;
    includeGroupHeaders?: boolean;
}
export interface IClipboardCopyRowsParams extends IClipboardCopyParams {
    columnKeys?: (string | Column)[];
}
export interface IClipboardService {
    pasteFromClipboard(): void;
    copyToClipboard(params?: IClipboardCopyParams): void;
    cutToClipboard(params?: IClipboardCopyParams, source?: 'api' | 'ui' | 'contextMenu'): void;
    copySelectedRowsToClipboard(params?: IClipboardCopyRowsParams): void;
    copySelectedRangeToClipboard(params?: IClipboardCopyParams): void;
    copyRangeDown(): void;
}
