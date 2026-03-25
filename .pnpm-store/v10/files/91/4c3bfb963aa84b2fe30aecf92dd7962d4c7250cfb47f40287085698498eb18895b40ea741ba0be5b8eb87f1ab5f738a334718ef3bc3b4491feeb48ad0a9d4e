import RecordedValuesIterator from "./RecordedValuesIterator";
import PercentileIterator from "./PercentileIterator";
import Histogram, { HistogramSummary } from "./Histogram";
export declare abstract class JsHistogram implements Histogram {
    static identityBuilder: number;
    identity: number;
    autoResize: boolean;
    highestTrackableValue: number;
    lowestDiscernibleValue: number;
    numberOfSignificantValueDigits: number;
    bucketCount: number;
    /**
     * Power-of-two length of linearly scaled array slots in the counts array. Long enough to hold the first sequence of
     * entries that must be distinguished by a single unit (determined by configured precision).
     */
    subBucketCount: number;
    countsArrayLength: number;
    wordSizeInBytes: number;
    startTimeStampMsec: number;
    endTimeStampMsec: number;
    tag: string;
    percentileIterator: PercentileIterator;
    recordedValuesIterator: RecordedValuesIterator;
    /**
     * Number of leading zeros in the largest value that can fit in bucket 0.
     */
    leadingZeroCountBase: number;
    subBucketHalfCountMagnitude: number;
    /**
     * Largest k such that 2^k &lt;= lowestDiscernibleValue
     */
    unitMagnitude: number;
    subBucketHalfCount: number;
    lowestDiscernibleValueRounded: number;
    /**
     * Biggest value that can fit in bucket 0
     */
    subBucketMask: number;
    /**
     * Lowest unitMagnitude bits are set
     */
    unitMagnitudeMask: number;
    maxValue: number;
    minNonZeroValue: number;
    _totalCount: number;
    incrementTotalCount(): void;
    addToTotalCount(value: number): void;
    setTotalCount(value: number): void;
    /**
     * Get the total count of all recorded values in the histogram
     * @return the total count of all recorded values in the histogram
     */
    get totalCount(): number;
    abstract getCountAtIndex(index: number): number;
    abstract incrementCountAtIndex(index: number): void;
    abstract addToCountAtIndex(index: number, value: number): void;
    abstract setCountAtIndex(index: number, value: number): void;
    abstract clearCounts(): void;
    protected abstract _getEstimatedFootprintInBytes(): number;
    abstract resize(newHighestTrackableValue: number): void;
    private updatedMaxValue;
    private updateMinNonZeroValue;
    constructor(lowestDiscernibleValue: number, highestTrackableValue: number, numberOfSignificantValueDigits: number);
    init(lowestDiscernibleValue: number, highestTrackableValue: number, numberOfSignificantValueDigits: number): void;
    /**
     * The buckets (each of which has subBucketCount sub-buckets, here assumed to be 2048 as an example) overlap:
     *
     * <pre>
     * The 0'th bucket covers from 0...2047 in multiples of 1, using all 2048 sub-buckets
     * The 1'th bucket covers from 2048..4097 in multiples of 2, using only the top 1024 sub-buckets
     * The 2'th bucket covers from 4096..8191 in multiple of 4, using only the top 1024 sub-buckets
     * ...
     * </pre>
     *
     * Bucket 0 is "special" here. It is the only one that has 2048 entries. All the rest have 1024 entries (because
     * their bottom half overlaps with and is already covered by the all of the previous buckets put together). In other
     * words, the k'th bucket could represent 0 * 2^k to 2048 * 2^k in 2048 buckets with 2^k precision, but the midpoint
     * of 1024 * 2^k = 2048 * 2^(k-1) = the k-1'th bucket's end, so we would use the previous bucket for those lower
     * values as it has better precision.
     */
    establishSize(newHighestTrackableValue: number): void;
    determineArrayLengthNeeded(highestTrackableValue: number): number;
    /**
     * If we have N such that subBucketCount * 2^N > max value, we need storage for N+1 buckets, each with enough
     * slots to hold the top half of the subBucketCount (the lower half is covered by previous buckets), and the +1
     * being used for the lower half of the 0'th bucket. Or, equivalently, we need 1 more bucket to capture the max
     * value if we consider the sub-bucket length to be halved.
     */
    getLengthForNumberOfBuckets(numberOfBuckets: number): number;
    getBucketsNeededToCoverValue(value: number): number;
    /**
     * Record a value in the histogram
     *
     * @param value The value to be recorded
     * @throws may throw Error if value is exceeds highestTrackableValue
     */
    recordValue(value: number): void;
    recordSingleValue(value: number): void;
    handleRecordException(count: number, value: number): void;
    countsArrayIndex(value: number): number;
    private computeCountsArrayIndex;
    /**
     * @return the lowest (and therefore highest precision) bucket index that can represent the value
     */
    getBucketIndex(value: number): number;
    getSubBucketIndex(value: number, bucketIndex: number): number;
    updateMinAndMax(value: number): void;
    /**
     * Get the value at a given percentile.
     * When the given percentile is &gt; 0.0, the value returned is the value that the given
     * percentage of the overall recorded value entries in the histogram are either smaller than
     * or equivalent to. When the given percentile is 0.0, the value returned is the value that all value
     * entries in the histogram are either larger than or equivalent to.
     * <p>
     * Note that two values are "equivalent" in this statement if
     * {@link org.HdrHistogram.JsHistogram#valuesAreEquivalent} would return true.
     *
     * @param percentile  The percentile for which to return the associated value
     * @return The value that the given percentage of the overall recorded value entries in the
     * histogram are either smaller than or equivalent to. When the percentile is 0.0, returns the
     * value that all value entries in the histogram are either larger than or equivalent to.
     */
    getValueAtPercentile(percentile: number): number;
    valueFromIndexes(bucketIndex: number, subBucketIndex: number): number;
    valueFromIndex(index: number): number;
    /**
     * Get the lowest value that is equivalent to the given value within the histogram's resolution.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The lowest value that is equivalent to the given value within the histogram's resolution.
     */
    lowestEquivalentValue(value: number): number;
    /**
     * Get the highest value that is equivalent to the given value within the histogram's resolution.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The highest value that is equivalent to the given value within the histogram's resolution.
     */
    highestEquivalentValue(value: number): number;
    /**
     * Get the next value that is not equivalent to the given value within the histogram's resolution.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The next value that is not equivalent to the given value within the histogram's resolution.
     */
    nextNonEquivalentValue(value: number): number;
    /**
     * Get the size (in value units) of the range of values that are equivalent to the given value within the
     * histogram's resolution. Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The size of the range of values equivalent to the given value.
     */
    sizeOfEquivalentValueRange(value: number): number;
    /**
     * Get a value that lies in the middle (rounded up) of the range of values equivalent the given value.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The value lies in the middle (rounded up) of the range of values equivalent the given value.
     */
    medianEquivalentValue(value: number): number;
    /**
     * Get the computed mean value of all recorded values in the histogram
     *
     * @return the mean value (in value units) of the histogram data
     */
    get mean(): number;
    private getStdDeviation;
    /**
     * Get the computed standard deviation of all recorded values in the histogram
     *
     * @return the standard deviation (in value units) of the histogram data
     */
    get stdDeviation(): number;
    /**
     * Produce textual representation of the value distribution of histogram data by percentile. The distribution is
     * output with exponentially increasing resolution, with each exponentially decreasing half-distance containing
     * <i>dumpTicksPerHalf</i> percentile reporting tick points.
     *
     * @param printStream    Stream into which the distribution will be output
     * <p>
     * @param percentileTicksPerHalfDistance  The number of reporting points per exponentially decreasing half-distance
     * <p>
     * @param outputValueUnitScalingRatio    The scaling factor by which to divide histogram recorded values units in
     *                                     output
     * @param useCsvFormat  Output in CSV format if true. Otherwise use plain text form.
     */
    outputPercentileDistribution(percentileTicksPerHalfDistance?: number, outputValueUnitScalingRatio?: number, useCsvFormat?: boolean): string;
    get summary(): HistogramSummary;
    toJSON(): HistogramSummary;
    inspect(): string;
    /**
     * Provide a (conservatively high) estimate of the Histogram's total footprint in bytes
     *
     * @return a (conservatively high) estimate of the Histogram's total footprint in bytes
     */
    get estimatedFootprintInBytes(): number;
    recordSingleValueWithExpectedInterval(value: number, expectedIntervalBetweenValueSamples: number): void;
    private recordCountAtValue;
    /**
     * Record a value in the histogram (adding to the value's current count)
     *
     * @param value The value to be recorded
     * @param count The number of occurrences of this value to record
     * @throws ArrayIndexOutOfBoundsException (may throw) if value is exceeds highestTrackableValue
     */
    recordValueWithCount(value: number, count: number): void;
    /**
     * Record a value in the histogram.
     * <p>
     * To compensate for the loss of sampled values when a recorded value is larger than the expected
     * interval between value samples, Histogram will auto-generate an additional series of decreasingly-smaller
     * (down to the expectedIntervalBetweenValueSamples) value records.
     * <p>
     * Note: This is a at-recording correction method, as opposed to the post-recording correction method provided
     * by {@link #copyCorrectedForCoordinatedOmission(long)}.
     * The two methods are mutually exclusive, and only one of the two should be be used on a given data set to correct
     * for the same coordinated omission issue.
     * <p>
     * See notes in the description of the Histogram calls for an illustration of why this corrective behavior is
     * important.
     *
     * @param value The value to record
     * @param expectedIntervalBetweenValueSamples If expectedIntervalBetweenValueSamples is larger than 0, add
     *                                           auto-generated value records as appropriate if value is larger
     *                                           than expectedIntervalBetweenValueSamples
     * @throws ArrayIndexOutOfBoundsException (may throw) if value is exceeds highestTrackableValue
     */
    recordValueWithExpectedInterval(value: number, expectedIntervalBetweenValueSamples: number): void;
    private recordValueWithCountAndExpectedInterval;
    /**
     * Add the contents of another histogram to this one, while correcting the incoming data for coordinated omission.
     * <p>
     * To compensate for the loss of sampled values when a recorded value is larger than the expected
     * interval between value samples, the values added will include an auto-generated additional series of
     * decreasingly-smaller (down to the expectedIntervalBetweenValueSamples) value records for each count found
     * in the current histogram that is larger than the expectedIntervalBetweenValueSamples.
     *
     * Note: This is a post-recording correction method, as opposed to the at-recording correction method provided
     * by {@link #recordValueWithExpectedInterval(long, long) recordValueWithExpectedInterval}. The two
     * methods are mutually exclusive, and only one of the two should be be used on a given data set to correct
     * for the same coordinated omission issue.
     * by
     * <p>
     * See notes in the description of the Histogram calls for an illustration of why this corrective behavior is
     * important.
     *
     * @param otherHistogram The other histogram. highestTrackableValue and largestValueWithSingleUnitResolution must match.
     * @param expectedIntervalBetweenValueSamples If expectedIntervalBetweenValueSamples is larger than 0, add
     *                                           auto-generated value records as appropriate if value is larger
     *                                           than expectedIntervalBetweenValueSamples
     * @throws ArrayIndexOutOfBoundsException (may throw) if values exceed highestTrackableValue
     */
    addWhileCorrectingForCoordinatedOmission(otherHistogram: JsHistogram, expectedIntervalBetweenValueSamples: number): void;
    /**
     * Get a copy of this histogram, corrected for coordinated omission.
     * <p>
     * To compensate for the loss of sampled values when a recorded value is larger than the expected
     * interval between value samples, the new histogram will include an auto-generated additional series of
     * decreasingly-smaller (down to the expectedIntervalBetweenValueSamples) value records for each count found
     * in the current histogram that is larger than the expectedIntervalBetweenValueSamples.
     *
     * Note: This is a post-correction method, as opposed to the at-recording correction method provided
     * by {@link #recordValueWithExpectedInterval(long, long) recordValueWithExpectedInterval}. The two
     * methods are mutually exclusive, and only one of the two should be be used on a given data set to correct
     * for the same coordinated omission issue.
     * by
     * <p>
     * See notes in the description of the Histogram calls for an illustration of why this corrective behavior is
     * important.
     *
     * @param expectedIntervalBetweenValueSamples If expectedIntervalBetweenValueSamples is larger than 0, add
     *                                           auto-generated value records as appropriate if value is larger
     *                                           than expectedIntervalBetweenValueSamples
     * @return a copy of this histogram, corrected for coordinated omission.
     */
    abstract copyCorrectedForCoordinatedOmission(expectedIntervalBetweenValueSamples: number): JsHistogram;
    /**
     * Add the contents of another histogram to this one.
     * <p>
     * As part of adding the contents, the start/end timestamp range of this histogram will be
     * extended to include the start/end timestamp range of the other histogram.
     *
     * @param otherHistogram The other histogram.
     * @throws (may throw) if values in fromHistogram's are
     * higher than highestTrackableValue.
     */
    add(otherHistogram: JsHistogram): void;
    /**
     * Get the count of recorded values at a specific value (to within the histogram resolution at the value level).
     *
     * @param value The value for which to provide the recorded count
     * @return The total count of values recorded in the histogram within the value range that is
     * {@literal >=} lowestEquivalentValue(<i>value</i>) and {@literal <=} highestEquivalentValue(<i>value</i>)
     */
    private getCountAtValue;
    /**
     * Subtract the contents of another histogram from this one.
     * <p>
     * The start/end timestamps of this histogram will remain unchanged.
     *
     * @param otherHistogram The other histogram.
     * @throws ArrayIndexOutOfBoundsException (may throw) if values in otherHistogram's are higher than highestTrackableValue.
     *
     */
    subtract(otherHistogram: JsHistogram): void;
    establishInternalTackingValues(lengthToCover?: number): void;
    reset(): void;
    destroy(): void;
}
export { JsHistogram as default };
