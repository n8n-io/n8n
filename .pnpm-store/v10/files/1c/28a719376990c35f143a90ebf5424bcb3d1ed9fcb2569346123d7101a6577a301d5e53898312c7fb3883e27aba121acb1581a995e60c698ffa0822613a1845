import { Stats, type StatsLike } from '../stats.js';
import type { FileSystem, StreamOptions } from './filesystem.js';
import '../polyfills.js';
/**
 * @internal @hidden
 */
export declare function parseFlag(flag: string | number): string;
/**
 * @internal @hidden
 */
export declare function flagToString(flag: number): string;
/**
 * @internal @hidden
 */
export declare function flagToNumber(flag: string): number;
/**
 * Parses a flag as a mode (W_OK, R_OK, and/or X_OK)
 * @param flag the flag to parse
 * @internal @hidden
 */
export declare function flagToMode(flag: string): number;
/** @hidden */
export declare function isReadable(flag: string): boolean;
/** @hidden */
export declare function isWriteable(flag: string): boolean;
/** @hidden */
export declare function isTruncating(flag: string): boolean;
/** @hidden */
export declare function isAppendable(flag: string): boolean;
/** @hidden */
export declare function isSynchronous(flag: string): boolean;
/** @hidden */
export declare function isExclusive(flag: string): boolean;
/** @hidden */
export interface FileReadResult<T extends ArrayBufferView> {
    bytesRead: number;
    buffer: T;
}
/**
 * @category Internals
 */
export declare abstract class File<FS extends FileSystem = FileSystem> {
    /**
     * @internal
     * The file system that created the file
     */
    fs: FS;
    readonly path: string;
    constructor(
    /**
     * @internal
     * The file system that created the file
     */
    fs: FS, path: string);
    /**
     * Get the current file position.
     */
    abstract position: number;
    abstract stat(): Promise<Stats>;
    abstract statSync(): Stats;
    abstract close(): Promise<void>;
    abstract closeSync(): void;
    [Symbol.asyncDispose](): Promise<void>;
    [Symbol.dispose](): void;
    abstract truncate(len: number): Promise<void>;
    abstract truncateSync(len: number): void;
    abstract sync(): Promise<void>;
    abstract syncSync(): void;
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at the current position.
     * @returns Promise resolving to the new length of the buffer
     */
    abstract write(buffer: Uint8Array, offset?: number, length?: number, position?: number): Promise<number>;
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at the current position.
     */
    abstract writeSync(buffer: Uint8Array, offset?: number, length?: number, position?: number): number;
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     * @returns Promise resolving to the new length of the buffer
     */
    abstract read<TBuffer extends ArrayBufferView>(buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<FileReadResult<TBuffer>>;
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     */
    abstract readSync(buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    /**
     * Default implementation maps to `sync`.
     */
    datasync(): Promise<void>;
    /**
     * Default implementation maps to `syncSync`.
     */
    datasyncSync(): void;
    abstract chown(uid: number, gid: number): Promise<void>;
    abstract chownSync(uid: number, gid: number): void;
    abstract chmod(mode: number): Promise<void>;
    abstract chmodSync(mode: number): void;
    /**
     * Change the file timestamps of the file.
     */
    abstract utimes(atime: number, mtime: number): Promise<void>;
    /**
     * Change the file timestamps of the file.
     */
    abstract utimesSync(atime: number, mtime: number): void;
    /**
     * Create a stream for reading the file.
     */
    streamRead(options: StreamOptions): ReadableStream;
    /**
     * Create a stream for writing the file.
     */
    streamWrite(options: StreamOptions): WritableStream;
}
/**
 * An implementation of `File` that operates completely in-memory.
 * `PreloadFile`s are backed by a `Uint8Array`.
 * @category Internals
 */
export declare class PreloadFile<FS extends FileSystem> extends File<FS> {
    readonly flag: string;
    readonly stats: Stats;
    /**
     * A buffer containing the entire contents of the file.
     */
    protected _buffer: Uint8Array;
    /**
     * Current position
     */
    protected _position: number;
    /**
     * Whether the file has changes which have not been written to the FS
     */
    protected dirty: boolean;
    /**
     * Whether the file is open or closed
     */
    protected closed: boolean;
    /**
     * Creates a file with `path` and, optionally, the given contents.
     * Note that, if contents is specified, it will be mutated by the file.
     */
    constructor(fs: FS, path: string, flag: string, stats: Stats, 
    /**
     * A buffer containing the entire contents of the file.
     */
    _buffer?: Uint8Array);
    /**
     * Get the underlying buffer for this file. Mutating not recommended and will mess up dirty tracking.
     */
    get buffer(): Uint8Array;
    /**
     * Get the current file position.
     *
     * We emulate the following bug mentioned in the Node documentation:
     *
     * On Linux, positional writes don't work when the file is opened in append mode.
     * The kernel ignores the position argument and always appends the data to the end of the file.
     * @returns The current file position.
     */
    get position(): number;
    set position(value: number);
    sync(): Promise<void>;
    syncSync(): void;
    close(): Promise<void>;
    closeSync(): void;
    /**
     * Cleans up. This will *not* sync the file data to the FS
     */
    protected dispose(force?: boolean): void;
    stat(): Promise<Stats>;
    statSync(): Stats;
    protected _truncate(length: number): void;
    truncate(length: number): Promise<void>;
    truncateSync(length: number): void;
    protected _write(buffer: Uint8Array, offset?: number, length?: number, position?: number): number;
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     */
    write(buffer: Uint8Array, offset?: number, length?: number, position?: number): Promise<number>;
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     * @returns bytes written
     */
    writeSync(buffer: Uint8Array, offset?: number, length?: number, position?: number): number;
    protected _read(buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     */
    read<TBuffer extends ArrayBufferView>(buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{
        bytesRead: number;
        buffer: TBuffer;
    }>;
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     * @returns number of bytes written
     */
    readSync(buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    chmod(mode: number): Promise<void>;
    chmodSync(mode: number): void;
    chown(uid: number, gid: number): Promise<void>;
    chownSync(uid: number, gid: number): void;
    utimes(atime: number, mtime: number): Promise<void>;
    utimesSync(atime: number, mtime: number): void;
}
/**
 * For the file systems which do not sync to anything.
 * @category Internals
 * @deprecated
 */
export declare class NoSyncFile<T extends FileSystem> extends PreloadFile<T> {
    constructor(...args: ConstructorParameters<typeof PreloadFile<T>>);
    sync(): Promise<void>;
    syncSync(): void;
    close(): Promise<void>;
    closeSync(): void;
}
/**
 * An implementation of `File` that uses the FS
 * @category Internals
 */
export declare class LazyFile<FS extends FileSystem> extends File<FS> {
    readonly flag: string;
    readonly stats: StatsLike<number>;
    protected _buffer?: Uint8Array;
    /**
     * Current position
     */
    protected _position: number;
    /**
     * Get the current file position.
     *
     * We emulate the following bug mentioned in the Node documentation:
     *
     * On Linux, positional writes don't work when the file is opened in append mode.
     * The kernel ignores the position argument and always appends the data to the end of the file.
     * @returns The current file position.
     */
    get position(): number;
    set position(value: number);
    /**
     * Whether the file has changes which have not been written to the FS
     */
    protected dirty: boolean;
    /**
     * Whether the file is open or closed
     */
    protected closed: boolean;
    /**
     * Creates a file with `path` and, optionally, the given contents.
     * Note that, if contents is specified, it will be mutated by the file.
     */
    constructor(fs: FS, path: string, flag: string, stats: StatsLike<number>);
    sync(): Promise<void>;
    syncSync(): void;
    close(): Promise<void>;
    closeSync(): void;
    /**
     * Cleans up. This will *not* sync the file data to the FS
     */
    protected dispose(force?: boolean): void;
    stat(): Promise<Stats>;
    statSync(): Stats;
    truncate(length: number): Promise<void>;
    truncateSync(length: number): void;
    protected prepareWrite(buffer: Uint8Array, offset: number, length: number, position: number): Uint8Array;
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     */
    write(buffer: Uint8Array, offset?: number, length?: number, position?: number): Promise<number>;
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     * @returns bytes written
     */
    writeSync(buffer: Uint8Array, offset?: number, length?: number, position?: number): number;
    /**
     * Computes position information for reading
     */
    protected prepareRead(length: number, position: number): number;
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is unset, data will be read from the current file position.
     */
    read<TBuffer extends ArrayBufferView>(buffer: TBuffer, offset?: number, length?: number, position?: number): Promise<{
        bytesRead: number;
        buffer: TBuffer;
    }>;
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     * @returns number of bytes written
     */
    readSync(buffer: ArrayBufferView, offset?: number, length?: number, position?: number): number;
    chmod(mode: number): Promise<void>;
    chmodSync(mode: number): void;
    chown(uid: number, gid: number): Promise<void>;
    chownSync(uid: number, gid: number): void;
    utimes(atime: number, mtime: number): Promise<void>;
    utimesSync(atime: number, mtime: number): void;
}
