import Long from 'long';
import { Block } from '../declare';
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
declare class SplitBlockBloomFilter {
    private static readonly salt;
    private static readonly WORDS_PER_BLOCK;
    private static readonly WORD_SIZE;
    private static readonly BITS_PER_BLOCK;
    private static readonly NUMBER_OF_BLOCKS;
    private static readonly LOWER_BOUND_BYTES;
    static readonly UPPER_BOUND_BYTES: number;
    static readonly DEFAULT_FALSE_POSITIVE_RATE = 0.001;
    static readonly DEFAULT_DISTINCT_VALUES: number;
    /**
     * @function initBlock
     * @description initializes a single block
     */
    static initBlock(): Block;
    /**
     * @function from
     * @description initialize a SplitBlockBloomFilter for a single column row group
     * from the provided Buffer
     * @param buffer a NodeJs Buffer containing bloom filter data for a row group.
     */
    static from(buffer: Buffer, _rowCount?: number): SplitBlockBloomFilter;
    /**
     * @function getBlockIndex: get a block index to insert a hash value for
     * @param h the hash from which to derive a block index (?)
     * @param z the number of blocks in the filter
     *
     * @return a number from 0 to z-1, inclusive
     */
    static getBlockIndex(h: Long, z: number): number;
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
    static optimalNumOfBlocks(numDistinct: number, falsePositiveRate: number): number;
    /**
     * @function mask
     * @description generate a mask block for a bloom filter block
     * @param hashValue: the hash value to generate the mask from
     * @private
     *
     * @return mask Block
     */
    static mask(hashValue: Long): Block;
    /**
     * @function blockInsert
     * @description insert a hash into a Bloom filter Block
     * @param b: the block to flip a bit for: is changed
     * @param hashValue: the hash value to insert into b
     * @private
     *
     * @return void
     */
    static blockInsert(b: Block, hashValue: Long): void;
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
    static blockCheck(b: Block, hashValue: Long): boolean;
    /**
     * Instance
     */
    private splitBlockFilter;
    private desiredFalsePositiveRate;
    private numBlocks;
    private numDistinctValues;
    private hashStrategy;
    private hasher;
    private isInitialized;
    getFalsePositiveRate(): number;
    getNumDistinct(): number;
    getNumFilterBlocks(): number;
    getFilter(): Block[];
    /**
     * @function  optNumFilterBytes
     * @description return the actual number of filter bytes set; if the option to numBytes
     *     was called, this value will be returned. If the options for preferred FPR
     *     and/or numDistinct were called, this function returns the calculated value.
     */
    getNumFilterBytes(): number;
    /**
     * @function setOptionFalsePositiveRate
     * @description set the desired false positive percentage for this Bloom filter.
     *     defaults to SplitBlockBLoomFilter.DEFAULT_FALSE_POSITIVE_RATE
     *     This function does nothing if the filter has already been allocated.
     * @param proportion: number, between 0.0 and 1.0, exclusive
     */
    setOptionFalsePositiveRate(proportion: number): SplitBlockBloomFilter;
    /**
     *  @function setOptionNumDistinct
     *  @description set the number of expected distinct values for the filter.
     *     this should generally be <= to the row group size. Defaults to
     *     SplitBlockBloomFilter.UPPER_BOUND_BYTES
     *     This function does nothing if the filter has already been allocated.
     * @param numDistinct
     */
    setOptionNumDistinct(numDistinct: number): SplitBlockBloomFilter;
    /**
     * @function nextPwr2
     * @description return the next highest power of 2 above v
     *     see  https://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
     *     NOTE: cannot use values > 2**31. We are not expecting these values internally,
     *     so this works as intended.
     */
    private static nextPwr2;
    /**
     * @function setOptionNumFilterBytes
     * @description set the bytes for this Bloom filter. Set this if you don't want an
     *     optimal value calculated for you.  Rounds up to nearest power of 2
     *     This function does nothing if the filter has already been allocated.
     * @param numBytes: number, the desired bit size.
     */
    setOptionNumFilterBytes(numBytes: number): SplitBlockBloomFilter;
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
    init(): SplitBlockBloomFilter;
    hash(value: any): Promise<Long>;
    private insertHash;
    /**
     * @function insert
     * @description add a hash value to this filter
     * @param value: an unsigned Long, the value to add. If not a string, will be JSON.stringified
     * @return void
     */
    insert(value: any): Promise<void>;
    private checkHash;
    /**
     * @function check
     * @description check if a hashValue exists for this filter
     * @param value: the value to check for. If not a string, will be JSON.stringified
     * @return true if hashed item is found in the data set represented by this filter
     * @return false if it is __definitely not__ in the data set.
     */
    check(value: any): Promise<boolean>;
}
export default SplitBlockBloomFilter;
