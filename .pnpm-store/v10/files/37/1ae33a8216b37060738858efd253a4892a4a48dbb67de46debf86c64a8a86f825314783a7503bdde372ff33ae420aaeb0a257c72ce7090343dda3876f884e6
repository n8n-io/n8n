"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parquet_types_1 = __importDefault(require("../../gen-nodejs/parquet_types"));
const long_1 = __importDefault(require("long"));
const xxhasher_1 = __importDefault(require("./xxhasher"));
/**
 * @class SplitBlockBloomFilter
 *
 * @description Parquet spec implementation of Split Block Bloom Filtering.
 *      Much of this code was pulled from the
 *     [apache/parquet Java implementation](https://github.com/apache/parquet-mr)
 *     See also
 *     [Cache-, Hash- and Space-Efficient Bloom Filters](http://algo2.iti.kit.edu/documents/cacheefficientbloomfilters-jea.pdf)
 *
 *     Default filter size is ~16.8MB, using 0.001 FPR and 128M rows
 *
 * @constructor   SplitBlockBloomFilter()
 *      Once desired options are set, call **`init()`** to set up the filter array
 * @example This calculates and sets the optimal filter size based on the options:
 *   const filter = new SplitBLockBloomFilter()
 *      .setOptionNumDistinct(100000)
 *      .setOptionFalsePositiveRate(0.00001)
 *      .init()
 *
 * @example This uses the default values to initialize the filter:
 *   const filter = new SplitBlockBloomFilter().init()
 *
 * @example If you know what size bloom filter you want, do:
 *   const filter = new SplitBLockBloomFilter()
 *      .setOptionNumFilterBytes(128000)
 *      .init()
 */
class SplitBlockBloomFilter {
    static salt = [
        0x47b6137b, 0x44974d91, 0x8824ad5b, 0xa2b7289d, 0x705495c7, 0x2df1424b, 0x9efc4947, 0x5c6bfb31,
    ];
    // How many bits are in a single block:
    // - Blocks are UInt32 arrays
    // - There are 8 UInt32 words in each block.
    static WORDS_PER_BLOCK = 8;
    static WORD_SIZE = 32;
    static BITS_PER_BLOCK = SplitBlockBloomFilter.WORDS_PER_BLOCK * SplitBlockBloomFilter.WORD_SIZE;
    // Default number of blocks in a Split Block Bloom filter (SBBF)
    static NUMBER_OF_BLOCKS = 32;
    // The lower bound of SBBF size in bytes.
    // Currently this is 1024
    static LOWER_BOUND_BYTES = (SplitBlockBloomFilter.NUMBER_OF_BLOCKS * SplitBlockBloomFilter.BITS_PER_BLOCK) / 8;
    // The upper bound of SBBF size, set to default row group size in bytes.
    // Note that the subsquent requirements for an effective bloom filter on a row group this size would mean this
    // is unacceptably large for a lightweight client application.
    static UPPER_BOUND_BYTES = 128 * 1024 * 1024;
    static DEFAULT_FALSE_POSITIVE_RATE = 0.001;
    static DEFAULT_DISTINCT_VALUES = 128 * 1024;
    /**
     * @function initBlock
     * @description initializes a single block
     */
    static initBlock() {
        return Uint32Array.from(Array(SplitBlockBloomFilter.WORDS_PER_BLOCK).fill(0));
    }
    /**
     * @function from
     * @description initialize a SplitBlockBloomFilter for a single column row group
     * from the provided Buffer
     * @param buffer a NodeJs Buffer containing bloom filter data for a row group.
     */
    static from(buffer, _rowCount) {
        if (buffer.length === 0) {
            throw new Error('buffer is empty');
        }
        const chunkSize = SplitBlockBloomFilter.WORDS_PER_BLOCK;
        const uint32sFromBuf = new Uint32Array(buffer.buffer);
        const result = [];
        const length = uint32sFromBuf.length;
        for (let index = 0; index < length; index += chunkSize) {
            result.push(uint32sFromBuf.subarray(index, index + chunkSize));
        }
        const sb = new SplitBlockBloomFilter();
        sb.splitBlockFilter = result;
        sb.numBlocks = result.length;
        // these will not be knowable when reading
        sb.numDistinctValues = 0;
        sb.desiredFalsePositiveRate = 0.0;
        return sb;
    }
    /**
     * @function getBlockIndex: get a block index to insert a hash value for
     * @param h the hash from which to derive a block index (?)
     * @param z the number of blocks in the filter
     *
     * @return a number from 0 to z-1, inclusive
     */
    static getBlockIndex(h, z) {
        const zLong = long_1.default.fromNumber(z, true);
        const hTopBits = long_1.default.fromNumber(h.getHighBitsUnsigned(), true);
        return hTopBits.mul(zLong).shiftRightUnsigned(32).getLowBitsUnsigned();
    }
    /**
     * @function optimalNumOfBlocks
     *
     * @description Calculate optimal number of blocks, according to the number of distinct
     * values and false positive probability.  Using a Bloom filter calculator, the upper bound is
     * far too large for client applications. Sourced from:
     * https://github.com/apache/parquet-mr/blob/5608695f5777de1eb0899d9075ec9411cfdf31d3/parquet-column/src/main/java/org/apache/parquet/column/values/bloomfilter/BlockSplitBloomFilter.java#L285
     *
     * @param numDistinct The number of distinct values.
     * @param falsePositiveRate The false positive rate, a number between 0 and 1 exclusive
     *
     * @return number: number of bits of given n and p.
     */
    static optimalNumOfBlocks(numDistinct, falsePositiveRate) {
        let m = (-8 * numDistinct) / Math.log(1 - Math.pow(falsePositiveRate, 1.0 / 8));
        m = (m + SplitBlockBloomFilter.NUMBER_OF_BLOCKS - 1) & ~SplitBlockBloomFilter.NUMBER_OF_BLOCKS;
        // Handle overflow:
        const upperShiftL3 = SplitBlockBloomFilter.UPPER_BOUND_BYTES << 3;
        if (m > upperShiftL3 || m < 0) {
            m = upperShiftL3;
        }
        // Round numBits up
        m = (m + SplitBlockBloomFilter.BITS_PER_BLOCK - 1) & ~SplitBlockBloomFilter.BITS_PER_BLOCK;
        const lowerBoundShiftL3 = SplitBlockBloomFilter.LOWER_BOUND_BYTES << 3;
        if (m < lowerBoundShiftL3) {
            m = lowerBoundShiftL3;
        }
        return Math.ceil(m / this.BITS_PER_BLOCK);
    }
    /**
     * @function mask
     * @description generate a mask block for a bloom filter block
     * @param hashValue: the hash value to generate the mask from
     * @private
     *
     * @return mask Block
     */
    static mask(hashValue) {
        const result = SplitBlockBloomFilter.initBlock();
        for (let i = 0; i < result.length; i++) {
            const y = hashValue.getLowBitsUnsigned() * SplitBlockBloomFilter.salt[i];
            result[i] = result[i] | (1 << (y >>> 27));
        }
        return result;
    }
    /**
     * @function blockInsert
     * @description insert a hash into a Bloom filter Block
     * @param b: the block to flip a bit for: is changed
     * @param hashValue: the hash value to insert into b
     * @private
     *
     * @return void
     */
    static blockInsert(b, hashValue) {
        const masked = this.mask(hashValue);
        for (let i = 0; i < masked.length; i++) {
            for (let j = 0; j < this.WORD_SIZE; j++) {
                const isSet = masked[i] & (2 ** j);
                if (isSet) {
                    b[i] = b[i] | (2 ** j);
                }
            }
        }
    }
    /**
     * @function blockCheck
     * @description check if a hashValue exists for this filter
     * @param b: the block to check for inclusion
     * @param hashValue: the hash to check for  should be long
     * @private
     *
     * @return true if hashed item is __probably__ in the data set represented by this filter
     * @return false if it is __definitely not__ in the data set.
     */
    static blockCheck(b, hashValue) {
        const masked = this.mask(hashValue);
        for (let i = 0; i < masked.length; i++) {
            for (let j = 0; j < this.WORD_SIZE; j++) {
                const isSet = masked[i] & (2 ** j);
                if (isSet) {
                    const match = b[i] & (2 ** j);
                    if (!match) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Instance
     */
    splitBlockFilter = [];
    desiredFalsePositiveRate = SplitBlockBloomFilter.DEFAULT_FALSE_POSITIVE_RATE;
    numBlocks = 0;
    numDistinctValues = SplitBlockBloomFilter.DEFAULT_DISTINCT_VALUES;
    hashStrategy = new parquet_types_1.default.BloomFilterHash(new parquet_types_1.default.XxHash());
    hasher = new xxhasher_1.default();
    isInitialized() {
        return this.splitBlockFilter.length > 0;
    }
    getFalsePositiveRate() {
        return this.desiredFalsePositiveRate;
    }
    getNumDistinct() {
        return this.numDistinctValues;
    }
    getNumFilterBlocks() {
        return this.splitBlockFilter.length;
    }
    getFilter() {
        return this.splitBlockFilter;
    }
    /**
     * @function  optNumFilterBytes
     * @description return the actual number of filter bytes set; if the option to numBytes
     *     was called, this value will be returned. If the options for preferred FPR
     *     and/or numDistinct were called, this function returns the calculated value.
     */
    getNumFilterBytes() {
        return (this.numBlocks * SplitBlockBloomFilter.BITS_PER_BLOCK) >>> 3;
    }
    /**
     * @function setOptionFalsePositiveRate
     * @description set the desired false positive percentage for this Bloom filter.
     *     defaults to SplitBlockBLoomFilter.DEFAULT_FALSE_POSITIVE_RATE
     *     This function does nothing if the filter has already been allocated.
     * @param proportion: number, between 0.0 and 1.0, exclusive
     */
    setOptionFalsePositiveRate(proportion) {
        if (this.isInitialized()) {
            console.error('filter already initialized. options may no longer be changed.');
            return this;
        }
        if (proportion <= 0.0 || proportion >= 1.0) {
            console.error('falsePositiveProbability. Must be < 1.0 and > 0.0');
            return this;
        }
        this.desiredFalsePositiveRate = proportion;
        return this;
    }
    /**
     *  @function setOptionNumDistinct
     *  @description set the number of expected distinct values for the filter.
     *     this should generally be <= to the row group size. Defaults to
     *     SplitBlockBloomFilter.UPPER_BOUND_BYTES
     *     This function does nothing if the filter has already been allocated.
     * @param numDistinct
     */
    setOptionNumDistinct(numDistinct) {
        if (this.isInitialized()) {
            console.error('filter already initialized. options may no longer be changed.');
            return this;
        }
        if (numDistinct <= 0 || numDistinct > SplitBlockBloomFilter.UPPER_BOUND_BYTES) {
            console.error(`invalid numDistinct. Must be > 0 and < ${SplitBlockBloomFilter.UPPER_BOUND_BYTES}`);
            return this;
        }
        this.numDistinctValues = numDistinct;
        return this;
    }
    /**
     * @function nextPwr2
     * @description return the next highest power of 2 above v
     *     see  https://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
     *     NOTE: cannot use values > 2**31. We are not expecting these values internally,
     *     so this works as intended.
     */
    static nextPwr2(v) {
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }
    /**
     * @function setOptionNumFilterBytes
     * @description set the bytes for this Bloom filter. Set this if you don't want an
     *     optimal value calculated for you.  Rounds up to nearest power of 2
     *     This function does nothing if the filter has already been allocated.
     * @param numBytes: number, the desired bit size.
     */
    setOptionNumFilterBytes(numBytes) {
        if (this.isInitialized()) {
            console.error('filter already initialized. options may no longer be changed.');
            return this;
        }
        if (numBytes < SplitBlockBloomFilter.LOWER_BOUND_BYTES || numBytes > SplitBlockBloomFilter.UPPER_BOUND_BYTES) {
            console.error(`invalid numBits. Must be > ${SplitBlockBloomFilter.LOWER_BOUND_BYTES} and < ${SplitBlockBloomFilter.UPPER_BOUND_BYTES}`);
            return this;
        }
        // numBlocks = Bytes * 8b/Byte * 1Block/256b
        this.numBlocks = (SplitBlockBloomFilter.nextPwr2(numBytes) * 8) / SplitBlockBloomFilter.BITS_PER_BLOCK;
        return this;
    }
    /**
     * @function initFilter
     * @description initialize the Bloom filter using the options previously provided.
     *     If numBlocks has not been calculated and set via setOptionNumBytes, we calculate
     *     the optimal filter size based on number of distinct values and
     *     percent false positive rate. See setOptionNumDistinct and setOptionFalsePositiveRate
     *
     *     Repeated calls to init do nothing to avoid multiple memory allocations or
     *     accidental loss of filters.
     * @return void
     */
    init() {
        if (this.isInitialized()) {
            console.error('filter already initialized.');
            return this;
        }
        if (!Object.prototype.hasOwnProperty.call(this.hashStrategy, 'XXHASH')) {
            throw new Error('unsupported hash strategy');
        }
        if (this.numBlocks === 0) {
            this.numBlocks =
                SplitBlockBloomFilter.optimalNumOfBlocks(this.numDistinctValues, this.desiredFalsePositiveRate) >>> 3;
        }
        this.splitBlockFilter = Array(this.numBlocks).fill(SplitBlockBloomFilter.initBlock());
        return this;
    }
    async hash(value) {
        if (!Object.prototype.hasOwnProperty.call(this.hashStrategy, 'XXHASH')) {
            throw new Error('unsupported hash strategy');
        }
        const hashed = await this.hasher.hash64(value);
        return long_1.default.fromString(hashed, true, 16);
    }
    insertHash(hashValue) {
        if (!hashValue.unsigned)
            throw new Error('hashValue must be an unsigned Long');
        if (!this.isInitialized())
            throw new Error('filter has not been initialized. call init() first');
        const i = SplitBlockBloomFilter.getBlockIndex(hashValue, this.splitBlockFilter.length);
        SplitBlockBloomFilter.blockInsert(this.splitBlockFilter[i], hashValue);
    }
    /**
     * @function insert
     * @description add a hash value to this filter
     * @param value: an unsigned Long, the value to add. If not a string, will be JSON.stringified
     * @return void
     */
    async insert(value) {
        if (!this.isInitialized())
            throw new Error('filter has not been initialized. call init() first');
        this.insertHash(await this.hash(value));
    }
    checkHash(hashValue) {
        if (!hashValue.unsigned)
            throw new Error('hashValue must be an unsigned Long');
        if (!this.isInitialized())
            throw new Error('filter has not been initialized');
        const i = SplitBlockBloomFilter.getBlockIndex(hashValue, this.splitBlockFilter.length);
        return SplitBlockBloomFilter.blockCheck(this.splitBlockFilter[i], hashValue);
    }
    /**
     * @function check
     * @description check if a hashValue exists for this filter
     * @param value: the value to check for. If not a string, will be JSON.stringified
     * @return true if hashed item is found in the data set represented by this filter
     * @return false if it is __definitely not__ in the data set.
     */
    async check(value) {
        if (!this.isInitialized())
            throw new Error('filter has not been initialized');
        return this.checkHash(await this.hash(value));
    }
}
exports.default = SplitBlockBloomFilter;
