var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { deserialize, member, offsetof, serialize, sizeof, struct, types as t } from 'utilium';
import { crc32c } from 'utilium/checksum.js';
import { Errno, ErrnoError } from '../internal/error.js';
import { _inode_version } from '../internal/inode.js';
import { crit, warn } from '../internal/log.js';
import { StoreFS } from './store/fs.js';
import { SyncMapTransaction } from './store/map.js';
let MetadataEntry = (() => {
    var _a, _b, _c, _d;
    let _classDecorators = [struct()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _offset__decorators;
    let _offset__initializers = [];
    let _offset__extraInitializers = [];
    let _offset_decorators;
    let _offset_initializers = [];
    let _offset_extraInitializers = [];
    let _size_decorators;
    let _size_initializers = [];
    let _size_extraInitializers = [];
    var MetadataEntry = _classThis = class {
        constructor() {
            /** Inode or data ID */
            this.id = __runInitializers(this, _id_initializers, 0);
            /** Reserved for 64-bit offset expansion */
            this.offset_ = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _offset__initializers, 0));
            /** Offset into the buffer the data is stored at. */
            this.offset = (__runInitializers(this, _offset__extraInitializers), __runInitializers(this, _offset_initializers, 0));
            /** The size of the data */
            this.size = (__runInitializers(this, _offset_extraInitializers), __runInitializers(this, _size_initializers, 0));
            __runInitializers(this, _size_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "MetadataEntry");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(_a = t).uint32.bind(_a)];
        _offset__decorators = [(_b = t).uint32.bind(_b)];
        _offset_decorators = [(_c = t).uint32.bind(_c)];
        _size_decorators = [(_d = t).uint32.bind(_d)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _offset__decorators, { kind: "field", name: "offset_", static: false, private: false, access: { has: obj => "offset_" in obj, get: obj => obj.offset_, set: (obj, value) => { obj.offset_ = value; } }, metadata: _metadata }, _offset__initializers, _offset__extraInitializers);
        __esDecorate(null, null, _offset_decorators, { kind: "field", name: "offset", static: false, private: false, access: { has: obj => "offset" in obj, get: obj => obj.offset, set: (obj, value) => { obj.offset = value; } }, metadata: _metadata }, _offset_initializers, _offset_extraInitializers);
        __esDecorate(null, null, _size_decorators, { kind: "field", name: "size", static: false, private: false, access: { has: obj => "size" in obj, get: obj => obj.size, set: (obj, value) => { obj.size = value; } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MetadataEntry = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MetadataEntry = _classThis;
})();
/**
 * Number of entries per block of metadata
 */
const entries_per_block = 255;
/**
 * A block of metadata for a single-buffer file system.
 * This metadata maps IDs (for inodes and data) to actual offsets in the buffer.
 * This is done since IDs are not guaranteed to be sequential.
 */
let MetadataBlock = (() => {
    var _a, _b, _c, _d;
    let _classDecorators = [struct()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _checksum_decorators;
    let _checksum_initializers = [];
    let _checksum_extraInitializers = [];
    let _timestamp_decorators;
    let _timestamp_initializers = [];
    let _timestamp_extraInitializers = [];
    let _previous_offset__decorators;
    let _previous_offset__initializers = [];
    let _previous_offset__extraInitializers = [];
    let _previous_offset_decorators;
    let _previous_offset_initializers = [];
    let _previous_offset_extraInitializers = [];
    let _entries_decorators;
    let _entries_initializers = [];
    let _entries_extraInitializers = [];
    var MetadataBlock = _classThis = class {
        constructor(superblock, offset = 0) {
            this.superblock = superblock;
            this.offset = offset;
            /**
             * The crc32c checksum for the metadata block.
             * @privateRemarks Keep this first!
             */
            this.checksum = __runInitializers(this, _checksum_initializers, 0);
            /** The (last) time this metadata block was updated */
            this.timestamp = (__runInitializers(this, _checksum_extraInitializers), __runInitializers(this, _timestamp_initializers, Date.now()));
            /** Reserved for 64-bit offset expansion */
            this.previous_offset_ = (__runInitializers(this, _timestamp_extraInitializers), __runInitializers(this, _previous_offset__initializers, 0));
            /** Offset to the previous metadata block */
            this.previous_offset = (__runInitializers(this, _previous_offset__extraInitializers), __runInitializers(this, _previous_offset_initializers, 0));
            this._previous = __runInitializers(this, _previous_offset_extraInitializers);
            /** Metadata entries. */
            this.entries = __runInitializers(this, _entries_initializers, Array.from({ length: entries_per_block }, () => new MetadataEntry()));
            __runInitializers(this, _entries_extraInitializers);
            this.superblock = superblock;
            this.offset = offset;
            if (!offset)
                return; // fresh block
            deserialize(this, superblock.store._buffer.subarray(offset, offset + sizeof(MetadataBlock)));
            if (!checksumMatches(this))
                throw crit(new ErrnoError(Errno.EIO, 'SingleBuffer: Checksum mismatch for metadata block at 0x' + offset.toString(16)));
        }
        get previous() {
            var _a;
            if (!this.previous_offset)
                return;
            (_a = this._previous) !== null && _a !== void 0 ? _a : (this._previous = new MetadataBlock(this.superblock, this.previous_offset));
            return this._previous;
        }
    };
    __setFunctionName(_classThis, "MetadataBlock");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _checksum_decorators = [(_a = t).uint32.bind(_a)];
        _timestamp_decorators = [(_b = t).uint32.bind(_b)];
        _previous_offset__decorators = [(_c = t).uint32.bind(_c)];
        _previous_offset_decorators = [(_d = t).uint32.bind(_d)];
        _entries_decorators = [member(MetadataEntry, entries_per_block)];
        __esDecorate(null, null, _checksum_decorators, { kind: "field", name: "checksum", static: false, private: false, access: { has: obj => "checksum" in obj, get: obj => obj.checksum, set: (obj, value) => { obj.checksum = value; } }, metadata: _metadata }, _checksum_initializers, _checksum_extraInitializers);
        __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: obj => "timestamp" in obj, get: obj => obj.timestamp, set: (obj, value) => { obj.timestamp = value; } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
        __esDecorate(null, null, _previous_offset__decorators, { kind: "field", name: "previous_offset_", static: false, private: false, access: { has: obj => "previous_offset_" in obj, get: obj => obj.previous_offset_, set: (obj, value) => { obj.previous_offset_ = value; } }, metadata: _metadata }, _previous_offset__initializers, _previous_offset__extraInitializers);
        __esDecorate(null, null, _previous_offset_decorators, { kind: "field", name: "previous_offset", static: false, private: false, access: { has: obj => "previous_offset" in obj, get: obj => obj.previous_offset, set: (obj, value) => { obj.previous_offset = value; } }, metadata: _metadata }, _previous_offset_initializers, _previous_offset_extraInitializers);
        __esDecorate(null, null, _entries_decorators, { kind: "field", name: "entries", static: false, private: false, access: { has: obj => "entries" in obj, get: obj => obj.entries, set: (obj, value) => { obj.entries = value; } }, metadata: _metadata }, _entries_initializers, _entries_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MetadataBlock = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MetadataBlock = _classThis;
})();
const sb_magic = 0x7a2e7362; // 'z.sb'
/**
 * The super block structure for a single-buffer file system
 */
let SuperBlock = (() => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    let _classDecorators = [struct()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _checksum_decorators;
    let _checksum_initializers = [];
    let _checksum_extraInitializers = [];
    let _magic_decorators;
    let _magic_initializers = [];
    let _magic_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _inode_format_decorators;
    let _inode_format_initializers = [];
    let _inode_format_extraInitializers = [];
    let _flags_decorators;
    let _flags_initializers = [];
    let _flags_extraInitializers = [];
    let _used_bytes_decorators;
    let _used_bytes_initializers = [];
    let _used_bytes_extraInitializers = [];
    let _total_bytes_decorators;
    let _total_bytes_initializers = [];
    let _total_bytes_extraInitializers = [];
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _metadata_block_size_decorators;
    let _metadata_block_size_initializers = [];
    let _metadata_block_size_extraInitializers = [];
    let _metadata_offset__decorators;
    let _metadata_offset__initializers = [];
    let _metadata_offset__extraInitializers = [];
    let _metadata_offset_decorators;
    let _metadata_offset_initializers = [];
    let _metadata_offset_extraInitializers = [];
    let _label_decorators;
    let _label_initializers = [];
    let _label_extraInitializers = [];
    let __padding_decorators;
    let __padding_initializers = [];
    let __padding_extraInitializers = [];
    var SuperBlock = _classThis = class {
        constructor(store) {
            this.store = store;
            /**
             * The crc32c checksum for the super block.
             * @privateRemarks Keep this first!
             */
            this.checksum = __runInitializers(this, _checksum_initializers, 0);
            /** Signature for the superblock. */
            this.magic = (__runInitializers(this, _checksum_extraInitializers), __runInitializers(this, _magic_initializers, sb_magic));
            /** The version of the on-disk format */
            this.version = (__runInitializers(this, _magic_extraInitializers), __runInitializers(this, _version_initializers, 1));
            /** Which format of `Inode` is used */
            this.inode_format = (__runInitializers(this, _version_extraInitializers), __runInitializers(this, _inode_format_initializers, _inode_version));
            /** Flags for the file system. Currently unused */
            this.flags = (__runInitializers(this, _inode_format_extraInitializers), __runInitializers(this, _flags_initializers, 0));
            /** The number of used bytes, including the super block and metadata */
            this.used_bytes = (__runInitializers(this, _flags_extraInitializers), __runInitializers(this, _used_bytes_initializers, BigInt(0)));
            /** The total size of the entire file system, including the super block and metadata */
            this.total_bytes = (__runInitializers(this, _used_bytes_extraInitializers), __runInitializers(this, _total_bytes_initializers, BigInt(0)));
            /** An ID for this file system */
            this.id = (__runInitializers(this, _total_bytes_extraInitializers), __runInitializers(this, _id_initializers, BigInt(0)));
            /**
             * The size in bytes of a metadata block.
             * Not currently configurable.
             */
            this.metadata_block_size = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _metadata_block_size_initializers, sizeof(MetadataBlock)));
            /** Reserved for 64-bit offset expansion */
            this.metadata_offset_ = (__runInitializers(this, _metadata_block_size_extraInitializers), __runInitializers(this, _metadata_offset__initializers, 0));
            /** Offset of the current metadata block */
            this.metadata_offset = (__runInitializers(this, _metadata_offset__extraInitializers), __runInitializers(this, _metadata_offset_initializers, 0));
            this.metadata = __runInitializers(this, _metadata_offset_extraInitializers);
            /** An optional label for the file system */
            this.label = __runInitializers(this, _label_initializers, '');
            /** Padded to 256 bytes */
            this._padding = (__runInitializers(this, _label_extraInitializers), __runInitializers(this, __padding_initializers, new Array(132).fill(0)));
            __runInitializers(this, __padding_extraInitializers);
            this.store = store;
            if (store._view.getUint32(offsetof(SuperBlock, 'magic'), true) != sb_magic) {
                warn('SingleBuffer: Invalid magic value, assuming this is a fresh super block');
                this.metadata = new MetadataBlock(this);
                this.used_bytes = BigInt(sizeof(SuperBlock) + sizeof(MetadataBlock));
                this.total_bytes = BigInt(store._buffer.byteLength);
                store._write(this);
                store._write(this.metadata);
                return;
            }
            deserialize(this, store._buffer.subarray(0, sizeof(SuperBlock)));
            if (!checksumMatches(this))
                throw crit(new ErrnoError(Errno.EIO, 'SingleBuffer: Checksum mismatch for super block!'));
            this.metadata = new MetadataBlock(this, this.metadata_offset);
        }
        /**
         * Rotate out the current metadata block.
         * Allocates a new metadata block, moves the current one to backup,
         * and updates used_bytes accordingly.
         * @returns the new metadata block
         */
        rotateMetadata() {
            const metadata = new MetadataBlock(this);
            metadata.offset = Number(this.used_bytes);
            metadata.previous_offset = this.metadata_offset;
            this.metadata = metadata;
            this.metadata_offset = metadata.offset;
            this.store._write(metadata);
            this.used_bytes += BigInt(sizeof(MetadataBlock));
            this.store._write(this);
            return metadata;
        }
        /**
         * Checks to see if `length` bytes are unused, starting at `offset`.
         * @internal Not for external use!
         */
        isUnused(offset, length) {
            if (!length)
                return true;
            if (offset + length > this.total_bytes || offset < sizeof(SuperBlock))
                return false;
            for (let block = this.metadata; block; block = block.previous) {
                if (offset < block.offset + sizeof(MetadataBlock) && offset + length > block.offset)
                    return false;
                for (const entry of block.entries) {
                    if (!entry.offset)
                        continue;
                    if ((offset >= entry.offset && offset < entry.offset + entry.size)
                        || (offset + length > entry.offset && offset + length <= entry.offset + entry.size)
                        || (offset <= entry.offset && offset + length >= entry.offset + entry.size)) {
                        return false;
                    }
                }
            }
            return true;
        }
    };
    __setFunctionName(_classThis, "SuperBlock");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _checksum_decorators = [(_a = t).uint32.bind(_a)];
        _magic_decorators = [(_b = t).uint32.bind(_b)];
        _version_decorators = [(_c = t).uint16.bind(_c)];
        _inode_format_decorators = [(_d = t).uint16.bind(_d)];
        _flags_decorators = [(_e = t).uint32.bind(_e)];
        _used_bytes_decorators = [(_f = t).uint64.bind(_f)];
        _total_bytes_decorators = [(_g = t).uint64.bind(_g)];
        _id_decorators = [(_h = t).uint128.bind(_h)];
        _metadata_block_size_decorators = [(_j = t).uint32.bind(_j)];
        _metadata_offset__decorators = [(_k = t).uint32.bind(_k)];
        _metadata_offset_decorators = [(_l = t).uint32.bind(_l)];
        _label_decorators = [t.char(64)];
        __padding_decorators = [t.char(132)];
        __esDecorate(null, null, _checksum_decorators, { kind: "field", name: "checksum", static: false, private: false, access: { has: obj => "checksum" in obj, get: obj => obj.checksum, set: (obj, value) => { obj.checksum = value; } }, metadata: _metadata }, _checksum_initializers, _checksum_extraInitializers);
        __esDecorate(null, null, _magic_decorators, { kind: "field", name: "magic", static: false, private: false, access: { has: obj => "magic" in obj, get: obj => obj.magic, set: (obj, value) => { obj.magic = value; } }, metadata: _metadata }, _magic_initializers, _magic_extraInitializers);
        __esDecorate(null, null, _version_decorators, { kind: "field", name: "version", static: false, private: false, access: { has: obj => "version" in obj, get: obj => obj.version, set: (obj, value) => { obj.version = value; } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
        __esDecorate(null, null, _inode_format_decorators, { kind: "field", name: "inode_format", static: false, private: false, access: { has: obj => "inode_format" in obj, get: obj => obj.inode_format, set: (obj, value) => { obj.inode_format = value; } }, metadata: _metadata }, _inode_format_initializers, _inode_format_extraInitializers);
        __esDecorate(null, null, _flags_decorators, { kind: "field", name: "flags", static: false, private: false, access: { has: obj => "flags" in obj, get: obj => obj.flags, set: (obj, value) => { obj.flags = value; } }, metadata: _metadata }, _flags_initializers, _flags_extraInitializers);
        __esDecorate(null, null, _used_bytes_decorators, { kind: "field", name: "used_bytes", static: false, private: false, access: { has: obj => "used_bytes" in obj, get: obj => obj.used_bytes, set: (obj, value) => { obj.used_bytes = value; } }, metadata: _metadata }, _used_bytes_initializers, _used_bytes_extraInitializers);
        __esDecorate(null, null, _total_bytes_decorators, { kind: "field", name: "total_bytes", static: false, private: false, access: { has: obj => "total_bytes" in obj, get: obj => obj.total_bytes, set: (obj, value) => { obj.total_bytes = value; } }, metadata: _metadata }, _total_bytes_initializers, _total_bytes_extraInitializers);
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _metadata_block_size_decorators, { kind: "field", name: "metadata_block_size", static: false, private: false, access: { has: obj => "metadata_block_size" in obj, get: obj => obj.metadata_block_size, set: (obj, value) => { obj.metadata_block_size = value; } }, metadata: _metadata }, _metadata_block_size_initializers, _metadata_block_size_extraInitializers);
        __esDecorate(null, null, _metadata_offset__decorators, { kind: "field", name: "metadata_offset_", static: false, private: false, access: { has: obj => "metadata_offset_" in obj, get: obj => obj.metadata_offset_, set: (obj, value) => { obj.metadata_offset_ = value; } }, metadata: _metadata }, _metadata_offset__initializers, _metadata_offset__extraInitializers);
        __esDecorate(null, null, _metadata_offset_decorators, { kind: "field", name: "metadata_offset", static: false, private: false, access: { has: obj => "metadata_offset" in obj, get: obj => obj.metadata_offset, set: (obj, value) => { obj.metadata_offset = value; } }, metadata: _metadata }, _metadata_offset_initializers, _metadata_offset_extraInitializers);
        __esDecorate(null, null, _label_decorators, { kind: "field", name: "label", static: false, private: false, access: { has: obj => "label" in obj, get: obj => obj.label, set: (obj, value) => { obj.label = value; } }, metadata: _metadata }, _label_initializers, _label_extraInitializers);
        __esDecorate(null, null, __padding_decorators, { kind: "field", name: "_padding", static: false, private: false, access: { has: obj => "_padding" in obj, get: obj => obj._padding, set: (obj, value) => { obj._padding = value; } }, metadata: _metadata }, __padding_initializers, __padding_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SuperBlock = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SuperBlock = _classThis;
})();
function checksumMatches(value) {
    const buffer = serialize(value);
    const computed = crc32c(buffer.subarray(4)); // note we don't include the checksum when computing a new one.
    return value.checksum === computed;
}
/**
 *
 * @category Stores and Transactions
 */
export class SingleBufferStore {
    constructor(buffer) {
        this.flags = [];
        this.name = 'sbfs';
        this.id = 0x73626673; // 'sbfs'
        if (buffer.byteLength < sizeof(SuperBlock) + sizeof(MetadataBlock))
            throw crit(new ErrnoError(Errno.EINVAL, 'SingleBuffer: Buffer is too small for a file system'));
        this._view = !ArrayBuffer.isView(buffer) ? new DataView(buffer) : new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        this._buffer = !ArrayBuffer.isView(buffer) ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        this.superblock = new SuperBlock(this);
    }
    /**
     * Update a block's checksum and write it to the store's buffer.
     * @internal @hidden
     */
    _write(value) {
        value.checksum = crc32c(serialize(value).subarray(4));
        const offset = 'offset' in value ? value.offset : 0;
        this._buffer.set(serialize(value), offset);
    }
    keys() {
        const keys = new Set();
        for (let block = this.superblock.metadata; block; block = block.previous) {
            for (const entry of block.entries)
                if (entry.offset)
                    keys.add(entry.id);
        }
        return keys;
    }
    get(id) {
        for (let block = this.superblock.metadata; block; block = block.previous) {
            for (const entry of block.entries) {
                if (entry.offset && entry.id == id) {
                    return this._buffer.subarray(entry.offset, entry.offset + entry.size);
                }
            }
        }
    }
    set(id, data) {
        for (let block = this.superblock.metadata; block; block = block.previous) {
            for (const entry of block.entries) {
                if (!entry.offset || entry.id != id)
                    continue;
                if (data.length <= entry.size) {
                    this._buffer.set(data, entry.offset);
                    if (data.length < entry.size) {
                        entry.size = data.length;
                        this._write(block);
                    }
                    return;
                }
                if (this.superblock.isUnused(entry.offset, data.length)) {
                    entry.size = data.length;
                    this._buffer.set(data, entry.offset);
                    this._write(block);
                    return;
                }
                const used_bytes = Number(this.superblock.used_bytes);
                for (let block = this.superblock.metadata; block; block = block.previous) {
                    for (const entry of block.entries) {
                        if (entry.offset != used_bytes)
                            continue;
                        entry.offset += data.length;
                        this._write(block);
                        break;
                    }
                }
                entry.offset = used_bytes;
                entry.size = data.length;
                this._buffer.set(data, entry.offset);
                this._write(block);
                this.superblock.used_bytes += BigInt(data.length);
                this._write(this.superblock);
                return;
            }
        }
        let entry = this.superblock.metadata.entries.find(e => !e.offset);
        if (!entry) {
            this.superblock.rotateMetadata();
            entry = this.superblock.metadata.entries[0];
        }
        const offset = Number(this.superblock.used_bytes);
        entry.id = id;
        entry.offset = offset;
        entry.size = data.length;
        this._buffer.set(data, offset);
        this.superblock.used_bytes += BigInt(data.length);
        this._write(this.superblock.metadata);
        this._write(this.superblock);
    }
    delete(id) {
        for (let block = this.superblock.metadata; block; block = block.previous) {
            for (const entry of block.entries) {
                if (entry.id != id)
                    continue;
                entry.offset = 0;
                entry.size = 0;
                this._write(block);
                return;
            }
        }
    }
    sync() {
        return Promise.resolve();
    }
    usage() {
        return {
            totalSpace: Number(this.superblock.total_bytes),
            freeSpace: Number(this.superblock.total_bytes - this.superblock.used_bytes),
        };
    }
    transaction() {
        return new SyncMapTransaction(this);
    }
}
const _SingleBuffer = {
    name: 'SingleBuffer',
    options: {
        buffer: { type: 'object', required: true },
    },
    create({ buffer }) {
        const fs = new StoreFS(new SingleBufferStore(buffer));
        fs.checkRootSync();
        return fs;
    },
};
/**
 * A backend that uses a single buffer for storing data
 * @category Backends and Configuration
 */
export const SingleBuffer = _SingleBuffer;
