import type { RowNode } from '../entities/rowNode';
import type { Column } from './iColumn';
import type { IRowNode } from './iRowNode';
export interface IFooterService {
    addTotalRows(startIndex: number, node: RowNode, callback: (node: RowNode, index: number) => void, includeFooterNodes: boolean, isRootNode: boolean, position: 'top' | 'bottom'): number;
    getTopDisplayIndex(rowsToDisplay: RowNode[], topLevelIndex: number, childrenAfterSort: RowNode[], getDefaultIndex: (adjustedIndex: number) => number): number;
    getTotalValue(value: any): string;
    doesCellShowTotalPrefix(node: IRowNode, col?: Column): boolean;
    applyTotalPrefix(value: any, formattedValue: string | null, node: IRowNode, col: Column): string;
}
