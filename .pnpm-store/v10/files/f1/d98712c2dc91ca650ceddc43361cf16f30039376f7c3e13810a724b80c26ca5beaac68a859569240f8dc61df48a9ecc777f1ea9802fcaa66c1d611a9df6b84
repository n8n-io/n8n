import type * as fs from 'node:fs';
import type { V_Context } from '../context.js';
import type { Stats } from '../stats.js';
import type { FileContents, NullEnc, ReaddirOptions, ReaddirOptsI, ReaddirOptsU } from './types.js';
import { Buffer } from 'buffer';
import { BigIntStats } from '../stats.js';
import { Dir, Dirent } from './dir.js';
export declare function renameSync(this: V_Context, oldPath: fs.PathLike, newPath: fs.PathLike): void;
/**
 * Test whether or not `path` exists by checking with the file system.
 */
export declare function existsSync(this: V_Context, path: fs.PathLike): boolean;
export declare function statSync(this: V_Context, path: fs.PathLike, options?: {
    bigint?: boolean;
}): Stats;
export declare function statSync(this: V_Context, path: fs.PathLike, options: {
    bigint: true;
}): BigIntStats;
/**
 * Synchronous `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 */
export declare function lstatSync(this: V_Context, path: fs.PathLike, options?: {
    bigint?: boolean;
}): Stats;
export declare function lstatSync(this: V_Context, path: fs.PathLike, options: {
    bigint: true;
}): BigIntStats;
export declare function truncateSync(this: V_Context, path: fs.PathLike, len?: number | null): void;
export declare function unlinkSync(this: V_Context, path: fs.PathLike): void;
/**
 * Synchronous file open.
 * @see http://www.manpagez.com/man/2/open/
 */
export declare function openSync(this: V_Context, path: fs.PathLike, flag: fs.OpenMode, mode?: fs.Mode | null): number;
/**
 * Opens a file or symlink
 * @internal
 */
export declare function lopenSync(this: V_Context, path: fs.PathLike, flag: string, mode?: fs.Mode | null): number;
/**
 * Synchronously reads the entire contents of a file.
 * @option encoding The string encoding for the file contents. Defaults to `null`.
 * @option flag Defaults to `'r'`.
 * @returns file contents
 */
export declare function readFileSync(this: V_Context, path: fs.PathOrFileDescriptor, options?: {
    flag?: string;
} | null): Buffer;
export declare function readFileSync(this: V_Context, path: fs.PathOrFileDescriptor, options?: (fs.EncodingOption & {
    flag?: string;
}) | BufferEncoding | null): string;
/**
 * Synchronously writes data to a file, replacing the file if it already exists.
 *
 * The encoding option is ignored if data is a buffer.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'w'`.
 */
export declare function writeFileSync(this: V_Context, path: fs.PathOrFileDescriptor, data: FileContents, options?: fs.WriteFileOptions): void;
export declare function writeFileSync(this: V_Context, path: fs.PathOrFileDescriptor, data: FileContents, encoding?: BufferEncoding): void;
/**
 * Asynchronously append data to a file, creating the file if it not yet exists.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'a+'`.
 */
export declare function appendFileSync(this: V_Context, filename: fs.PathOrFileDescriptor, data: FileContents, _options?: fs.WriteFileOptions): void;
/**
 * Synchronous `fstat`.
 * `fstat()` is identical to `stat()`, except that the file to be stat-ed is
 * specified by the file descriptor `fd`.
 */
export declare function fstatSync(this: V_Context, fd: number, options?: {
    bigint?: boolean;
}): Stats;
export declare function fstatSync(this: V_Context, fd: number, options: {
    bigint: true;
}): BigIntStats;
export declare function closeSync(this: V_Context, fd: number): void;
export declare function ftruncateSync(this: V_Context, fd: number, len?: number | null): void;
export declare function fsyncSync(this: V_Context, fd: number): void;
export declare function fdatasyncSync(this: V_Context, fd: number): void;
/**
 * Write buffer to the file specified by `fd`.
 * @param data Uint8Array containing the data to write to the file.
 * @param offset Offset in the buffer to start reading data from.
 * @param length The amount of bytes to write to the file.
 * @param position Offset from the beginning of the file where this data should be written.
 * If position is null, the data will be written at the current position.
 */
export declare function writeSync(this: V_Context, fd: number, data: ArrayBufferView, offset?: number | null, length?: number | null, position?: number | null): number;
export declare function writeSync(this: V_Context, fd: number, data: string, position?: number | null, encoding?: BufferEncoding | null): number;
export declare function readSync(this: V_Context, fd: number, buffer: ArrayBufferView, options?: fs.ReadSyncOptions): number;
export declare function readSync(this: V_Context, fd: number, buffer: ArrayBufferView, offset: number, length: number, position?: fs.ReadPosition | null): number;
export declare function fchownSync(this: V_Context, fd: number, uid: number, gid: number): void;
export declare function fchmodSync(this: V_Context, fd: number, mode: number | string): void;
/**
 * Change the file timestamps of a file referenced by the supplied file descriptor.
 */
export declare function futimesSync(this: V_Context, fd: number, atime: string | number | Date, mtime: string | number | Date): void;
export declare function rmdirSync(this: V_Context, path: fs.PathLike): void;
/**
 * Synchronous `mkdir`. Mode defaults to `o777`.
 */
export declare function mkdirSync(this: V_Context, path: fs.PathLike, options: fs.MakeDirectoryOptions & {
    recursive: true;
}): string | undefined;
export declare function mkdirSync(this: V_Context, path: fs.PathLike, options?: fs.Mode | (fs.MakeDirectoryOptions & {
    recursive?: false;
}) | null): void;
export declare function mkdirSync(this: V_Context, path: fs.PathLike, options?: fs.Mode | fs.MakeDirectoryOptions | null): string | undefined;
export declare function readdirSync(this: V_Context, path: fs.PathLike, options?: ReaddirOptsI<{
    withFileTypes?: false;
}> | NullEnc): string[];
export declare function readdirSync(this: V_Context, path: fs.PathLike, options: fs.BufferEncodingOption & ReaddirOptions & {
    withFileTypes?: false;
}): Buffer[];
export declare function readdirSync(this: V_Context, path: fs.PathLike, options?: ReaddirOptsI<{
    withFileTypes?: false;
}> | NullEnc): string[] | Buffer[];
export declare function readdirSync(this: V_Context, path: fs.PathLike, options: ReaddirOptsI<{
    withFileTypes: true;
}>): Dirent[];
export declare function readdirSync(this: V_Context, path: fs.PathLike, options?: ReaddirOptsU<fs.BufferEncodingOption> | NullEnc): string[] | Dirent[] | Buffer[];
export declare function linkSync(this: V_Context, targetPath: fs.PathLike, linkPath: fs.PathLike): void;
/**
 * Synchronous `symlink`.
 * @param target target path
 * @param path link path
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export declare function symlinkSync(this: V_Context, target: fs.PathLike, path: fs.PathLike, type?: fs.symlink.Type | null): void;
export declare function readlinkSync(this: V_Context, path: fs.PathLike, options?: fs.BufferEncodingOption): Buffer;
export declare function readlinkSync(this: V_Context, path: fs.PathLike, options: fs.EncodingOption | BufferEncoding): string;
export declare function readlinkSync(this: V_Context, path: fs.PathLike, options?: fs.EncodingOption | BufferEncoding | fs.BufferEncodingOption): Buffer | string;
export declare function chownSync(this: V_Context, path: fs.PathLike, uid: number, gid: number): void;
export declare function lchownSync(this: V_Context, path: fs.PathLike, uid: number, gid: number): void;
export declare function chmodSync(this: V_Context, path: fs.PathLike, mode: fs.Mode): void;
export declare function lchmodSync(this: V_Context, path: fs.PathLike, mode: number | string): void;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export declare function utimesSync(this: V_Context, path: fs.PathLike, atime: string | number | Date, mtime: string | number | Date): void;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export declare function lutimesSync(this: V_Context, path: fs.PathLike, atime: string | number | Date, mtime: string | number | Date): void;
export declare function realpathSync(this: V_Context, path: fs.PathLike, options: fs.BufferEncodingOption): Buffer;
export declare function realpathSync(this: V_Context, path: fs.PathLike, options?: fs.EncodingOption): string;
export declare function accessSync(this: V_Context, path: fs.PathLike, mode?: number): void;
/**
 * Synchronous `rm`. Removes files or directories (recursively).
 * @param path The path to the file or directory to remove.
 */
export declare function rmSync(this: V_Context, path: fs.PathLike, options?: fs.RmOptions): void;
/**
 * Synchronous `mkdtemp`. Creates a unique temporary directory.
 * @param prefix The directory prefix.
 * @param options The encoding (or an object including `encoding`).
 * @returns The path to the created temporary directory, encoded as a string or buffer.
 */
export declare function mkdtempSync(this: V_Context, prefix: string, options: fs.BufferEncodingOption): Buffer;
export declare function mkdtempSync(this: V_Context, prefix: string, options?: fs.EncodingOption): string;
/**
 * Synchronous `copyFile`. Copies a file.
 * @param flags Optional flags for the copy operation. Currently supports these flags:
 * - `fs.constants.COPYFILE_EXCL`: If the destination file already exists, the operation fails.
 */
export declare function copyFileSync(this: V_Context, source: fs.PathLike, destination: fs.PathLike, flags?: number): void;
/**
 * Synchronous `readv`. Reads from a file descriptor into multiple buffers.
 * @param fd The file descriptor.
 * @param buffers An array of Uint8Array buffers.
 * @param position The position in the file where to begin reading.
 * @returns The number of bytes read.
 */
export declare function readvSync(this: V_Context, fd: number, buffers: readonly NodeJS.ArrayBufferView[], position?: number): number;
/**
 * Synchronous `writev`. Writes from multiple buffers into a file descriptor.
 * @param fd The file descriptor.
 * @param buffers An array of Uint8Array buffers.
 * @param position The position in the file where to begin writing.
 * @returns The number of bytes written.
 */
export declare function writevSync(this: V_Context, fd: number, buffers: readonly ArrayBufferView[], position?: number): number;
/**
 * Synchronous `opendir`. Opens a directory.
 * @param path The path to the directory.
 * @param options Options for opening the directory.
 * @returns A `Dir` object representing the opened directory.
 * @todo Handle options
 */
export declare function opendirSync(this: V_Context, path: fs.PathLike, options?: fs.OpenDirOptions): Dir;
/**
 * Synchronous `cp`. Recursively copies a file or directory.
 * @param source The source file or directory.
 * @param destination The destination file or directory.
 * @param opts Options for the copy operation. Currently supports these options from Node.js 'fs.cpSync':
 * - `dereference`: Dereference symbolic links. *(unconfirmed)*
 * - `errorOnExist`: Throw an error if the destination file or directory already exists.
 * - `filter`: A function that takes a source and destination path and returns a boolean, indicating whether to copy `source` element.
 * - `force`: Overwrite the destination if it exists, and overwrite existing readonly destination files. *(unconfirmed)*
 * - `preserveTimestamps`: Preserve file timestamps.
 * - `recursive`: If `true`, copies directories recursively.
 */
export declare function cpSync(this: V_Context, source: fs.PathLike, destination: fs.PathLike, opts?: fs.CopySyncOptions): void;
/**
 * Synchronous statfs(2). Returns information about the mounted file system which contains path.
 * In case of an error, the err.code will be one of Common System Errors.
 * @param path A path to an existing file or directory on the file system to be queried.
 */
export declare function statfsSync(this: V_Context, path: fs.PathLike, options?: fs.StatFsOptions & {
    bigint?: false;
}): fs.StatsFs;
export declare function statfsSync(this: V_Context, path: fs.PathLike, options: fs.StatFsOptions & {
    bigint: true;
}): fs.BigIntStatsFs;
export declare function statfsSync(this: V_Context, path: fs.PathLike, options?: fs.StatFsOptions): fs.StatsFs | fs.BigIntStatsFs;
/**
 * Retrieves the files matching the specified pattern.
 */
export declare function globSync(pattern: string | string[]): string[];
export declare function globSync(pattern: string | string[], options: fs.GlobOptionsWithFileTypes): Dirent[];
export declare function globSync(pattern: string | string[], options: fs.GlobOptionsWithoutFileTypes): string[];
export declare function globSync(pattern: string | string[], options: fs.GlobOptions): Dirent[] | string[];
