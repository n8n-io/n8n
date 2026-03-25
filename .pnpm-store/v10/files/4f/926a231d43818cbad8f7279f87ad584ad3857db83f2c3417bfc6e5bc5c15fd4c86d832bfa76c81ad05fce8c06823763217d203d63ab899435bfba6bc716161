import { WeaviateObject } from '../types/index.js';
export declare class Iterator<T, V> {
    private query;
    private cache;
    private last;
    constructor(query: (limit: number, after?: string) => Promise<WeaviateObject<T, V>[]>);
    [Symbol.asyncIterator](): {
        next: () => Promise<IteratorResult<WeaviateObject<T, V>>>;
    };
}
