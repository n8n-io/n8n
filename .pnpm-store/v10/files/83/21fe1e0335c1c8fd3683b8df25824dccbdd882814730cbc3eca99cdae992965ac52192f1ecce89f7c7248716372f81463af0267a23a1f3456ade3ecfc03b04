import { Dirent, Stats } from 'fs';
import { GlobOptions } from 'glob';
export declare const isRimrafOptions: (o: any) => o is RimrafOptions;
export declare const assertRimrafOptions: (o: any) => void;
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
export declare const optArg: (opt?: RimrafAsyncOptions) => (RimrafAsyncOptions & {
    glob: GlobOptions & {
        withFileTypes: false;
    };
}) | (RimrafAsyncOptions & {
    glob: undefined;
});
export declare const optArgSync: (opt?: RimrafSyncOptions) => (RimrafSyncOptions & {
    glob: GlobOptions & {
        withFileTypes: false;
    };
}) | (RimrafSyncOptions & {
    glob: undefined;
});
//# sourceMappingURL=opt-arg.d.ts.map