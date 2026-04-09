import type * as fs from 'node:fs';
import { File } from '../internal/file.js';
import { FileSystem, type UsageInfo } from '../internal/filesystem.js';
import type { InodeLike } from '../internal/inode.js';
import { Stats } from '../stats.js';
export type NodeFS = typeof fs;
/**
 * Passthrough backend options
 * @category Backends and Configuration
 */
export interface PassthroughOptions {
    fs: NodeFS;
    prefix?: string;
}
export declare class PassthroughFS extends FileSystem {
    readonly nodeFS: NodeFS;
    readonly prefix: string;
    constructor(nodeFS: NodeFS, prefix: string);
    usage(): UsageInfo;
    path(path: string): string;
    error(err: unknown, path: string): never;
    /**
     * Rename a file or directory.
     */
    rename(oldPath: string, newPath: string): Promise<void>;
    /**
     * Rename a file or directory synchronously.
     */
    renameSync(oldPath: string, newPath: string): void;
    /**
     * Get file statistics.
     */
    stat(path: string): Promise<Stats>;
    /**
     * Get file statistics synchronously.
     */
    statSync(path: string): Stats;
    /**
     * Open a file.
     */
    openFile(path: string, flag: string): Promise<File>;
    /**
     * Open a file synchronously.
     */
    openFileSync(path: string, flag: string): File;
    /**
     * Unlink (delete) a file.
     */
    unlink(path: string): Promise<void>;
    /**
     * Unlink (delete) a file synchronously.
     */
    unlinkSync(path: string): void;
    /**
     * Create a directory.
     */
    mkdir(path: string, mode: number): Promise<void>;
    /**
     * Create a directory synchronously.
     */
    mkdirSync(path: string, mode: number): void;
    /**
     * Read the contents of a directory.
     */
    readdir(path: string): Promise<string[]>;
    /**
     * Read the contents of a directory synchronously.
     */
    readdirSync(path: string): string[];
    /**
     * Create a file.
     */
    createFile(path: string, flag: string, mode: number): Promise<File>;
    /**
     * Create a file synchronously.
     */
    createFileSync(path: string, flag: string, mode: number): File;
    /**
     * Remove a directory.
     */
    rmdir(path: string): Promise<void>;
    /**
     * Remove a directory synchronously.
     */
    rmdirSync(path: string): void;
    /**
     * Synchronize data to the file system.
     */
    sync(path: string, data: Uint8Array, stats: Readonly<InodeLike>): Promise<void>;
    /**
     * Synchronize data to the file system synchronously.
     */
    syncSync(path: string, data: Uint8Array, stats: Readonly<InodeLike>): void;
    /**
     * Create a hard link.
     */
    link(target: string, link: string): Promise<void>;
    /**
     * Create a hard link synchronously.
     */
    linkSync(target: string, link: string): void;
    read(path: string, buffer: Uint8Array, offset: number, end: number): Promise<void>;
    readSync(path: string, buffer: Uint8Array, offset: number, end: number): void;
    write(path: string, buffer: Uint8Array, offset: number): Promise<void>;
    writeSync(path: string, buffer: Uint8Array, offset: number): void;
}
declare const _Passthrough: {
    readonly name: "Passthrough";
    readonly options: {
        readonly fs: {
            readonly type: "object";
            readonly required: true;
        };
        readonly prefix: {
            readonly type: "string";
            readonly required: false;
        };
    };
    readonly create: ({ fs, prefix }: PassthroughOptions) => PassthroughFS;
};
type _Passthrough = typeof _Passthrough;
export interface Passthrough extends _Passthrough {
}
/**
 * A file system that passes through to another FS
 */
export declare const Passthrough: Passthrough;
export {};
