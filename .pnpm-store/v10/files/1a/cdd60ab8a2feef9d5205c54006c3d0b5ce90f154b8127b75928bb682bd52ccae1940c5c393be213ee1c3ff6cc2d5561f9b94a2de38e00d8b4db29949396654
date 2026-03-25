import { BeanStub } from '../context/beanStub';
import type { RowNode } from '../entities/rowNode';
import type { IDatasource } from '../interfaces/iDatasource';
import type { SortModelItem } from '../interfaces/iSortModelItem';
import { InfiniteBlock } from './infiniteBlock';
import type { RowNodeBlockLoader } from './rowNodeBlockLoader';
export interface InfiniteCacheParams {
    datasource: IDatasource;
    initialRowCount: number;
    blockSize?: number;
    overflowSize: number;
    sortModel: SortModelItem[];
    filterModel: any;
    maxBlocksInCache?: number;
    rowHeight: number;
    lastAccessedSequence: {
        value: number;
    };
    rowNodeBlockLoader?: RowNodeBlockLoader;
    dynamicRowHeight: boolean;
}
export declare class InfiniteCache extends BeanStub {
    private readonly params;
    private rowCount;
    private lastRowIndexKnown;
    private blocks;
    private blockCount;
    constructor(params: InfiniteCacheParams);
    getRow(rowIndex: number, dontCreatePage?: boolean): RowNode | undefined;
    private createBlock;
    refreshCache(): void;
    destroy(): void;
    getRowCount(): number;
    isLastRowIndexKnown(): boolean;
    pageLoaded(block: InfiniteBlock, lastRow?: number): void;
    private purgeBlocksIfNeeded;
    private isBlockFocused;
    private isBlockCurrentlyDisplayed;
    private removeBlockFromCache;
    private checkRowCount;
    setRowCount(rowCount: number, lastRowIndexKnown?: boolean): void;
    forEachNodeDeep(callback: (rowNode: RowNode, index: number) => void): void;
    getBlocksInOrder(): InfiniteBlock[];
    private destroyBlock;
    private onCacheUpdated;
    private destroyAllBlocksPastVirtualRowCount;
    purgeCache(): void;
    getRowNodesInRange(firstInRange: RowNode, lastInRange: RowNode): RowNode[];
}
