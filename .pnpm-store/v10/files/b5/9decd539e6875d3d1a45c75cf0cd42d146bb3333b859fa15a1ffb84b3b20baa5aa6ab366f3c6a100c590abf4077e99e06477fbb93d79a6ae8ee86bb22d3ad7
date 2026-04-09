import type { UsageInfo } from '../internal/filesystem.js';
import { StoreFS } from './store/fs.js';
import { SyncMapTransaction, type SyncMapStore } from './store/map.js';
import type { Store } from './store/store.js';
declare class MetadataEntry {
    /** Inode or data ID */
    id: number;
    /** Reserved for 64-bit offset expansion */
    protected offset_: number;
    /** Offset into the buffer the data is stored at. */
    offset: number;
    /** The size of the data */
    size: number;
}
/**
 * A block of metadata for a single-buffer file system.
 * This metadata maps IDs (for inodes and data) to actual offsets in the buffer.
 * This is done since IDs are not guaranteed to be sequential.
 */
declare class MetadataBlock {
    protected readonly superblock: SuperBlock;
    offset: number;
    constructor(superblock: SuperBlock, offset?: number);
    /**
     * The crc32c checksum for the metadata block.
     * @privateRemarks Keep this first!
     */
    checksum: number;
    /** The (last) time this metadata block was updated */
    timestamp: number;
    /** Reserved for 64-bit offset expansion */
    protected previous_offset_: number;
    /** Offset to the previous metadata block */
    previous_offset: number;
    protected _previous?: MetadataBlock;
    get previous(): MetadataBlock | undefined;
    /** Metadata entries. */
    entries: MetadataEntry[];
}
/**
 * The super block structure for a single-buffer file system
 */
declare class SuperBlock {
    readonly store: SingleBufferStore;
    constructor(store: SingleBufferStore);
    /**
     * The crc32c checksum for the super block.
     * @privateRemarks Keep this first!
     */
    checksum: number;
    /** Signature for the superblock. */
    magic: number;
    /** The version of the on-disk format */
    version: number;
    /** Which format of `Inode` is used */
    inode_format: number;
    /** Flags for the file system. Currently unused */
    flags: number;
    /** The number of used bytes, including the super block and metadata */
    used_bytes: bigint;
    /** The total size of the entire file system, including the super block and metadata */
    total_bytes: bigint;
    /** An ID for this file system */
    id: bigint;
    /**
     * The size in bytes of a metadata block.
     * Not currently configurable.
     */
    metadata_block_size: number;
    /** Reserved for 64-bit offset expansion */
    protected metadata_offset_: number;
    /** Offset of the current metadata block */
    metadata_offset: number;
    metadata: MetadataBlock;
    /** An optional label for the file system */
    label: string;
    /** Padded to 256 bytes */
    _padding: number[];
    /**
     * Rotate out the current metadata block.
     * Allocates a new metadata block, moves the current one to backup,
     * and updates used_bytes accordingly.
     * @returns the new metadata block
     */
    rotateMetadata(): MetadataBlock;
    /**
     * Checks to see if `length` bytes are unused, starting at `offset`.
     * @internal Not for external use!
     */
    isUnused(offset: number, length: number): boolean;
}
/**
 *
 * @category Stores and Transactions
 */
export declare class SingleBufferStore implements SyncMapStore {
    readonly flags: readonly [];
    readonly name = "sbfs";
    readonly id = 1935828595;
    protected superblock: SuperBlock;
    /**
     * @internal @hidden
     */
    readonly _view: DataView;
    /**
     * @internal @hidden
     */
    readonly _buffer: Uint8Array;
    constructor(buffer: ArrayBufferLike | ArrayBufferView);
    /**
     * Update a block's checksum and write it to the store's buffer.
     * @internal @hidden
     */
    _write(value: SuperBlock | MetadataBlock): void;
    keys(): Iterable<number>;
    get(id: number): Uint8Array | undefined;
    set(id: number, data: Uint8Array): void;
    delete(id: number): void;
    _fs?: StoreFS<Store> | undefined;
    sync(): Promise<void>;
    usage(): UsageInfo;
    transaction(): SyncMapTransaction;
}
/**
 * Options for the `SingleBuffer` backend
 * @category Backends and Configuration
 */
export interface SingleBufferOptions {
    buffer: ArrayBufferLike | ArrayBufferView;
}
declare const _SingleBuffer: {
    readonly name: "SingleBuffer";
    readonly options: {
        readonly buffer: {
            readonly type: "object";
            readonly required: true;
        };
    };
    readonly create: ({ buffer }: SingleBufferOptions) => StoreFS<SingleBufferStore>;
};
type _SingleBuffer = typeof _SingleBuffer;
export interface SingleBuffer extends _SingleBuffer {
}
/**
 * A backend that uses a single buffer for storing data
 * @category Backends and Configuration
 */
export declare const SingleBuffer: SingleBuffer;
export {};
