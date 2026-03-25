import type { SearchResult } from './types';
export default class Worker {
    add: typeof add;
    done: typeof done;
    search: typeof search;
    toJS: typeof toJS;
    load: typeof load;
    dispose: typeof dispose;
    fromExternalJS: typeof fromExternalJS;
}
export declare function add<T>(title: string, description: string, meta?: T): void;
export declare function done(): Promise<void>;
export declare function toJS(): Promise<{
    store: any[];
    index: object;
}>;
export declare function fromExternalJS(path: string, exportName: string): Promise<void>;
export declare function load(state: any): Promise<void>;
export declare function dispose(): Promise<void>;
export declare function search<Meta = string>(q: string, limit?: number): Promise<Array<SearchResult<Meta>>>;
