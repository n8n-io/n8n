import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { RowNode } from '../entities/rowNode';
import type { SortOption } from '../interfaces/iSortOption';
export interface SortedRowNode {
    currentPos: number;
    rowNode: RowNode;
}
export declare class RowNodeSorter extends BeanStub implements NamedBean {
    beanName: "rowNodeSorter";
    private isAccentedSort;
    private primaryColumnsSortGroups;
    postConstruct(): void;
    doFullSort(rowNodes: RowNode[], sortOptions: SortOption[]): RowNode[];
    compareRowNodes(sortOptions: SortOption[], sortedNodeA: SortedRowNode, sortedNodeB: SortedRowNode): number;
    private getComparator;
    private getValue;
}
