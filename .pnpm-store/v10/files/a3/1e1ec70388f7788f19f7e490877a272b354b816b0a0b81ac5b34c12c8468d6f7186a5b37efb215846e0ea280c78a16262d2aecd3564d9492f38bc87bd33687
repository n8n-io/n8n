import type { File } from '../internal/file.js';
import type { CreationOptions, StreamOptions, UsageInfo } from '../internal/filesystem.js';
import type { InodeLike } from '../internal/inode.js';
import type { Stats } from '../stats.js';
import { FileSystem } from '../internal/filesystem.js';
import { EventEmitter } from 'eventemitter3';
import { type MountConfiguration } from '../config.js';
/**
 * Configuration options for CoW.
 * @category Backends and Configuration
 */
export interface CopyOnWriteOptions {
    /** The file system that initially populates this file system. */
    readable: MountConfiguration<any>;
    /** The file system to write modified files to. */
    writable: MountConfiguration<any>;
    /** @see {@link Journal} */
    journal?: Journal;
}
/**
 *  @hidden @deprecated use `CopyOnWriteOptions`
 */
export type OverlayOptions = CopyOnWriteOptions;
declare const journalOperations: readonly ["delete"];
/**
 * @internal
 */
export type JournalOperation = (typeof journalOperations)[number];
/**
 * @internal
 */
export interface JournalEntry {
    path: string;
    op: JournalOperation;
}
/**
 * Tracks various operations for the CoW backend
 * @internal
 */
export declare class Journal extends EventEmitter<{
    update: [op: JournalOperation, path: string];
    delete: [path: string];
}> {
    protected entries: JournalEntry[];
    toString(): string;
    /**
     * Parse a journal from a string
     */
    fromString(value: string): this;
    add(op: JournalOperation, path: string): void;
    has(op: JournalOperation, path: string): boolean;
    isDeleted(path: string): boolean;
}
/**
 * Using a readable file system as a base, writes are done to a writable file system.
 * @internal
 */
export declare class CopyOnWriteFS extends FileSystem {
    /** The file system that initially populates this file system. */
    readonly readable: FileSystem;
    /** The file system to write modified files to. */
    readonly writable: FileSystem;
    /** The journal to use for persisting deletions */
    readonly journal: Journal;
    ready(): Promise<void>;
    constructor(
    /** The file system that initially populates this file system. */
    readable: FileSystem, 
    /** The file system to write modified files to. */
    writable: FileSystem, 
    /** The journal to use for persisting deletions */
    journal?: Journal);
    isDeleted(path: string): boolean;
    /**
     * @todo Consider trying to track information on the writable as well
     */
    usage(): UsageInfo;
    sync(path: string, data: Uint8Array, stats: Readonly<InodeLike>): Promise<void>;
    syncSync(path: string, data: Uint8Array, stats: Readonly<InodeLike>): void;
    read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void>;
    readSync(path: string, buffer: Uint8Array, offset: number, end: number): void;
    write(path: string, buffer: Uint8Array, offset: number): Promise<void>;
    writeSync(path: string, buffer: Uint8Array, offset: number): void;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
    stat(path: string): Promise<Stats>;
    statSync(path: string): Stats;
    openFile(path: string, flag: string): Promise<File>;
    openFileSync(path: string, flag: string): File;
    createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    createFileSync(path: string, flag: string, mode: number, options: CreationOptions): File;
    link(srcpath: string, dstpath: string): Promise<void>;
    linkSync(srcpath: string, dstpath: string): void;
    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;
    rmdir(path: string): Promise<void>;
    rmdirSync(path: string): void;
    mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    mkdirSync(path: string, mode: number, options: CreationOptions): void;
    readdir(path: string): Promise<string[]>;
    readdirSync(path: string): string[];
    streamRead(path: string, options: StreamOptions): ReadableStream;
    streamWrite(path: string, options: StreamOptions): WritableStream;
    /**
     * Create the needed parent directories on the writable storage should they not exist.
     * Use modes from the read-only storage.
     */
    private createParentDirectoriesSync;
    /**
     * Create the needed parent directories on the writable storage should they not exist.
     * Use modes from the read-only storage.
     */
    private createParentDirectories;
    /**
     * Helper function:
     * - Ensures p is on writable before proceeding. Throws an error if it doesn't exist.
     * - Calls f to perform operation on writable.
     */
    private copyForWriteSync;
    private copyForWrite;
    /**
     * Copy from readable to writable storage.
     * PRECONDITION: File does not exist on writable storage.
     */
    private copyToWritableSync;
    private copyToWritable;
}
/**
 * @hidden @deprecated use `CopyOnWriteFS`
 */
export declare class OverlayFS extends CopyOnWriteFS {
}
declare const _CopyOnWrite: {
    readonly name: "CopyOnWrite";
    readonly options: {
        readonly writable: {
            readonly type: "object";
            readonly required: true;
        };
        readonly readable: {
            readonly type: "object";
            readonly required: true;
        };
        readonly journal: {
            readonly type: "object";
            readonly required: false;
        };
    };
    readonly create: (options: CopyOnWriteOptions) => Promise<CopyOnWriteFS>;
};
type _CopyOnWrite = typeof _CopyOnWrite;
export interface CopyOnWrite extends _CopyOnWrite {
}
/**
 * Overlay makes a read-only filesystem writable by storing writes on a second, writable file system.
 * Deletes are persisted via metadata stored on the writable file system.
 * @category Backends and Configuration
 * @internal
 */
export declare const CopyOnWrite: CopyOnWrite;
export interface Overlay extends _CopyOnWrite {
}
/**
 * @deprecated Use `CopyOnWrite`
 * @category Backends and Configuration
 * @internal @hidden
 */
export declare const Overlay: Overlay;
export {};
