import type { FileSystem } from '../internal/filesystem.js';
import type { _SyncFSKeys, AsyncFSMethods, Mixin } from './shared.js';
/**
 * @internal
 * @category Internals
 */
export type AsyncOperation = {
    [K in keyof AsyncFSMethods]: [K, ...Parameters<FileSystem[K]>];
}[keyof AsyncFSMethods];
/**
 * @internal
 * @category Internals
 */
export interface AsyncMixin extends Pick<FileSystem, Exclude<_SyncFSKeys, 'existsSync'>> {
    /**
     * @internal @protected
     */
    _sync?: FileSystem;
    queueDone(): Promise<void>;
    ready(): Promise<void>;
}
/**
 * Async() implements synchronous methods on an asynchronous file system
 *
 * Implementing classes must define `_sync` for the synchronous file system used as a cache.
 *
 * Synchronous methods on an asynchronous FS are implemented by performing operations over the in-memory copy,
 * while asynchronously pipelining them to the backing store.
 * During loading, the contents of the async file system are preloaded into the synchronous store.
 * @category Internals
 */
export declare function Async<const T extends abstract new (...args: any[]) => FileSystem>(FS: T): Mixin<T, AsyncMixin>;
