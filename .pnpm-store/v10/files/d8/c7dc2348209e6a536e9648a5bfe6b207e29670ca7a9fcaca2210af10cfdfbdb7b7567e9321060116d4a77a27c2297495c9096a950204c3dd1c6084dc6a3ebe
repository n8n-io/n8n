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
export default class XxHasher {
    private static h64;
    private hashIt;
    /**
     * @function hash64
     * @description creates a hash for certain data types. All data is converted using toString()
     * prior to hashing.
     * @return the 64 big XXHash as a hex-encoded string.
     * @param value, must be of type string, Buffer, Uint8Array, Long, boolean, number, or bigint
     */
    hash64(value: any): Promise<string>;
}
