import { LRUCache } from 'lru-cache';
import { Config, Cache, Store } from '../caching';
type LRU = LRUCache<string, any, unknown>;
type Pre = LRUCache.OptionsTTLLimit<string, any, unknown>;
type Options = Omit<Pre, 'ttlAutopurge'> & Partial<Pick<Pre, 'ttlAutopurge'>>;
export type MemoryConfig = {
    max?: number;
    sizeCalculation?: (value: unknown, key: string) => number;
    shouldCloneBeforeSet?: boolean;
} & Options & Config;
export type MemoryStore = Store & {
    get size(): number;
    dump: LRU['dump'];
    load: LRU['load'];
    calculatedSize: LRU['calculatedSize'];
};
export type MemoryCache = Cache<MemoryStore>;
/**
 * Wrapper for lru-cache.
 */
export declare function memoryStore(args?: MemoryConfig): MemoryStore;
export {};
