import type { FileSystem } from '../internal/filesystem.js';
import type { AsyncFSMethods, Mixin } from './shared.js';
/**
 * Implements the asynchronous API in terms of the synchronous API.
 * @category Internals
 */
export declare function Sync<T extends abstract new (...args: any[]) => FileSystem>(FS: T): Mixin<T, AsyncFSMethods>;
