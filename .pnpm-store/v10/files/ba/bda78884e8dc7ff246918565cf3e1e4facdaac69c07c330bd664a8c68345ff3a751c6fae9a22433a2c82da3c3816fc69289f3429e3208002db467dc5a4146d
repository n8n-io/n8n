import { Stats, type StatsLike } from '../stats.js';
/**
 * Root inode
 * @hidden
 */
export declare const rootIno = 0;
/**
 * @internal @hidden
 */
export interface InodeFields {
    data?: number;
    flags?: number;
}
/**
 * @category Internals
 * @internal
 */
export interface InodeLike extends StatsLike<number>, InodeFields {
}
/**
 * @internal @hidden
 */
export declare const _inode_fields: readonly ["ino", "data", "size", "mode", "flags", "nlink", "uid", "gid", "atimeMs", "birthtimeMs", "mtimeMs", "ctimeMs"];
/**
 * Represents which version of the `Inode` format we are on.
 * 1. 58 bytes. The first member was called `ino` but used as the ID for data.
 * 2. 66 bytes. Renamed the first member from `ino` to `data` and added a separate `ino` field
 * 3. (current) 72 bytes. Changed the ID fields from 64 to 32 bits and added `flags`.
 * @internal @hidden
 */
export declare const _inode_version = 3;
/**
 * Generic inode definition that can easily be serialized.
 * @category Internals
 * @internal
 * @todo [BREAKING] Remove 58 byte Inode upgrade path
 */
export declare class Inode implements InodeLike {
    constructor(data?: ArrayBufferLike | ArrayBufferView | Readonly<Partial<InodeLike>>);
    data: number;
    /** For future use */
    __data_old: number;
    size: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    atimeMs: number;
    birthtimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    ino: number;
    /** For future use */
    __ino_old: number;
    flags: number;
    /** For future use */
    __padding: number;
    toString(): string;
    toJSON(): InodeLike;
    /**
     * Handy function that converts the Inode to a Node Stats object.
     */
    toStats(): Stats;
    /**
     * Updates the Inode using information from the stats object. Used by file
     * systems at sync time, e.g.:
     * - Program opens file and gets a File object.
     * - Program mutates file. File object is responsible for maintaining
     *   metadata changes locally -- typically in a Stats object.
     * - Program closes file. File object's metadata changes are synced with the
     *   file system.
     * @returns whether any changes have occurred.
     */
    update(data?: Partial<Readonly<InodeLike>>): boolean;
}
/**
 * @internal @hidden
 */
export declare const __inode_sz: number;
