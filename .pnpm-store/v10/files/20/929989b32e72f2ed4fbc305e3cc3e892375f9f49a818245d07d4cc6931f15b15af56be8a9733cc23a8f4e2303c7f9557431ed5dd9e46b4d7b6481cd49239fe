import * as cache from './cache.js';
/** @deprecated Use `cache.Options` */
export type ResourceCacheOptions = cache.Options;
/** @deprecated Use `cache.Resource` */
export declare const ResourceCache: typeof cache.Resource;
/** @deprecated Use `cache.Resource` */
export type ResourceCache = cache.Resource<string>;
/** @deprecated Use `cache.Range` */
export type CacheRange = cache.Range;
/** @deprecated Use `cache.Options` */
export type CacheOptions = cache.Options;
/**
 * @internal
 */
export declare const resourcesCache: Map<string, cache.Resource<string> | undefined>;
export type Issue = {
    tag: 'status';
    response: Response;
} | {
    tag: 'buffer';
    response: Response;
    message: string;
} | {
    tag: 'fetch' | 'size';
    message: string;
} | Error;
/**
 * @deprecated Use `Issue`
 */
export type RequestError = Issue;
export interface Options extends cache.Options {
    /** Optionally provide a function for logging warnings */
    warn?(message: string): unknown;
}
/**
 * @deprecated Use `Options`
 */
export type RequestOptions = Options;
export interface GetOptions extends Options {
    /**
     * When using range requests,
     * a HEAD request must normally be used to determine the full size of the resource.
     * This allows that request to be skipped
     */
    size?: number;
    /** The start of the range */
    start?: number;
    /** The end of the range */
    end?: number;
}
/**
 * Make a GET request without worrying about ranges
 * @throws RequestError
 */
export declare function get(url: string, options: GetOptions, init?: RequestInit): Promise<Uint8Array>;
/**
 * @deprecated Use `get`
 */
export declare const GET: typeof get;
/**
 * Synchronously gets a cached resource
 * Assumes you pass valid start and end when using ranges
 */
export declare function getCached(url: string, options: GetOptions): {
    data?: Uint8Array;
    missing: cache.Range[];
};
interface SetOptions extends Options {
    /** The offset we are updating at */
    offset?: number;
    /** If a cache for the resource doesn't exist, this will be used as the full size */
    size?: number;
}
/**
 * Make a POST request to set (or create) data on the server and update the cache.
 * @throws RequestError
 */
export declare function set(url: string, data: Uint8Array, options: SetOptions, init?: RequestInit): Promise<void>;
/**
 * Make a DELETE request to remove the resource from the server and clear it from the cache.
 * @throws RequestError
 */
export declare function remove(url: string, options?: Options, init?: RequestInit): Promise<void>;
export {};
