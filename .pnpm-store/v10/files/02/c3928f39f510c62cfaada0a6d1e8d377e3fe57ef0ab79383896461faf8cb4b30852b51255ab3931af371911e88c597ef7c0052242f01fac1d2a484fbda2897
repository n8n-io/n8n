import type * as fs from 'node:fs';
import type { File } from '../internal/file.js';
import type { FileSystem } from '../internal/filesystem.js';
import type { Stats } from '../stats.js';
import { type BoundContext, type V_Context } from '../context.js';
import { ErrnoError } from '../internal/error.js';
import { type AbsolutePath } from './path.js';
/**
 * @internal @hidden
 */
export declare const fdMap: Map<number, File>;
/**
 * @internal @hidden
 */
export declare function file2fd(file: File): number;
/**
 * @internal @hidden
 */
export declare function fd2file(fd: number): File;
/**
 * @internal @hidden
 */
export type MountObject = Record<AbsolutePath, FileSystem>;
/**
 * The map of mount points
 * @category Backends and Configuration
 * @internal
 */
export declare const mounts: Map<string, FileSystem>;
/**
 * Mounts the file system at `mountPoint`.
 * @category Backends and Configuration
 * @internal
 */
export declare function mount(mountPoint: string, fs: FileSystem): void;
/**
 * Unmounts the file system at `mountPoint`.
 * @category Backends and Configuration
 */
export declare function umount(mountPoint: string): void;
/**
 * @internal @hidden
 */
export interface ResolvedMount {
    fs: FileSystem;
    path: string;
    mountPoint: string;
    root: string;
}
/**
 * @internal @hidden
 */
export interface ResolvedPath extends ResolvedMount {
    /** The real, absolute path */
    fullPath: string;
    /** Stats */
    stats?: Stats;
}
/**
 * Gets the internal `FileSystem` for the path, then returns it along with the path relative to the FS' root
 * @internal @hidden
 */
export declare function resolveMount(path: string, ctx: V_Context): ResolvedMount;
/**
 * Reverse maps the paths in text from the mounted FileSystem to the global path
 * @internal @hidden
 */
export declare function fixPaths(text: string, paths: Record<string, string>): string;
/**
 * Fix paths in error stacks
 * @internal @hidden
 */
export declare function fixError<E extends ErrnoError>(e: E, paths: Record<string, string>): E;
/**
 * @internal @deprecated
 */
export declare function mountObject(mounts: MountObject): void;
/**
 * @internal @hidden
 */
export declare function _statfs<const T extends boolean>(fs: FileSystem, bigint?: T): T extends true ? fs.BigIntStatsFs : fs.StatsFs;
/**
 * Change the root path
 * @param inPlace if true, this changes the root for the current context instead of creating a new one (if associated with a context).
 * @category Backends and Configuration
 */
export declare function chroot(this: V_Context, path: string, inPlace?: false): BoundContext;
export declare function chroot<T extends V_Context>(this: T, path: string, inPlace: true): T;
