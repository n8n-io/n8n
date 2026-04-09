import type { File } from '../internal/file.js';
import type { CreationOptions, FileSystem, FileSystemMetadata, StreamOptions, UsageInfo } from '../internal/filesystem.js';
import type { InodeLike } from '../internal/inode.js';
import type { Stats } from '../stats.js';
import type { Concrete } from '../utils.js';
import '../polyfills.js';
/**
 * @category Internals
 * @internal
 */
export declare class MutexLock {
    protected readonly previous?: MutexLock | undefined;
    protected current: PromiseWithResolvers<void>;
    protected _isLocked: boolean;
    get isLocked(): boolean;
    constructor(previous?: MutexLock | undefined);
    done(): Promise<void>;
    unlock(): void;
    [Symbol.dispose](): void;
}
/**
 * @hidden
 * @category Internals
 */
export declare class _MutexedFS<T extends FileSystem> implements FileSystem {
    /**
     * @internal
     */
    _fs: T;
    get id(): number;
    get name(): string;
    get label(): string | undefined;
    set label(value: string | undefined);
    get attributes(): import("utilium").ConstMap<import("../internal/filesystem.js").FileSystemAttributes, keyof import("../internal/filesystem.js").FileSystemAttributes, void> & Map<string, any>;
    ready(): Promise<void>;
    usage(): UsageInfo;
    metadata(): FileSystemMetadata;
    /**
     * The current locks
     */
    private currentLock?;
    /**
     * Adds a lock for a path
     */
    protected addLock(): MutexLock;
    /**
     * Locks `path` asynchronously.
     * If the path is currently locked, waits for it to be unlocked.
     * @internal
     */
    lock(path: string, syscall: string): Promise<MutexLock>;
    /**
     * Locks `path` asynchronously.
     * If the path is currently locked, an error will be thrown
     * @internal
     */
    lockSync(path: string, syscall: string): MutexLock;
    /**
     * Whether `path` is locked
     * @internal
     */
    get isLocked(): boolean;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
    stat(path: string): Promise<Stats>;
    statSync(path: string): Stats;
    openFile(path: string, flag: string): Promise<File>;
    openFileSync(path: string, flag: string): File;
    createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    createFileSync(path: string, flag: string, mode: number, options: CreationOptions): File;
    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;
    rmdir(path: string): Promise<void>;
    rmdirSync(path: string): void;
    mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    mkdirSync(path: string, mode: number, options: CreationOptions): void;
    readdir(path: string): Promise<string[]>;
    readdirSync(path: string): string[];
    exists(path: string): Promise<boolean>;
    existsSync(path: string): boolean;
    link(srcpath: string, dstpath: string): Promise<void>;
    linkSync(srcpath: string, dstpath: string): void;
    sync(path: string, data?: Uint8Array, stats?: Readonly<InodeLike>): Promise<void>;
    syncSync(path: string, data?: Uint8Array, stats?: Readonly<InodeLike>): void;
    read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void>;
    readSync(path: string, buffer: Uint8Array, offset: number, end: number): void;
    write(path: string, buffer: Uint8Array, offset: number): Promise<void>;
    writeSync(path: string, buffer: Uint8Array, offset: number): void;
    streamRead(path: string, options: StreamOptions): ReadableStream;
    streamWrite(path: string, options: StreamOptions): WritableStream;
}
/**
 * This serializes access to an underlying async filesystem.
 * For example, on an OverlayFS instance with an async lower
 * directory operations like rename and rmdir may involve multiple
 * requests involving both the upper and lower file systems -- they
 * are not executed in a single atomic step. OverlayFS used to use this
 * to avoid having to reason about the correctness of
 * multiple requests interleaving.
 *
 * @privateRemarks
 * Instead of extending the passed class, `MutexedFS` stores it internally.
 * This is to avoid a deadlock caused when a method calls another one
 * The problem is discussed extensively in [#78](https://github.com/zen-fs/core/issues/78)
 * Instead of extending `FileSystem`,
 * `MutexedFS` implements it in order to make sure all of the methods are passed through
 *
 * @todo Change `using _` to `using void` pending https://github.com/tc39/proposal-discard-binding
 * @category Internals
 * @internal
 */
export declare function Mutexed<const T extends Concrete<typeof FileSystem>>(FS: T): typeof _MutexedFS<InstanceType<T>> & {
    new (...args: ConstructorParameters<T>): _MutexedFS<InstanceType<T>>;
};
