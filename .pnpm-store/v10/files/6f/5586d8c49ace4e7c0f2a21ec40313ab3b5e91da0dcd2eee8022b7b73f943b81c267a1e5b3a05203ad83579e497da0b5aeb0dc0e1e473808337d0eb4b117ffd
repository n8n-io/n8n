import type { FileSystem, FileSystemMetadata } from '../internal/filesystem.js';
import type { StatsLike } from '../stats.js';
import type { Mixin } from './shared.js';
/**
 * @internal
 */
export interface ReadonlyMixin {
    metadata(): FileSystemMetadata;
    rename(oldPath: string, newPath: string): Promise<never>;
    renameSync(oldPath: string, newPath: string): never;
    createFile(path: string, flag: string, mode: number): Promise<never>;
    createFileSync(path: string, flag: string, mode: number): never;
    unlink(path: string): Promise<never>;
    unlinkSync(path: string): never;
    rmdir(path: string): Promise<never>;
    rmdirSync(path: string): never;
    mkdir(path: string, mode: number): Promise<never>;
    mkdirSync(path: string, mode: number): never;
    link(srcpath: string, dstpath: string): Promise<never>;
    linkSync(srcpath: string, dstpath: string): never;
    sync(path: string, data: Uint8Array, stats: Readonly<StatsLike<number>>): Promise<never>;
    syncSync(path: string, data: Uint8Array, stats: Readonly<StatsLike<number>>): never;
    write(path: string, buffer: Uint8Array, offset: number): Promise<never>;
    writeSync(path: string, buffer: Uint8Array, offset: number): Promise<never>;
}
/**
 * Implements the non-readonly methods to throw `EROFS`
 * @category Internals
 */
export declare function Readonly<T extends abstract new (...args: any[]) => FileSystem>(FS: T): Mixin<T, ReadonlyMixin>;
