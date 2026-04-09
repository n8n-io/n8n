import type * as fs from 'node:fs';
import type * as promises from 'node:fs/promises';
import type { Interface as ReadlineInterface } from 'node:readline';
import type { Stream } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { V_Context } from '../context.js';
import type { File } from '../internal/file.js';
import type { Stats } from '../stats.js';
import type { FileContents, NullEnc, ReaddirOptions, ReaddirOptsI, ReaddirOptsU } from './types.js';
import { Buffer } from 'buffer';
import '../polyfills.js';
import { BigIntStats } from '../stats.js';
import { Dir, Dirent } from './dir.js';
import { ReadStream, WriteStream } from './streams.js';
export * as constants from './constants.js';
export declare class FileHandle implements promises.FileHandle {
    protected context?: V_Context | undefined;
    /**
     * The file descriptor for this file handle.
     */
    readonly fd: number;
    /**
     * @internal
     * The file for this file handle
     */
    readonly file: File;
    constructor(fdOrFile: number | File, context?: V_Context | undefined);
    private _emitChange;
    /**
     * Asynchronous fchown(2) - Change ownership of a file.
     */
    chown(uid: number, gid: number): Promise<void>;
    /**
     * Asynchronous fchmod(2) - Change permissions of a file.
     * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
     */
    chmod(mode: fs.Mode): Promise<void>;
    /**
     * Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
     */
    datasync(): Promise<void>;
    /**
     * Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
     */
    sync(): Promise<void>;
    /**
     * Asynchronous ftruncate(2) - Truncate a file to a specified length.
     * @param length If not specified, defaults to `0`.
     */
    truncate(length?: number | null): Promise<void>;
    /**
     * Asynchronously change file timestamps of the file.
     * @param atime The last access time. If a string is provided, it will be coerced to number.
     * @param mtime The last modified time. If a string is provided, it will be coerced to number.
     */
    utimes(atime: string | number | Date, mtime: string | number | Date): Promise<void>;
    /**
     * Asynchronously append data to a file, creating the file if it does not exist. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for appending.
     * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
     * @param _options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
     * - `encoding` defaults to `'utf8'`.
     * - `mode` defaults to `0o666`.
     * - `flag` defaults to `'a'`.
     */
    appendFile(data: string | Uint8Array, _options?: (fs.ObjectEncodingOptions & promises.FlagAndOpenMode) | BufferEncoding): Promise<void>;
    /**
     * Asynchronously reads data from the file.
     * The `FileHandle` must have been opened for reading.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset in the buffer at which to start writing.
     * @param length The number of bytes to read.
     * @param position The offset from the beginning of the file from which data should be read. If `null`, data will be read from the current position.
     */
    read<T extends NodeJS.ArrayBufferView>(buffer: T, offset?: number, length?: number, position?: number | null): Promise<promises.FileReadResult<T>>;
    read<T extends NodeJS.ArrayBufferView = Buffer>(buffer: T, options?: promises.FileReadOptions<T>): Promise<promises.FileReadResult<T>>;
    read<T extends NodeJS.ArrayBufferView = Buffer>(options?: promises.FileReadOptions<T>): Promise<promises.FileReadResult<T>>;
    /**
     * Asynchronously reads the entire contents of a file. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for reading.
     * @param _options An object that may contain an optional flag.
     * If a flag is not provided, it defaults to `'r'`.
     */
    readFile(_options?: {
        flag?: fs.OpenMode;
    }): Promise<Buffer>;
    readFile(_options: (fs.ObjectEncodingOptions & promises.FlagAndOpenMode) | BufferEncoding): Promise<string>;
    /**
     * Read file data using a `ReadableStream`.
     * The handle will not be closed automatically.
     */
    readableWebStream(options?: promises.ReadableWebStreamOptions): NodeReadableStream<Uint8Array>;
    /**
     * @todo Implement
     */
    readLines(options?: promises.CreateReadStreamOptions): ReadlineInterface;
    [Symbol.asyncDispose](): Promise<void>;
    /**
     * Asynchronous fstat(2) - Get file status.
     */
    stat(opts: fs.BigIntOptions): Promise<BigIntStats>;
    stat(opts?: fs.StatOptions & {
        bigint?: false;
    }): Promise<Stats>;
    /**
     * Asynchronously writes `string` to the file.
     * The `FileHandle` must have been opened for writing.
     * It is unsafe to call `write()` multiple times on the same file without waiting for the `Promise`
     * to be resolved (or rejected). For this scenario, `createWriteStream` is strongly recommended.
     */
    write<T extends FileContents>(data: T, options?: number | null | {
        offset?: number;
        length?: number;
        position?: number;
    }, lenOrEnc?: BufferEncoding | number | null, position?: number | null): Promise<{
        bytesWritten: number;
        buffer: T;
    }>;
    /**
     * Asynchronously writes data to a file, replacing the file if it already exists. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for writing.
     * It is unsafe to call `writeFile()` multiple times on the same file without waiting for the `Promise` to be resolved (or rejected).
     * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
     * @param _options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
     * - `encoding` defaults to `'utf8'`.
     * - `mode` defaults to `0o666`.
     * - `flag` defaults to `'w'`.
     */
    writeFile(data: string | Uint8Array, _options?: fs.WriteFileOptions): Promise<void>;
    /**
     * Asynchronous close(2) - close a `FileHandle`.
     */
    close(): Promise<void>;
    /**
     * Asynchronous `writev`. Writes from multiple buffers.
     * @param buffers An array of Uint8Array buffers.
     * @param position The position in the file where to begin writing.
     * @returns The number of bytes written.
     */
    writev(buffers: Uint8Array[], position?: number): Promise<fs.WriteVResult>;
    /**
     * Asynchronous `readv`. Reads into multiple buffers.
     * @param buffers An array of Uint8Array buffers.
     * @param position The position in the file where to begin reading.
     * @returns The number of bytes read.
     */
    readv(buffers: NodeJS.ArrayBufferView[], position?: number): Promise<fs.ReadVResult>;
    /**
     * Creates a stream for reading from the file.
     * @param options Options for the readable stream
     */
    createReadStream(options?: promises.CreateReadStreamOptions): ReadStream;
    /**
     * Creates a stream for writing to the file.
     * @param options Options for the writeable stream.
     */
    createWriteStream(options?: promises.CreateWriteStreamOptions): WriteStream;
}
export declare function rename(this: V_Context, oldPath: fs.PathLike, newPath: fs.PathLike): Promise<void>;
/**
 * Test whether or not `path` exists by checking with the file system.
 */
export declare function exists(this: V_Context, path: fs.PathLike): Promise<boolean>;
export declare function stat(this: V_Context, path: fs.PathLike, options: fs.BigIntOptions): Promise<BigIntStats>;
export declare function stat(this: V_Context, path: fs.PathLike, options?: {
    bigint?: false;
}): Promise<Stats>;
export declare function stat(this: V_Context, path: fs.PathLike, options?: fs.StatOptions): Promise<Stats | BigIntStats>;
/**
 * `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 */
export declare function lstat(this: V_Context, path: fs.PathLike, options?: {
    bigint?: boolean;
}): Promise<Stats>;
export declare function lstat(this: V_Context, path: fs.PathLike, options: {
    bigint: true;
}): Promise<BigIntStats>;
export declare function truncate(this: V_Context, path: fs.PathLike, len?: number): Promise<void>;
export declare function unlink(this: V_Context, path: fs.PathLike): Promise<void>;
/**
 * Asynchronous file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param flag Handles the complexity of the various file modes. See its API for more details.
 * @param mode Mode to use to open the file. Can be ignored if the filesystem doesn't support permissions.
 */
export declare function open(this: V_Context, path: fs.PathLike, flag?: fs.OpenMode, mode?: fs.Mode): Promise<FileHandle>;
/**
 * Asynchronously reads the entire contents of a file.
 * @option encoding The string encoding for the file contents. Defaults to `null`.
 * @option flag Defaults to `'r'`.
 * @returns the file data
 */
export declare function readFile(this: V_Context, path: fs.PathLike | promises.FileHandle, options?: {
    encoding?: null;
    flag?: fs.OpenMode;
} | null): Promise<Buffer>;
export declare function readFile(this: V_Context, path: fs.PathLike | promises.FileHandle, options: {
    encoding: BufferEncoding;
    flag?: fs.OpenMode;
} | BufferEncoding): Promise<string>;
export declare function readFile(this: V_Context, path: fs.PathLike | promises.FileHandle, options?: (fs.ObjectEncodingOptions & {
    flag?: fs.OpenMode;
}) | BufferEncoding | null): Promise<string | Buffer>;
/**
 * Asynchronously writes data to a file, replacing the file if it already exists.
 *
 * The encoding option is ignored if data is a buffer.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'w'`.
 */
export declare function writeFile(this: V_Context, path: fs.PathLike | promises.FileHandle, data: FileContents | Stream | Iterable<string | ArrayBufferView> | AsyncIterable<string | ArrayBufferView>, _options?: (fs.ObjectEncodingOptions & {
    mode?: fs.Mode;
    flag?: fs.OpenMode;
    flush?: boolean;
}) | BufferEncoding | null): Promise<void>;
/**
 * Asynchronously append data to a file, creating the file if it not yet exists.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'a'`.
 */
export declare function appendFile(this: V_Context, path: fs.PathLike | promises.FileHandle, data: FileContents, _options?: BufferEncoding | (fs.EncodingOption & {
    mode?: fs.Mode;
    flag?: fs.OpenMode;
}) | null): Promise<void>;
export declare function rmdir(this: V_Context, path: fs.PathLike): Promise<void>;
/**
 * Asynchronous mkdir(2) - create a directory.
 * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
 * should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
 */
export declare function mkdir(this: V_Context, path: fs.PathLike, options: fs.MakeDirectoryOptions & {
    recursive: true;
}): Promise<string | undefined>;
export declare function mkdir(this: V_Context, path: fs.PathLike, options?: fs.Mode | (fs.MakeDirectoryOptions & {
    recursive?: false | undefined;
}) | null): Promise<void>;
export declare function mkdir(this: V_Context, path: fs.PathLike, options?: fs.Mode | fs.MakeDirectoryOptions | null): Promise<string | undefined>;
/**
 * Asynchronous readdir(3) - read a directory.
 *
 * Note: The order of entries is not guaranteed
 * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'`.
 */
export declare function readdir(this: V_Context, path: fs.PathLike, options?: ReaddirOptsI<{
    withFileTypes?: false;
}> | NullEnc): Promise<string[]>;
export declare function readdir(this: V_Context, path: fs.PathLike, options: fs.BufferEncodingOption & ReaddirOptions & {
    withFileTypes?: false;
}): Promise<Buffer[]>;
export declare function readdir(this: V_Context, path: fs.PathLike, options?: ReaddirOptsI<{
    withFileTypes?: false;
}> | NullEnc): Promise<string[] | Buffer[]>;
export declare function readdir(this: V_Context, path: fs.PathLike, options: ReaddirOptsI<{
    withFileTypes: true;
}>): Promise<Dirent[]>;
export declare function readdir(this: V_Context, path: fs.PathLike, options?: ReaddirOptsU<fs.BufferEncodingOption> | NullEnc): Promise<string[] | Dirent[] | Buffer[]>;
export declare function link(this: V_Context, targetPath: fs.PathLike, linkPath: fs.PathLike): Promise<void>;
/**
 * `symlink`.
 * @param target target path
 * @param path link path
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export declare function symlink(this: V_Context, target: fs.PathLike, path: fs.PathLike, type?: fs.symlink.Type | string | null): Promise<void>;
export declare function readlink(this: V_Context, path: fs.PathLike, options: fs.BufferEncodingOption): Promise<Buffer>;
export declare function readlink(this: V_Context, path: fs.PathLike, options?: fs.EncodingOption | null): Promise<string>;
export declare function readlink(this: V_Context, path: fs.PathLike, options?: fs.BufferEncodingOption | fs.EncodingOption | string | null): Promise<string | Buffer>;
export declare function chown(this: V_Context, path: fs.PathLike, uid: number, gid: number): Promise<void>;
export declare function lchown(this: V_Context, path: fs.PathLike, uid: number, gid: number): Promise<void>;
export declare function chmod(this: V_Context, path: fs.PathLike, mode: fs.Mode): Promise<void>;
export declare function lchmod(this: V_Context, path: fs.PathLike, mode: fs.Mode): Promise<void>;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export declare function utimes(this: V_Context, path: fs.PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export declare function lutimes(this: V_Context, path: fs.PathLike, atime: fs.TimeLike, mtime: fs.TimeLike): Promise<void>;
/**
 * Asynchronous realpath(3) - return the canonicalized absolute pathname.
 * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
 * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. Defaults to `'utf8'`.
 * @todo handle options
 */
export declare function realpath(this: V_Context, path: fs.PathLike, options: fs.BufferEncodingOption): Promise<Buffer>;
export declare function realpath(this: V_Context, path: fs.PathLike, options?: fs.EncodingOption | BufferEncoding): Promise<string>;
export declare function watch(this: V_Context, filename: fs.PathLike, options?: fs.WatchOptions | BufferEncoding): AsyncIteratorObject<promises.FileChangeInfo<string>>;
export declare function watch(this: V_Context, filename: fs.PathLike, options: fs.WatchOptions | fs.BufferEncodingOption): AsyncIteratorObject<promises.FileChangeInfo<Buffer>>;
export declare function watch(this: V_Context, filename: fs.PathLike, options?: fs.WatchOptions | string): AsyncIteratorObject<promises.FileChangeInfo<string>> | AsyncIteratorObject<promises.FileChangeInfo<Buffer>>;
export declare function access(this: V_Context, path: fs.PathLike, mode?: number): Promise<void>;
/**
 * Asynchronous `rm`. Removes files or directories (recursively).
 * @param path The path to the file or directory to remove.
 */
export declare function rm(this: V_Context, path: fs.PathLike, options?: fs.RmOptions): Promise<void>;
/**
 * Asynchronous `mkdtemp`. Creates a unique temporary directory.
 * @param prefix The directory prefix.
 * @param options The encoding (or an object including `encoding`).
 * @returns The path to the created temporary directory, encoded as a string or buffer.
 */
export declare function mkdtemp(this: V_Context, prefix: string, options?: fs.EncodingOption): Promise<string>;
export declare function mkdtemp(this: V_Context, prefix: string, options?: fs.BufferEncodingOption): Promise<Buffer>;
/**
 * Asynchronous `copyFile`. Copies a file.
 * @param src The source file.
 * @param dest The destination file.
 * @param mode Optional flags for the copy operation. Currently supports these flags:
 *    * `fs.constants.COPYFILE_EXCL`: If the destination file already exists, the operation fails.
 */
export declare function copyFile(this: V_Context, src: fs.PathLike, dest: fs.PathLike, mode?: number): Promise<void>;
/**
 * Asynchronous `opendir`. Opens a directory.
 * @param path The path to the directory.
 * @param options Options for opening the directory.
 * @returns A `Dir` object representing the opened directory.
 * @todo Use options
 */
export declare function opendir(this: V_Context, path: fs.PathLike, options?: fs.OpenDirOptions): Promise<Dir>;
/**
 * Asynchronous `cp`. Recursively copies a file or directory.
 * @param source The source file or directory.
 * @param destination The destination file or directory.
 * @param opts Options for the copy operation. Currently supports these options from Node.js 'fs.await cp':
 *   * `dereference`: Dereference symbolic links.
 *   * `errorOnExist`: Throw an error if the destination file or directory already exists.
 *   * `filter`: A function that takes a source and destination path and returns a boolean, indicating whether to copy `source` element.
 *   * `force`: Overwrite the destination if it exists, and overwrite existing readonly destination files.
 *   * `preserveTimestamps`: Preserve file timestamps.
 *   * `recursive`: If `true`, copies directories recursively.
 */
export declare function cp(this: V_Context, source: fs.PathLike, destination: fs.PathLike, opts?: fs.CopyOptions): Promise<void>;
/**
 * @since Node v18.15.0
 * @returns Fulfills with an {fs.StatFs} for the file system.
 */
export declare function statfs(this: V_Context, path: fs.PathLike, opts?: fs.StatFsOptions & {
    bigint?: false;
}): Promise<fs.StatsFs>;
export declare function statfs(this: V_Context, path: fs.PathLike, opts: fs.StatFsOptions & {
    bigint: true;
}): Promise<fs.BigIntStatsFs>;
export declare function statfs(this: V_Context, path: fs.PathLike, opts?: fs.StatFsOptions): Promise<fs.StatsFs | fs.BigIntStatsFs>;
/**
 * Retrieves the files matching the specified pattern.
 */
export declare function glob(this: V_Context, pattern: string | string[]): NodeJS.AsyncIterator<string>;
export declare function glob(this: V_Context, pattern: string | string[], opt: fs.GlobOptionsWithFileTypes): NodeJS.AsyncIterator<Dirent>;
export declare function glob(this: V_Context, pattern: string | string[], opt: fs.GlobOptionsWithoutFileTypes): NodeJS.AsyncIterator<string>;
export declare function glob(this: V_Context, pattern: string | string[], opt: fs.GlobOptions): NodeJS.AsyncIterator<Dirent | string>;
