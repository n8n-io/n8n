import type { AgColumn } from '../entities/agColumn';
import type { IRowNode } from './iRowNode';
export interface IShowRowGroupColsValueService {
    getGroupValue(node: IRowNode, column?: AgColumn): {
        displayedNode: IRowNode;
        value: any;
    } | null;
    formatAndPrefixGroupColValue(groupValue: {
        displayedNode: IRowNode;
        value: any;
    }, column?: AgColumn, exporting?: boolean): string | null;
    getDisplayedNode(node: IRowNode, column: AgColumn, onlyHideOpenParents?: boolean): IRowNode | undefined;
}
