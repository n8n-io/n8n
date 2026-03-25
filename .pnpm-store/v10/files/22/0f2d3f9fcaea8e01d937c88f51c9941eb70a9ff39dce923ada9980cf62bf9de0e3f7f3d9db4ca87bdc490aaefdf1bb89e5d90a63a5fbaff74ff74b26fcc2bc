import type { IMenuItem } from './types';
import type { OperationModel } from './models';
import Worker from './SearchWorker.worker';
export declare class SearchStore<T> {
    searchWorker: Worker;
    indexItems(groups: Array<IMenuItem | OperationModel>): void;
    add(title: string, body: string, meta?: T): void;
    dispose(): void;
    search(q: string): Promise<import("./types").SearchResult<T>[]>;
    toJS(): Promise<{
        store: any[];
        index: object;
    }>;
    load(state: any): void;
    fromExternalJS(path?: string, exportName?: string): void;
}
