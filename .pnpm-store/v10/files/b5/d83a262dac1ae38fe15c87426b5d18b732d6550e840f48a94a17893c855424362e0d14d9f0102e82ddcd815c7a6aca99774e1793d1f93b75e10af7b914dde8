import type { InodeLike } from './inode.js';
import { Inode } from './inode.js';
import type { UsageInfo } from './filesystem.js';
/**
 * An Index in JSON form
 * @internal
 */
export interface IndexData {
    version: number;
    maxSize?: number;
    entries: Record<string, InodeLike>;
}
export declare const version = 1;
/**
 * An index of file metadata
 * @category Internals
 * @internal
 */
export declare class Index extends Map<string, Inode> {
    maxSize: number;
    /**
     * Converts the index to JSON
     */
    toJSON(): IndexData;
    /**
     * Converts the index to a string
     */
    toString(): string;
    /**
     * Get the size in bytes of the index (including the size reported for each entry)
     */
    get byteSize(): number;
    usage(): UsageInfo;
    pathOf(id: number): string | undefined;
    getByID(id: number): Inode | undefined;
    entryByID(id: number): {
        path: string;
        inode: Inode;
    } | undefined;
    directoryEntries(path: string): Record<string, number>;
    /**
     * Get the next available ID in the index
     * @internal
     */
    _alloc(): number;
    /**
     * Gets a list of entries for each directory in the index.
     * Use
     */
    directories(): Map<string, Record<string, number>>;
    /**
     * Loads the index from JSON data
     */
    fromJSON(json: IndexData): this;
    /**
     * Parses an index from a string
     */
    static parse(data: string): Index;
}
