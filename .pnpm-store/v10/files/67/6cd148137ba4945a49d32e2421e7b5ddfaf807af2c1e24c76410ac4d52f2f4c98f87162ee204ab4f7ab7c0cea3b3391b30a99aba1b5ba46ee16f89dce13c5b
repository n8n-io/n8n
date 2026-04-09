import type { ConstMap } from 'utilium';
import type { Stats, StatsLike } from '../stats.js';
import type { File } from './file.js';
/**
 * Usage information about a file system
 * @category Internals
 * @internal
 */
export interface UsageInfo {
    /**
     * The total space
     */
    totalSpace: number;
    /**
     * The available space
     */
    freeSpace: number;
    /**
     * The optimal block size to use with the file system
     * @default 4096
     */
    blockSize?: number;
    /**
     * Total number of nodes available
     */
    totalNodes?: number;
    /**
     * Number of free nodes available
     */
    freeNodes?: number;
}
/**
 * Metadata about a FileSystem
 * @category Internals
 * @deprecated
 */
export interface FileSystemMetadata extends UsageInfo {
    /**
     * The name of the FS
     * @deprecated Use `FileSystem#name`
     */
    name: string;
    /**
     * Whether the FS is readonly or not
     * @deprecated Use `FileSystem#attributes
     */
    readonly: boolean;
    /**
     * If set, disables File from using a resizable array buffer.
     * @default false
     * @deprecated Use `FileSystem#attributes`
     */
    noResizableBuffers: boolean;
    /**
     * If set, disables caching on async file systems.
     * This means *sync operations will not work*.
     * It has no affect on sync file systems.
     * @default false
     * @deprecated Use `FileSystem#attributes
     */
    noAsyncCache: boolean;
    /**
     * The type of the FS
     */
    type: number;
    /**
     * Various features the file system supports.
     * @deprecated Use `FileSystem#attributes`
     */
    features?: unknown[];
}
/**
 * Attributes that control how the file system interacts with the VFS.
 * No options are set by default.
 * @category Internals
 * @internal
 */
export type FileSystemAttributes = {
    /** The FS supports setuid and setgid when creating files and directories. */
    setid: void;
    /** If set, disables `PreloadFile` from using a resizable array buffer. */
    no_buffer_resize: void;
    /**
     * If set disables async file systems from preloading their contents.
     * This means *sync operations will not work* (unless the contents are cached)
     * It has no affect on sync file systems.
     */
    no_async: void;
    /**
     * Currently unused. In the future, this will disable caching.
     * Not recommended due to performance impact.
     */
    no_cache: void;
    /**
     * If set, the file system should not be written to.
     * This should be set for read-only file systems.
     */
    no_write: void;
    /**
     * The FS is using the default implementation for `streamRead`
     * @internal
     */
    default_stream_read: void;
    /**
     * The FS is using the default implementation for `streamWrite`
     * @internal
     */
    default_stream_write: void;
};
/**
 * Options used when creating files and directories.
 * This weird naming and such is to preserve backward compatibility.
 * @todo [BREAKING] Move the `mode` parameter of `createFile` and `mkdir` into this
 * @category Internals
 * @internal
 */
export interface CreationOptions {
    /**
     * The uid to create the file.
     * This is ignored if the FS supports setuid and the setuid bit is set
     */
    uid: number;
    /**
     * The gid to create the file.
     * This is ignored if the FS supports setgid and the setgid bit is set
     */
    gid: number;
    /**
     * The mode to create the file with.
     */
    mode?: number;
}
/**
 * This is the correct type that will be used when the API is updated in a breaking release
 * @category Internals
 * @internal
 */
export interface PureCreationOptions extends CreationOptions {
    /**
     * The mode to create the file with.
     */
    mode: number;
}
/**
 * @internal
 */
export interface StreamOptions {
    start?: number;
    end?: number;
}
/**
 * Provides a consistent and easy to use internal API.
 * Default implementations for `exists` and `existsSync` are included.
 * If you are extending this class, note that every path is an absolute path and all arguments are present.
 * @category Internals
 * @internal
 */
export declare abstract class FileSystem {
    /**
     * A unique ID for this kind of file system.
     * Currently unused internally, but could be used for partition tables or something
     */
    readonly id: number;
    /**
     * The name for this file system.
     * For example, tmpfs for an in memory one
     */
    readonly name: string;
    label?: string;
    /**
     * The last place this file system was mounted
     * @internal @protected
     */
    _mountPoint?: string;
    /**
     * @see FileSystemAttributes
     */
    readonly attributes: ConstMap<FileSystemAttributes> & Map<string, any>;
    constructor(
    /**
     * A unique ID for this kind of file system.
     * Currently unused internally, but could be used for partition tables or something
     */
    id: number, 
    /**
     * The name for this file system.
     * For example, tmpfs for an in memory one
     */
    name: string);
    toString(): string;
    /**
     * Default implementation.
     * @todo Implement
     * @experimental
     */
    usage(): UsageInfo;
    /**
     * Get metadata about the current file system
     * @deprecated
     */
    metadata(): FileSystemMetadata;
    ready(): Promise<void>;
    abstract rename(oldPath: string, newPath: string): Promise<void>;
    abstract renameSync(oldPath: string, newPath: string): void;
    abstract stat(path: string): Promise<Stats>;
    abstract statSync(path: string): Stats;
    /**
     * Opens the file at `path` with `flag`. The file must exist.
     * @param path The path to open.
     * @param flag The flag to use when opening the file.
     */
    abstract openFile(path: string, flag: string): Promise<File>;
    /**
     * Opens the file at `path` with `flag`. The file must exist.
     * @param path The path to open.
     * @param flag The flag to use when opening the file.
     */
    abstract openFileSync(path: string, flag: string): File;
    /**
     * Create the file at `path` with the given options. Then, open it with `flag`.
     */
    abstract createFile(path: string, flag: string, mode: number, options: CreationOptions): Promise<File>;
    /**
     * Create the file at `path` with the given options. Then, open it with `flag`.
     */
    abstract createFileSync(path: string, flag: string, mode: number, options: CreationOptions): File;
    abstract unlink(path: string): Promise<void>;
    abstract unlinkSync(path: string): void;
    abstract rmdir(path: string): Promise<void>;
    abstract rmdirSync(path: string): void;
    abstract mkdir(path: string, mode: number, options: CreationOptions): Promise<void>;
    abstract mkdirSync(path: string, mode: number, options: CreationOptions): void;
    abstract readdir(path: string): Promise<string[]>;
    abstract readdirSync(path: string): string[];
    /**
     * Test whether or not `path` exists.
     */
    exists(path: string): Promise<boolean>;
    /**
     * Test whether or not `path` exists.
     */
    existsSync(path: string): boolean;
    abstract link(target: string, link: string): Promise<void>;
    abstract linkSync(target: string, link: string): void;
    abstract sync(path: string, data?: Uint8Array, stats?: Readonly<Partial<StatsLike>>): Promise<void>;
    abstract syncSync(path: string, data?: Uint8Array, stats?: Readonly<Partial<StatsLike>>): void;
    /**
     * Reads into a buffer
     * @param buffer The buffer to read into. You must set the `byteOffset` and `byteLength` appropriately!
     * @param offset The offset into the file to start reading from
     * @param end The position in the file to stop reading
     */
    abstract read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void>;
    /**
     * Reads into a buffer
     * @param buffer The buffer to read into. You must set the `byteOffset` and `byteLength` appropriately!
     * @param offset The offset into the file to start reading from
     * @param end The position in the file to stop reading
     */
    abstract readSync(path: string, buffer: Uint8Array, offset: number, end: number): void;
    /**
     * Writes a buffer to a file
     * @param buffer The buffer to write. You must set the `byteOffset` and `byteLength` appropriately!
     * @param offset The offset in the file to start writing
     */
    abstract write(path: string, buffer: Uint8Array, offset: number): Promise<void>;
    /**
     * Writes a buffer to a file
     * @param buffer The buffer to write. You must set the `byteOffset` and `byteLength` appropriately!
     * @param offset The offset in the file to start writing
     */
    abstract writeSync(path: string, buffer: Uint8Array, offset: number): void;
    /**
     * Read a file using a stream.
     * @privateRemarks The default implementation of `streamRead` uses "chunked" `read`s
     */
    streamRead(path: string, options: StreamOptions): ReadableStream;
    /**
     * Write a file using stream.
     * @privateRemarks The default implementation of `streamWrite` uses "chunked" `write`s
     */
    streamWrite(path: string, options: StreamOptions): WritableStream;
}
