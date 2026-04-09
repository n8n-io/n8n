import type * as fs from 'node:fs';
import type { V_Context } from '../context.js';
import type { Stats } from '../stats.js';
import type { Callback } from '../utils.js';
import type { Dir, Dirent } from './dir.js';
import type { FileContents } from './types.js';
import { Buffer } from 'buffer';
import { ErrnoError } from '../internal/error.js';
import { BigIntStats } from '../stats.js';
import { ReadStream, WriteStream, type ReadStreamOptions, type WriteStreamOptions } from './streams.js';
import { FSWatcher } from './watchers.js';
/**
 * Asynchronous rename. No arguments other than a possible exception are given to the completion callback.
 */
export declare function rename(this: V_Context, oldPath: fs.PathLike, newPath: fs.PathLike, cb?: Callback): void;
/**
 * Test whether or not `path` exists by checking with the file system.
 * Then call the callback argument with either true or false.
 * @deprecated Use {@link stat} or {@link access} instead.
 */
export declare function exists(this: V_Context, path: fs.PathLike, cb?: (exists: boolean) => unknown): void;
export declare function stat(this: V_Context, path: fs.PathLike, callback: Callback<[Stats]>): void;
export declare function stat(this: V_Context, path: fs.PathLike, options: {
    bigint?: false;
}, callback: Callback<[Stats]>): void;
export declare function stat(this: V_Context, path: fs.PathLike, options: {
    bigint: true;
}, callback: Callback<[BigIntStats]>): void;
export declare function stat(this: V_Context, path: fs.PathLike, options: fs.StatOptions, callback: Callback<[Stats] | [BigIntStats]>): void;
/**
 * Asynchronous `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 */
export declare function lstat(this: V_Context, path: fs.PathLike, callback: Callback<[Stats]>): void;
export declare function lstat(this: V_Context, path: fs.PathLike, options: fs.StatOptions & {
    bigint?: false;
}, callback: Callback<[Stats]>): void;
export declare function lstat(this: V_Context, path: fs.PathLike, options: fs.StatOptions & {
    bigint: true;
}, callback: Callback<[BigIntStats]>): void;
export declare function lstat(this: V_Context, path: fs.PathLike, options: fs.StatOptions, callback: Callback<[Stats | BigIntStats]>): void;
export declare function truncate(this: V_Context, path: fs.PathLike, cb?: Callback): void;
export declare function truncate(this: V_Context, path: fs.PathLike, len: number, cb?: Callback): void;
export declare function unlink(this: V_Context, path: fs.PathLike, cb?: Callback): void;
/**
 * Asynchronous file open.
 * Exclusive mode ensures that path is newly created.
 * Mode defaults to `0644`
 *
 * `flags` can be:
 *
 * * `'r'` - Open file for reading. An exception occurs if the file does not exist.
 * * `'r+'` - Open file for reading and writing. An exception occurs if the file does not exist.
 * * `'rs'` - Open file for reading in synchronous mode. Instructs the filesystem to not cache writes.
 * * `'rs+'` - Open file for reading and writing, and opens the file in synchronous mode.
 * * `'w'` - Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
 * * `'wx'` - Like 'w' but opens the file in exclusive mode.
 * * `'w+'` - Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
 * * `'wx+'` - Like 'w+' but opens the file in exclusive mode.
 * * `'a'` - Open file for appending. The file is created if it does not exist.
 * * `'ax'` - Like 'a' but opens the file in exclusive mode.
 * * `'a+'` - Open file for reading and appending. The file is created if it does not exist.
 * * `'ax+'` - Like 'a+' but opens the file in exclusive mode.
 *
 * @see http://www.manpagez.com/man/2/open/
 */
export declare function open(this: V_Context, path: fs.PathLike, flag: string, cb?: Callback<[number]>): void;
export declare function open(this: V_Context, path: fs.PathLike, flag: string, mode: number | string, cb?: Callback<[number]>): void;
/**
 * Asynchronously reads the entire contents of a file.
 * @option encoding The string encoding for the file contents. Defaults to `null`.
 * @option flag Defaults to `'r'`.
 * @param cb If no encoding is specified, then the raw buffer is returned.
 */
export declare function readFile(this: V_Context, filename: fs.PathLike, cb: Callback<[Uint8Array]>): void;
export declare function readFile(this: V_Context, filename: fs.PathLike, options: {
    flag?: string;
}, callback?: Callback<[Uint8Array]>): void;
export declare function readFile(this: V_Context, filename: fs.PathLike, options: {
    encoding: BufferEncoding;
    flag?: string;
} | BufferEncoding, cb: Callback<[string]>): void;
/**
 * Asynchronously writes data to a file, replacing the file if it already
 * exists.
 *
 * The encoding option is ignored if data is a buffer.
 *
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'w'`.
 */
export declare function writeFile(this: V_Context, filename: fs.PathLike, data: FileContents, cb?: Callback): void;
export declare function writeFile(this: V_Context, filename: fs.PathLike, data: FileContents, encoding?: BufferEncoding, cb?: Callback): void;
export declare function writeFile(this: V_Context, filename: fs.PathLike, data: FileContents, options?: fs.WriteFileOptions, cb?: Callback): void;
/**
 * Asynchronously append data to a file, creating the file if it not yet
 * exists.
 *
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'a'`.
 */
export declare function appendFile(this: V_Context, filename: fs.PathLike, data: FileContents, cb?: Callback): void;
export declare function appendFile(this: V_Context, filename: fs.PathLike, data: FileContents, options?: fs.EncodingOption & {
    mode?: fs.Mode;
    flag?: fs.OpenMode;
}, cb?: Callback): void;
export declare function appendFile(this: V_Context, filename: fs.PathLike, data: FileContents, encoding?: BufferEncoding, cb?: Callback): void;
/**
 * Asynchronous `fstat`.
 * `fstat()` is identical to `stat()`, except that the file to be stat-ed is specified by the file descriptor `fd`.
 */
export declare function fstat(this: V_Context, fd: number, cb: Callback<[Stats]>): void;
export declare function fstat(this: V_Context, fd: number, options: fs.StatOptions & {
    bigint?: false;
}, cb: Callback<[Stats]>): void;
export declare function fstat(this: V_Context, fd: number, options: fs.StatOptions & {
    bigint: true;
}, cb: Callback<[BigIntStats]>): void;
export declare function close(this: V_Context, fd: number, cb?: Callback): void;
export declare function ftruncate(this: V_Context, fd: number, cb?: Callback): void;
export declare function ftruncate(this: V_Context, fd: number, len?: number, cb?: Callback): void;
export declare function fsync(this: V_Context, fd: number, cb?: Callback): void;
export declare function fdatasync(this: V_Context, fd: number, cb?: Callback): void;
/**
 * Write buffer to the file specified by `fd`.
 * Note that it is unsafe to use fs.write multiple times on the same file without waiting for the callback.
 * @param buffer Uint8Array containing the data to write to the file.
 * @param offset Offset in the buffer to start reading data from.
 * @param length The amount of bytes to write to the file.
 * @param position Offset from the beginning of the file where this data should be written.
 * If position is null, the data will be written at the current position.
 * @param cb The number specifies the number of bytes written into the file.
 */
export declare function write(this: V_Context, fd: number, buffer: Uint8Array, offset: number, length: number, cb?: Callback<[number, Uint8Array]>): void;
export declare function write(this: V_Context, fd: number, buffer: Uint8Array, offset: number, length: number, position?: number, cb?: Callback<[number, Uint8Array]>): void;
export declare function write(this: V_Context, fd: number, data: FileContents, cb?: Callback<[number, string]>): void;
export declare function write(this: V_Context, fd: number, data: FileContents, position?: number, cb?: Callback<[number, string]>): void;
export declare function write(this: V_Context, fd: number, data: FileContents, position: number | null, encoding: BufferEncoding, cb?: Callback<[number, string]>): void;
/**
 * Read data from the file specified by `fd`.
 * @param buffer The buffer that the data will be written to.
 * @param offset The offset within the buffer where writing will start.
 * @param length An integer specifying the number of bytes to read.
 * @param position An integer specifying where to begin reading from in the file.
 * If position is null, data will be read from the current file position.
 * @param cb The number is the number of bytes read
 */
export declare function read(this: V_Context, fd: number, buffer: Uint8Array, offset: number, length: number, position?: number, cb?: Callback<[number, Uint8Array]>): void;
export declare function fchown(this: V_Context, fd: number, uid: number, gid: number, cb?: Callback): void;
export declare function fchmod(this: V_Context, fd: number, mode: string | number, cb: Callback): void;
/**
 * Change the file timestamps of a file referenced by the supplied file descriptor.
 */
export declare function futimes(this: V_Context, fd: number, atime: number | Date, mtime: number | Date, cb?: Callback): void;
export declare function rmdir(this: V_Context, path: fs.PathLike, cb?: Callback): void;
/**
 * Asynchronous `mkdir`.
 * @param mode defaults to `0777`
 */
export declare function mkdir(this: V_Context, path: fs.PathLike, mode?: fs.Mode, cb?: Callback): void;
/**
 * Asynchronous `readdir`. Reads the contents of a directory.
 * The callback gets two arguments `(err, files)` where `files` is an array of
 * the names of the files in the directory excluding `'.'` and `'..'`.
 */
export declare function readdir(this: V_Context, path: fs.PathLike, cb: Callback<[string[]]>): void;
export declare function readdir(this: V_Context, path: fs.PathLike, options: {
    withFileTypes?: false;
}, cb: Callback<[string[]]>): void;
export declare function readdir(this: V_Context, path: fs.PathLike, options: {
    withFileTypes: true;
}, cb: Callback<[Dirent[]]>): void;
export declare function link(this: V_Context, existing: fs.PathLike, newpath: fs.PathLike, cb?: Callback): void;
/**
 * Asynchronous `symlink`.
 * @param target target path
 * @param path link path
 * Type defaults to file
 */
export declare function symlink(this: V_Context, target: fs.PathLike, path: fs.PathLike, cb?: Callback): void;
export declare function symlink(this: V_Context, target: fs.PathLike, path: fs.PathLike, type?: fs.symlink.Type, cb?: Callback): void;
export declare function readlink(this: V_Context, path: fs.PathLike, callback: Callback<[string]>): void;
export declare function readlink(this: V_Context, path: fs.PathLike, options: fs.BufferEncodingOption, callback: Callback<[Uint8Array]>): void;
export declare function readlink(this: V_Context, path: fs.PathLike, options: fs.EncodingOption, callback: Callback<[string | Uint8Array]>): void;
export declare function readlink(this: V_Context, path: fs.PathLike, options: fs.EncodingOption, callback: Callback<[string]>): void;
export declare function chown(this: V_Context, path: fs.PathLike, uid: number, gid: number, cb?: Callback): void;
export declare function lchown(this: V_Context, path: fs.PathLike, uid: number, gid: number, cb?: Callback): void;
export declare function chmod(this: V_Context, path: fs.PathLike, mode: number | string, cb?: Callback): void;
export declare function lchmod(this: V_Context, path: fs.PathLike, mode: number | string, cb?: Callback): void;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export declare function utimes(this: V_Context, path: fs.PathLike, atime: number | Date, mtime: number | Date, cb?: Callback): void;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export declare function lutimes(this: V_Context, path: fs.PathLike, atime: number | Date, mtime: number | Date, cb?: Callback): void;
/**
 * Asynchronous `realpath`. The callback gets two arguments
 * `(err, resolvedPath)`. May use `process.cwd` to resolve relative paths.
 */
export declare function realpath(this: V_Context, path: fs.PathLike, cb?: Callback<[string]>): void;
export declare function realpath(this: V_Context, path: fs.PathLike, options: fs.EncodingOption, cb: Callback<[string]>): void;
export declare function access(this: V_Context, path: fs.PathLike, cb: Callback): void;
export declare function access(this: V_Context, path: fs.PathLike, mode: number, cb: Callback): void;
/**
 * Watch for changes on a file. The callback listener will be called each time the file is accessed.
 *
 * The `options` argument may be omitted. If provided, it should be an object with a `persistent` boolean and an `interval` number specifying the polling interval in milliseconds.
 *
 * When a change is detected, the `listener` callback is called with the current and previous `Stats` objects.
 *
 * @param path The path to the file to watch.
 * @param options Optional options object specifying `persistent` and `interval`.
 * @param listener The callback listener to be called when the file changes.
 */
export declare function watchFile(this: V_Context, path: fs.PathLike, listener: (curr: Stats, prev: Stats) => void): void;
export declare function watchFile(this: V_Context, path: fs.PathLike, options: {
    persistent?: boolean;
    interval?: number;
}, listener: (curr: Stats, prev: Stats) => void): void;
/**
 * Stop watching for changes on a file.
 *
 * If the `listener` is specified, only that particular listener is removed.
 * If no `listener` is specified, all listeners are removed, and the file is no longer watched.
 *
 * @param path The path to the file to stop watching.
 * @param listener Optional listener to remove.
 */
export declare function unwatchFile(this: V_Context, path: fs.PathLike, listener?: (curr: Stats, prev: Stats) => void): void;
export declare function watch(this: V_Context, path: fs.PathLike, listener?: (event: string, filename: string) => any): FSWatcher;
export declare function watch(this: V_Context, path: fs.PathLike, options: {
    persistent?: boolean;
}, listener?: (event: string, filename: string) => any): FSWatcher;
/**
 * Opens a file in read mode and creates a Node.js-like ReadStream.
 *
 * @param path The path to the file to be opened.
 * @param options Options for the ReadStream and file opening (e.g., `encoding`, `highWaterMark`, `mode`).
 * @returns A ReadStream object for interacting with the file's contents.
 */
export declare function createReadStream(this: V_Context, path: fs.PathLike, options?: BufferEncoding | ReadStreamOptions): ReadStream;
/**
 * Opens a file in write mode and creates a Node.js-like WriteStream.
 *
 * @param path The path to the file to be opened.
 * @param options Options for the WriteStream and file opening (e.g., `encoding`, `highWaterMark`, `mode`).
 * @returns A WriteStream object for writing to the file.
 */
export declare function createWriteStream(this: V_Context, path: fs.PathLike, options?: BufferEncoding | WriteStreamOptions): WriteStream;
export declare function rm(this: V_Context, path: fs.PathLike, callback: Callback): void;
export declare function rm(this: V_Context, path: fs.PathLike, options: fs.RmOptions, callback: Callback): void;
/**
 * Asynchronously creates a unique temporary directory.
 * Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
 */
export declare function mkdtemp(this: V_Context, prefix: string, callback: Callback<[string]>): void;
export declare function mkdtemp(this: V_Context, prefix: string, options: fs.EncodingOption, callback: Callback<[string]>): void;
export declare function mkdtemp(this: V_Context, prefix: string, options: fs.BufferEncodingOption, callback: Callback<[Buffer]>): void;
export declare function copyFile(this: V_Context, src: fs.PathLike, dest: fs.PathLike, callback: Callback): void;
export declare function copyFile(this: V_Context, src: fs.PathLike, dest: fs.PathLike, flags: number, callback: Callback): void;
type readvCb = Callback<[number, NodeJS.ArrayBufferView[]]>;
export declare function readv(this: V_Context, fd: number, buffers: NodeJS.ArrayBufferView[], cb: readvCb): void;
export declare function readv(this: V_Context, fd: number, buffers: NodeJS.ArrayBufferView[], position: number, cb: readvCb): void;
type writevCb = Callback<[number, NodeJS.ArrayBufferView[]]>;
export declare function writev(this: V_Context, fd: number, buffers: Uint8Array[], cb: writevCb): void;
export declare function writev(this: V_Context, fd: number, buffers: Uint8Array[], position: number, cb: writevCb): void;
export declare function opendir(this: V_Context, path: fs.PathLike, cb: Callback<[Dir]>): void;
export declare function opendir(this: V_Context, path: fs.PathLike, options: fs.OpenDirOptions, cb: Callback<[Dir]>): void;
export declare function cp(this: V_Context, source: fs.PathLike, destination: fs.PathLike, callback: Callback): void;
export declare function cp(this: V_Context, source: fs.PathLike, destination: fs.PathLike, opts: fs.CopyOptions, callback: Callback): void;
export declare function statfs(this: V_Context, path: fs.PathLike, callback: Callback<[fs.StatsFs]>): void;
export declare function statfs(this: V_Context, path: fs.PathLike, options: fs.StatFsOptions & {
    bigint?: false;
}, callback: Callback<[fs.StatsFs]>): void;
export declare function statfs(this: V_Context, path: fs.PathLike, options: fs.StatFsOptions & {
    bigint: true;
}, callback: Callback<[fs.BigIntStatsFs]>): void;
export declare function openAsBlob(this: V_Context, path: fs.PathLike, options?: fs.OpenAsBlobOptions): Promise<Blob>;
type GlobCallback<Args extends unknown[]> = (e: ErrnoError | null, ...args: Args) => unknown;
/**
 * Retrieves the files matching the specified pattern.
 */
export declare function glob(this: V_Context, pattern: string | string[], callback: GlobCallback<[string[]]>): void;
export declare function glob(this: V_Context, pattern: string | string[], options: fs.GlobOptionsWithFileTypes, callback: GlobCallback<[Dirent[]]>): void;
export declare function glob(this: V_Context, pattern: string | string[], options: fs.GlobOptionsWithoutFileTypes, callback: GlobCallback<[string[]]>): void;
export declare function glob(this: V_Context, pattern: string | string[], options: fs.GlobOptions, callback: GlobCallback<[Dirent[] | string[]]>): void;
export {};
