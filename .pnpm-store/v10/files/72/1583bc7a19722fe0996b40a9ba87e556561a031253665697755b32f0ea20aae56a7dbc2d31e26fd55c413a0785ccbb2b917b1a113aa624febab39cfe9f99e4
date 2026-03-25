import { BeanStub } from '../context/beanStub';
import { RowNode } from '../entities/rowNode';
import type { InfiniteCache, InfiniteCacheParams } from './infiniteCache';
type RowNodeBlockState = 'needsLoading' | 'loading' | 'loaded' | 'failed';
type RowNodeBlockEvent = 'loadComplete';
export declare class InfiniteBlock extends BeanStub<RowNodeBlockEvent> {
    readonly id: number;
    private readonly parentCache;
    private readonly params;
    state: RowNodeBlockState;
    version: number;
    readonly startRow: number;
    readonly endRow: number;
    lastAccessed: number;
    rowNodes: RowNode[];
    constructor(id: number, parentCache: InfiniteCache, params: InfiniteCacheParams);
    load(): void;
    setStateWaitingToLoad(): void;
    private pageLoadFailed;
    private pageLoaded;
    private isRequestMostRecentAndLive;
    private successCommon;
    postConstruct(): void;
    getBlockStateJson(): {
        id: string;
        state: any;
    };
    private setDataAndId;
    private loadFromDatasource;
    private createLoadParams;
    forEachNode(callback: (rowNode: RowNode, index: number) => void, sequence: {
        value: number;
    }, rowCount: number): void;
    getRow(rowIndex: number, dontTouchLastAccessed?: boolean): RowNode;
    private processServerResult;
    destroy(): void;
}
export {};
