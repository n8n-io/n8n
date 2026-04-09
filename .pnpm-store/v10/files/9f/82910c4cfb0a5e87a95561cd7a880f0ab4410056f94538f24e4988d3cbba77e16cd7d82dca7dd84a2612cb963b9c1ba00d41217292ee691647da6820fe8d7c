import type { Dir as _Dir, Dirent as _Dirent } from 'node:fs';
import type { V_Context } from '../context.js';
import type { Stats } from '../stats.js';
import type { Callback } from '../utils.js';
export declare class Dirent implements _Dirent {
    path: string;
    protected stats: Stats;
    get name(): string;
    constructor(path: string, stats: Stats);
    get parentPath(): string;
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
/**
 * A class representing a directory stream.
 */
export declare class Dir implements _Dir, AsyncIterator<Dirent> {
    readonly path: string;
    protected readonly context: V_Context;
    protected closed: boolean;
    protected checkClosed(): void;
    protected _entries?: Dirent[];
    constructor(path: string, context: V_Context);
    /**
     * Asynchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    close(): Promise<void>;
    close(cb: Callback): void;
    /**
     * Synchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    closeSync(): void;
    protected _read(): Promise<Dirent | null>;
    /**
     * Asynchronously read the next directory entry via `readdir(3)` as an `Dirent`.
     * After the read is completed, a value is returned that will be resolved with an `Dirent`, or `null` if there are no more directory entries to read.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    read(): Promise<Dirent | null>;
    read(cb: Callback<[Dirent | null]>): void;
    /**
     * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
     * If there are no more directory entries to read, null will be returned.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    readSync(): Dirent | null;
    next(): Promise<IteratorResult<Dirent>>;
    /**
     * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
     */
    [Symbol.asyncIterator](): this;
    [Symbol.asyncDispose](): Promise<void>;
}
