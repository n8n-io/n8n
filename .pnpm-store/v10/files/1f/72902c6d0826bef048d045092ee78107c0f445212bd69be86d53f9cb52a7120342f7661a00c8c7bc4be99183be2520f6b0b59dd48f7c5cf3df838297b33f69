import type { UsageInfo } from '../internal/filesystem.js';
import { StoreFS } from './store/fs.js';
import { SyncMapTransaction, type SyncMapStore } from './store/map.js';
/**
 * A simple in-memory store
 * @category Stores and Transactions
 */
export declare class InMemoryStore extends Map<number, Uint8Array> implements SyncMapStore {
    readonly maxSize: number;
    readonly label?: string | undefined;
    readonly flags: readonly [];
    readonly name = "tmpfs";
    constructor(maxSize?: number, label?: string | undefined);
    sync(): Promise<void>;
    transaction(): SyncMapTransaction;
    get bytes(): number;
    usage(): UsageInfo;
}
/**
 * Options for an in-memory backend
 * @category Backends and Configuration
 */
export interface InMemoryOptions {
    /** The maximum size of the store. Defaults to 4 GiB */
    maxSize?: number;
    /** The label to use for the store and file system */
    label?: string;
    /** @deprecated use `label` */
    name?: string;
}
declare const _InMemory: {
    readonly name: "InMemory";
    readonly options: {
        readonly maxSize: {
            readonly type: "number";
            readonly required: false;
        };
        readonly label: {
            readonly type: "string";
            readonly required: false;
        };
        readonly name: {
            readonly type: "string";
            readonly required: false;
        };
    };
    readonly create: ({ maxSize, label, name }: InMemoryOptions) => StoreFS<InMemoryStore>;
};
type _InMemory = typeof _InMemory;
export interface InMemory extends _InMemory {
}
/**
 * A simple in-memory file system backed by an InMemoryStore.
 * Files are not persisted across page loads.
 * @category Backends and Configuration
 */
export declare const InMemory: InMemory;
export {};
