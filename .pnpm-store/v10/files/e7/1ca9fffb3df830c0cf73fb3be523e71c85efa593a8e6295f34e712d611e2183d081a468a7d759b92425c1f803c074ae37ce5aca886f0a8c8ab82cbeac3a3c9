export interface Options {
    /**
     * If true, use multiple buffers to cache a file.
     * This is useful when working with small parts of large files,
     * since we don't need to allocate a large buffer that is mostly unused
     * @default true
     */
    sparse?: boolean;
    /**
     * The threshold for whether to combine regions or not
     * @see Region
     * @default 0xfff // 4 KiB
     */
    regionGapThreshold?: number;
    /**
     * Whether to only update the cache when changing or deleting resources
     * @default false
     */
    cacheOnly?: boolean;
}
export type Range = {
    start: number;
    end: number;
};
export interface Region {
    /** The region's offset from the start of the resource */
    offset: number;
    /** Ranges cached in this region. These are absolute! */
    ranges: Range[];
    /** Data for this region */
    data: Uint8Array;
}
/**
 * The cache for a specific resource
 * @internal
 */
export declare class Resource<ID> {
    /** The resource ID */
    readonly id: ID;
    protected _size: number;
    protected readonly options: Options;
    /** Regions used to reduce unneeded allocations. Think of sparse arrays. */
    readonly regions: Region[];
    /** The full size of the resource */
    get size(): number;
    set size(value: number);
    constructor(
    /** The resource ID */
    id: ID, _size: number, options: Options, resources?: Map<ID, Resource<ID> | undefined>);
    /** Combines adjacent regions and combines adjacent ranges within a region */
    collect(): void;
    /** Takes an initial range and finds the sub-ranges that are not in the cache */
    missing(start: number, end: number): Range[];
    /**
     * Get the cached sub-ranges of an initial range.
     * This is conceptually the inverse of `missing`.
     */
    cached(start: number, end: number): Range[];
    /** Get the region who's ranges include an offset */
    regionAt(offset: number): Region | undefined;
    /** Add new data to the cache at given specified offset */
    add(data: Uint8Array, offset: number): this;
}
