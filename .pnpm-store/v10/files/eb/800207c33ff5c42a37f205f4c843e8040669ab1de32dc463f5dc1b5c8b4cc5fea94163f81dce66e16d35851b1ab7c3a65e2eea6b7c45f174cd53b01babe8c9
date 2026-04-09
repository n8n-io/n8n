import type { File } from '../../internal/file.js';
import { Index } from '../../internal/file_index.js';
import type { CreationOptions, PureCreationOptions, UsageInfo } from '../../internal/filesystem.js';
import { FileSystem } from '../../internal/filesystem.js';
import { Inode, type InodeLike } from '../../internal/inode.js';
import type { Stats } from '../../stats.js';
import { WrappedTransaction, type Store } from './store.js';
/**
 * A file system which uses a `Store`
 *
 * @todo Check modes?
 * @category Stores and Transactions
 * @internal
 */
export declare class StoreFS<T extends Store = Store> extends FileSystem {
    protected readonly store: T;
    /**
     * A map of paths to inode IDs
     * @internal @hidden
     */
    readonly _ids: Map<string, number>;
    /**
     * A map of inode IDs to paths
     * @internal @hidden
     */
    readonly _paths: Map<number, Set<string>>;
    /**
     * Gets the first path associated with an inode
     */
    _path(id: number): string | undefined;
    /**
     * Add a inode/path pair
     */
    _add(ino: number, path: string): void;
    /**
     * Remove a inode/path pair
     */
    _remove(ino: number): void;
    /**
     * Move paths in the tables
     */
    _move(from: string, to: string): void;
    protected _initialized: boolean;
    ready(): Promise<void>;
    constructor(store: T);
    /**
     * @experimental
     */
    usage(): UsageInfo;
    /**
     * Delete all contents stored in the file system.
     * @deprecated
     */
    empty(): Promise<void>;
    /**
     * Delete all contents stored in the file system.
     * @deprecated
     */
    emptySync(): void;
    /**
     * Load an index into the StoreFS.
     * You *must* manually add non-directory files
     */
    loadIndex(index: Index): Promise<void>;
    /**
     * Load an index into the StoreFS.
     * You *must* manually add non-directory files
     */
    loadIndexSync(index: Index): void;
    createIndex(): Promise<Index>;
    createIndexSync(): Index;
    /**
     * @todo Make rename compatible with the cache.
     */
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
    stat(path: string): Promise<Stats>;
    statSync(path: string): Stats;
    createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    createFileSync(path: string, flag: string, mode: number, options: CreationOptions): File;
    openFile(path: string, flag: string): Promise<File>;
    openFileSync(path: string, flag: string): File;
    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;
    rmdir(path: string): Promise<void>;
    rmdirSync(path: string): void;
    mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    mkdirSync(path: string, mode: number, options: CreationOptions): void;
    readdir(path: string): Promise<string[]>;
    readdirSync(path: string): string[];
    /**
     * Updated the inode and data node at `path`
     * @todo Ensure mtime updates properly, and use that to determine if a data update is required.
     */
    sync(path: string, data?: Uint8Array, metadata?: Readonly<InodeLike>): Promise<void>;
    /**
     * Updated the inode and data node at `path`
     * @todo Ensure mtime updates properly, and use that to determine if a data update is required.
     */
    syncSync(path: string, data?: Uint8Array, metadata?: Readonly<InodeLike>): void;
    link(target: string, link: string): Promise<void>;
    linkSync(target: string, link: string): void;
    read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void>;
    readSync(path: string, buffer: Uint8Array, offset: number, end: number): void;
    write(path: string, data: Uint8Array, offset: number): Promise<void>;
    writeSync(path: string, data: Uint8Array, offset: number): void;
    /**
     * Wraps a transaction
     * @internal @hidden
     */
    transaction(): WrappedTransaction;
    /**
     * Checks if the root directory exists. Creates it if it doesn't.
     */
    checkRoot(): Promise<void>;
    /**
     * Checks if the root directory exists. Creates it if it doesn't.
     */
    checkRootSync(): void;
    /**
     * Populates the `_ids` and `_paths` maps with all existing files stored in the underlying `Store`.
     */
    private _populate;
    /**
     * Finds the Inode of `path`.
     * @param path The path to look up.
     * @todo memoize/cache
     */
    protected findInode(tx: WrappedTransaction, path: string, syscall: string): Promise<Inode>;
    /**
     * Finds the Inode of `path`.
     * @param path The path to look up.
     * @return The Inode of the path p.
     * @todo memoize/cache
     */
    protected findInodeSync(tx: WrappedTransaction, path: string, syscall: string): Inode;
    private _lastID?;
    /**
     * Allocates a new ID and adds the ID/path
     */
    protected allocNew(path: string, syscall: string): number;
    /**
     * Commits a new file (well, a FILE or a DIRECTORY) to the file system with `mode`.
     * Note: This will commit the transaction.
     * @param path The path to the new file.
     * @param options The options to create the new file with.
     * @param data The data to store at the file's data node.
     */
    protected commitNew(path: string, options: PureCreationOptions, data: Uint8Array, syscall: string): Promise<Inode>;
    /**
     * Commits a new file (well, a FILE or a DIRECTORY) to the file system with `mode`.
     * Note: This will commit the transaction.
     * @param path The path to the new file.
     * @param options The options to create the new file with.
     * @param data The data to store at the file's data node.
     * @return The Inode for the new file.
     */
    protected commitNewSync(path: string, options: PureCreationOptions, data: Uint8Array, syscall: string): Inode;
    /**
     * Remove all traces of `path` from the file system.
     * @param path The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    protected remove(path: string, isDir: boolean): Promise<void>;
    /**
     * Remove all traces of `path` from the file system.
     * @param path The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    protected removeSync(path: string, isDir: boolean): void;
}
