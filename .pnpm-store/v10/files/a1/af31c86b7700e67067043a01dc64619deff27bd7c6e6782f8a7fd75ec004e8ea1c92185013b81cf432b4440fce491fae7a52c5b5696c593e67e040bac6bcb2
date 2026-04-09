import type * as Node from 'node:fs';
import type { V_Context } from './context.js';
import type { InodeFields, InodeLike } from './internal/inode.js';
import * as c from './vfs/constants.js';
/**
 * Indicates the type of a file. Applied to 'mode'.
 * @deprecated
 */
export type FileType = typeof c.S_IFREG | typeof c.S_IFDIR | typeof c.S_IFLNK;
export interface StatsLike<T extends number | bigint = number | bigint> {
    /**
     * Size of the item in bytes.
     * For directories/symlinks, this is normally the size of the struct that represents the item.
     */
    size: T;
    /**
     * Unix-style file mode (e.g. 0o644) that includes the item type
     */
    mode: T;
    /**
     * Time of last access, since epoch
     */
    atimeMs: T;
    /**
     * Time of last modification, since epoch
     */
    mtimeMs: T;
    /**
     * Time of last time file status was changed, since epoch
     */
    ctimeMs: T;
    /**
     * Time of file creation, since epoch
     */
    birthtimeMs: T;
    /**
     * The id of the user that owns the file
     */
    uid: T;
    /**
     * The id of the group that owns the file
     */
    gid: T;
    /**
     * Inode number
     */
    ino: T;
    /**
     * Number of hard links
     */
    nlink: T;
}
/**
 * Provides information about a particular entry in the file system.
 * Common code used by both Stats and BigIntStats.
 */
export declare abstract class StatsCommon<T extends number | bigint> implements Node.StatsBase<T>, StatsLike {
    protected abstract _isBigint: T extends bigint ? true : false;
    protected _convert(arg: number | bigint | string | boolean): T;
    get blocks(): T;
    set blocks(value: T);
    /**
     * Unix-style file mode (e.g. 0o644) that includes the type of the item.
     */
    mode: T;
    /**
     * ID of device containing file
     */
    dev: T;
    /**
     * Inode number
     */
    ino: T;
    /**
     * Device ID (if special file)
     */
    rdev: T;
    /**
     * Number of hard links
     */
    nlink: T;
    /**
     * Block size for file system I/O
     */
    blksize: T;
    /**
     * User ID of owner
     */
    uid: T;
    /**
     * Group ID of owner
     */
    gid: T;
    /**
     * Some file systems stash data on stats objects.
     * @todo [BREAKING] Remove this
     * @deprecated @hidden
     */
    fileData?: unknown;
    /**
     * Time of last access, since epoch
     */
    atimeMs: T;
    get atime(): Date;
    set atime(value: Date);
    /**
     * Time of last modification, since epoch
     */
    mtimeMs: T;
    get mtime(): Date;
    set mtime(value: Date);
    /**
     * Time of last time file status was changed, since epoch
     */
    ctimeMs: T;
    get ctime(): Date;
    set ctime(value: Date);
    /**
     * Time of file creation, since epoch
     */
    birthtimeMs: T;
    get birthtime(): Date;
    set birthtime(value: Date);
    /**
     * Size of the item in bytes.
     * For directories/symlinks, this is normally the size of the struct that represents the item.
     */
    size: T;
    data?: number;
    flags?: number;
    /**
     * Creates a new stats instance from a stats-like object. Can be used to copy stats (note)
     */
    constructor({ atimeMs, mtimeMs, ctimeMs, birthtimeMs, uid, gid, size, mode, ino, ...rest }?: Partial<InodeLike>);
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    isSocket(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isFIFO(): boolean;
    toJSON(): StatsLike<T> & InodeFields;
    /**
     * Checks if a given user/group has access to this item
     * @param mode The requested access, combination of W_OK, R_OK, and X_OK
     * @returns True if the request has access, false if the request does not
     * @internal
     */
    hasAccess(mode: number, context?: V_Context): boolean;
    /**
     * Change the mode of the file.
     * We use this helper function to prevent messing up the type of the file.
     * @internal @deprecated
     */
    chmod(mode: number): void;
    /**
     * Change the owner user/group of the file.
     * This function makes sure it is a valid UID/GID (that is, a 32 unsigned int)
     * @internal @deprecated
     */
    chown(uid: number, gid: number): void;
    get atimeNs(): bigint;
    get mtimeNs(): bigint;
    get ctimeNs(): bigint;
    get birthtimeNs(): bigint;
}
/**
 * @hidden @internal
 */
export declare function _chown(stats: Partial<StatsLike<number>>, uid: number, gid: number): void;
/**
 * Implementation of Node's `Stats`.
 *
 * Attribute descriptions are from `man 2 stat'
 * @see http://nodejs.org/api/fs.html#fs_class_fs_stats
 * @see http://man7.org/linux/man-pages/man2/stat.2.html
 */
export declare class Stats extends StatsCommon<number> implements Node.Stats, StatsLike {
    protected _isBigint: false;
}
/**
 * Stats with bigint
 */
export declare class BigIntStats extends StatsCommon<bigint> implements Node.BigIntStats, StatsLike {
    protected _isBigint: true;
}
/**
 * Determines if the file stats have changed by comparing relevant properties.
 *
 * @param left The previous stats.
 * @param right The current stats.
 * @returns `true` if stats have changed; otherwise, `false`.
 * @internal
 */
export declare function isStatsEqual<T extends number | bigint>(left: StatsCommon<T>, right: StatsCommon<T>): boolean;
/** @internal */
export declare const ZenFsType = 525687744115;
/**
 * @hidden
 */
export declare class StatsFs implements Node.StatsFsBase<number> {
    /** Type of file system. */
    type: number;
    /**  Optimal transfer block size. */
    bsize: number;
    /**  Total data blocks in file system. */
    blocks: number;
    /** Free blocks in file system. */
    bfree: number;
    /** Available blocks for unprivileged users */
    bavail: number;
    /** Total file nodes in file system. */
    files: number;
    /** Free file nodes in file system. */
    ffree: number;
}
/**
 * @hidden
 */
export declare class BigIntStatsFs implements Node.StatsFsBase<bigint> {
    /** Type of file system. */
    type: bigint;
    /**  Optimal transfer block size. */
    bsize: bigint;
    /**  Total data blocks in file system. */
    blocks: bigint;
    /** Free blocks in file system. */
    bfree: bigint;
    /** Available blocks for unprivileged users */
    bavail: bigint;
    /** Total file nodes in file system. */
    files: bigint;
    /** Free file nodes in file system. */
    ffree: bigint;
}
