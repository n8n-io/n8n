export declare class Buckets {
    backing: BucketsBacking;
    indexBase: number;
    indexStart: number;
    indexEnd: number;
    /**
     * The term index refers to the number of the exponential histogram bucket
     * used to determine its boundaries. The lower boundary of a bucket is
     * determined by base ** index and the upper boundary of a bucket is
     * determined by base ** (index + 1). index values are signed to account
     * for values less than or equal to 1.
     *
     * indexBase is the index of the 0th position in the
     * backing array, i.e., backing[0] is the count
     * in the bucket with index `indexBase`.
     *
     * indexStart is the smallest index value represented
     * in the backing array.
     *
     * indexEnd is the largest index value represented in
     * the backing array.
     */
    constructor(backing?: BucketsBacking, indexBase?: number, indexStart?: number, indexEnd?: number);
    /**
     * Offset is the bucket index of the smallest entry in the counts array
     * @returns {number}
     */
    get offset(): number;
    /**
     * Buckets is a view into the backing array.
     * @returns {number}
     */
    get length(): number;
    /**
     * An array of counts, where count[i] carries the count
     * of the bucket at index (offset+i).  count[i] is the count of
     * values greater than base^(offset+i) and less than or equal to
     * base^(offset+i+1).
     * @returns {number} The logical counts based on the backing array
     */
    counts(): number[];
    /**
     * At returns the count of the bucket at a position in the logical
     * array of counts.
     * @param position
     * @returns {number}
     */
    at(position: number): number;
    /**
     * incrementBucket increments the backing array index by `increment`
     * @param bucketIndex
     * @param increment
     */
    incrementBucket(bucketIndex: number, increment: number): void;
    /**
     * decrementBucket decrements the backing array index by `decrement`
     * if decrement is greater than the current value, it's set to 0.
     * @param bucketIndex
     * @param decrement
     */
    decrementBucket(bucketIndex: number, decrement: number): void;
    /**
     * trim removes leading and / or trailing zero buckets (which can occur
     * after diffing two histos) and rotates the backing array so that the
     * smallest non-zero index is in the 0th position of the backing array
     */
    trim(): void;
    /**
     * downscale first rotates, then collapses 2**`by`-to-1 buckets.
     * @param by
     */
    downscale(by: number): void;
    /**
     * Clone returns a deep copy of Buckets
     * @returns {Buckets}
     */
    clone(): Buckets;
    /**
     * _rotate shifts the backing array contents so that indexStart ==
     * indexBase to simplify the downscale logic.
     */
    private _rotate;
    /**
     * _relocateBucket adds the count in counts[src] to counts[dest] and
     * resets count[src] to zero.
     */
    private _relocateBucket;
}
/**
 * BucketsBacking holds the raw buckets and some utility methods to
 * manage them.
 */
declare class BucketsBacking {
    private _counts;
    constructor(_counts?: number[]);
    /**
     * length returns the physical size of the backing array, which
     * is >= buckets.length()
     */
    get length(): number;
    /**
     * countAt returns the count in a specific bucket
     */
    countAt(pos: number): number;
    /**
     * growTo grows a backing array and copies old entries
     * into their correct new positions.
     */
    growTo(newSize: number, oldPositiveLimit: number, newPositiveLimit: number): void;
    /**
     * reverse the items in the backing array in the range [from, limit).
     */
    reverse(from: number, limit: number): void;
    /**
     * emptyBucket empties the count from a bucket, for
     * moving into another.
     */
    emptyBucket(src: number): number;
    /**
     * increments a bucket by `increment`
     */
    increment(bucketIndex: number, increment: number): void;
    /**
     * decrements a bucket by `decrement`
     */
    decrement(bucketIndex: number, decrement: number): void;
    /**
     * clone returns a deep copy of BucketsBacking
     */
    clone(): BucketsBacking;
}
export {};
//# sourceMappingURL=Buckets.d.ts.map