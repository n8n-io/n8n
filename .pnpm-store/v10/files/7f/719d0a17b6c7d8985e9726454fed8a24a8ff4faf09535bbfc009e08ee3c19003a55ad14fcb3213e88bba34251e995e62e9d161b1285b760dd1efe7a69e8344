/// <reference types="node" />
import { GlobOptions } from 'glob';
export interface RimrafAsyncOptions {
    preserveRoot?: boolean;
    tmp?: string;
    maxRetries?: number;
    retryDelay?: number;
    backoff?: number;
    maxBackoff?: number;
    signal?: AbortSignal;
    glob?: boolean | GlobOptions;
    filter?: ((path: string, ent: Dirent | Stats) => boolean) | ((path: string, ent: Dirent | Stats) => Promise<boolean>);
}
export interface RimrafSyncOptions extends RimrafAsyncOptions {
    filter?: (path: string, ent: Dirent | Stats) => boolean;
}
export type RimrafOptions = RimrafSyncOptions | RimrafAsyncOptions;
export declare const isRimrafOptions: (o: any) => o is RimrafOptions;
export declare const assertRimrafOptions: (o: any) => void;
import { Dirent, Stats } from 'fs';
export declare const nativeSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const native: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
    sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
};
export declare const manualSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const manual: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
    sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
};
export declare const windowsSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const windows: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
    sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
};
export declare const posixSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const posix: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
    sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
};
export declare const moveRemoveSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const moveRemove: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
    sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
};
export declare const rimrafSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
export declare const rimraf: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
    rimraf: (path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>;
    sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    rimrafSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    manual: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
        sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    };
    manualSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    native: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
        sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    };
    nativeSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    posix: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
        sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    };
    posixSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    windows: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
        sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    };
    windowsSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    moveRemove: ((path: string | string[], opt?: RimrafAsyncOptions) => Promise<boolean>) & {
        sync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
    };
    moveRemoveSync: (path: string | string[], opt?: RimrafSyncOptions) => boolean;
};
//# sourceMappingURL=index.d.ts.map