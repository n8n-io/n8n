import type { IndexData } from '../internal/file_index.js';
import { Index } from '../internal/file_index.js';
import { IndexFS } from '../internal/index_fs.js';
import type { SharedConfig } from './backend.js';
/**
 * Configuration options for FetchFS.
 * @category Backends and Configuration
 */
export interface FetchOptions extends SharedConfig {
    /**
     * Options to pass through to fetch calls
     */
    requestInit?: RequestInit;
    /**
     * URL to a file index as a JSON file or the file index object itself.
     * Defaults to `index.json`.
     */
    index?: string | IndexData;
    /**
     * Used as the URL prefix for fetched files.
     */
    baseUrl: string;
    /**
     * If true, enables writing to the remote (using post and delete)
     * @default false
     */
    remoteWrite?: boolean;
}
/**
 * A simple filesystem backed by HTTP using the `fetch` API.
 * @internal
 */
export declare class FetchFS extends IndexFS {
    protected baseUrl: string;
    protected requestInit: RequestInit;
    protected remoteWrite?: boolean | undefined;
    /**
     * @internal @hidden
     */
    _asyncDone: Promise<unknown>;
    protected _async(p: Promise<unknown>): void;
    constructor(index: Index, baseUrl: string, requestInit?: RequestInit, remoteWrite?: boolean | undefined);
    protected remove(path: string): Promise<void>;
    protected removeSync(path: string): void;
    read(path: string, buffer: Uint8Array, offset: number | undefined, end: number): Promise<void>;
    readSync(path: string, buffer: Uint8Array, offset: number | undefined, end: number): void;
    write(path: string, data: Uint8Array, offset: number): Promise<void>;
    writeSync(path: string, data: Uint8Array, offset: number): void;
}
declare const _Fetch: {
    readonly name: "Fetch";
    readonly options: {
        readonly index: {
            readonly type: readonly ["string", "object"];
            readonly required: false;
        };
        readonly baseUrl: {
            readonly type: "string";
            readonly required: true;
        };
        readonly requestInit: {
            readonly type: "object";
            readonly required: false;
        };
        readonly remoteWrite: {
            readonly type: "boolean";
            readonly required: false;
        };
    };
    readonly isAvailable: () => boolean;
    readonly create: (options: FetchOptions) => Promise<FetchFS>;
};
type _Fetch = typeof _Fetch;
export interface Fetch extends _Fetch {
}
/**
 * @category Backends and Configuration
 */
export declare const Fetch: Fetch;
export {};
