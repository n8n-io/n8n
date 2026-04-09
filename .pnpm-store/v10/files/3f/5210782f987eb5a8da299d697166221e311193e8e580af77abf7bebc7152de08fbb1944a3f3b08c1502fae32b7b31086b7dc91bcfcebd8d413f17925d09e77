"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const xxhash_wasm_1 = __importDefault(require("xxhash-wasm"));
const long_1 = __importDefault(require("long"));
/**
 * @class XxHasher
 *
 * @description  Simple wrapper for xxhash-wasm package that converts
 * Parquet Type analogs in JavaScript to strings for creating 64 bit hashes.  Hash seed = 0 per
 * [Parquet specification](https://github.com/apache/parquet-format/blob/master/BloomFilter.md).
 *
 * See also:
 * [xxHash spec](https://github.com/Cyan4973/xxHash/blob/v0.7.0/doc/xxhash_spec.md)
 */
class XxHasher {
    static h64 = (0, xxhash_wasm_1.default)().then((x) => x.h64ToString);
    async hashIt(value) {
        return (await XxHasher.h64)(value);
    }
    /**
     * @function hash64
     * @description creates a hash for certain data types. All data is converted using toString()
     * prior to hashing.
     * @return the 64 big XXHash as a hex-encoded string.
     * @param value, must be of type string, Buffer, Uint8Array, Long, boolean, number, or bigint
     */
    async hash64(value) {
        if (typeof value === 'string')
            return this.hashIt(value);
        if (value instanceof Buffer ||
            value instanceof Uint8Array ||
            value instanceof long_1.default ||
            typeof value === 'boolean' ||
            typeof value === 'number' ||
            typeof value === 'bigint') {
            return this.hashIt(value.toString());
        }
        throw new Error('unsupported type: ' + value);
    }
}
exports.default = XxHasher;
