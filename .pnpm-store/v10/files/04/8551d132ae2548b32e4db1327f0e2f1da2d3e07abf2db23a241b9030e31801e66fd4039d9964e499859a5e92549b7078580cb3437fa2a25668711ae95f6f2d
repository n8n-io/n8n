import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { InfiniteBlock } from './infiniteBlock';
type RowNodeBlockLoaderEvent = 'blockLoaded';
export declare class RowNodeBlockLoader extends BeanStub<RowNodeBlockLoaderEvent> implements NamedBean {
    beanName: "rowNodeBlockLoader";
    private maxConcurrentRequests;
    private checkBlockToLoadDebounce;
    private activeBlockLoadsCount;
    private blocks;
    private active;
    postConstruct(): void;
    addBlock(block: InfiniteBlock): void;
    removeBlock(block: InfiniteBlock): void;
    destroy(): void;
    private loadComplete;
    checkBlockToLoad(): void;
    private performCheckBlocksToLoad;
    getBlockState(): {
        [key: string]: any;
    };
    private printCacheStatus;
}
export {};
