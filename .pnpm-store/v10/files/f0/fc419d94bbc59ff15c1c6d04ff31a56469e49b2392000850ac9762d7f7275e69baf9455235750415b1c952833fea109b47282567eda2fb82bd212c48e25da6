export declare const NO_TAG = "NO TAG";
export type BitBucketSize = 8 | 16 | 32 | 64 | "packed";
export interface HistogramSummary {
    p50: number;
    p75: number;
    p90: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
    max: number;
    totalCount: number;
}
export default interface Histogram {
    /**
     * Flag to enable automatic resizing of the underlying array
     */
    autoResize: boolean;
    /**
     * The current highest trackable value. May change if autoresize flag is set to true
     */
    readonly highestTrackableValue: number;
    /**
     * Total count of all recorded values in the histogram
     */
    readonly totalCount: number;
    /**
     * The computed standard deviation of all recorded values in the histogram
     */
    readonly stdDeviation: number;
    /**
     * The computed mean value of all recorded values in the histogram
     */
    readonly mean: number;
    /**
     * Main percentiles, max value and total number of recorded values
     */
    readonly summary: HistogramSummary;
    /**
     * A (conservatively high) estimate of the Histogram's total footprint in bytes
     */
    readonly estimatedFootprintInBytes: number;
    readonly maxValue: number;
    readonly minNonZeroValue: number;
    readonly numberOfSignificantValueDigits: number;
    startTimeStampMsec: number;
    endTimeStampMsec: number;
    tag: string;
    /**
     * Record a value in the histogram
     *
     * @param value The value to be recorded
     * @throws may throw Error if value is exceeds highestTrackableValue
     */
    recordValue(value: number): void;
    /**
     * Record a value in the histogram (adding to the value's current count)
     *
     * @param value The value to be recorded
     * @param count The number of occurrences of this value to record
     * @throws ArrayIndexOutOfBoundsException (may throw) if value is exceeds highestTrackableValue
     */
    recordValueWithCount(value: number, count: number): void;
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
    outputPercentileDistribution(percentileTicksPerHalfDistance?: number, outputValueUnitScalingRatio?: number, useCsvFormat?: false): string;
    toJSON(): HistogramSummary;
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
    addWhileCorrectingForCoordinatedOmission(otherHistogram: Histogram, expectedIntervalBetweenValueSamples: number): void;
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
    copyCorrectedForCoordinatedOmission(expectedIntervalBetweenValueSamples: number): Histogram;
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
    add(otherHistogram: Histogram): void;
    /**
     * Subtract the contents of another histogram from this one.
     * <p>
     * The start/end timestamps of this histogram will remain unchanged.
     *
     * @param otherHistogram The other histogram.
     * @throws ArrayIndexOutOfBoundsException (may throw) if values in otherHistogram's are higher than highestTrackableValue.
     *
     */
    subtract(otherHistogram: Histogram): void;
    reset(): void;
    /**
     * Clean up memory associated to this histogram. Useful for WebAssembly implementations
     */
    destroy(): void;
}
export interface HistogramConstructor {
    new (lowestDiscernibleValue: number, highestTrackableValue: number, numberOfSignificantValueDigits: number): Histogram;
}
export declare const toSummary: (histogram: Histogram) => HistogramSummary;
