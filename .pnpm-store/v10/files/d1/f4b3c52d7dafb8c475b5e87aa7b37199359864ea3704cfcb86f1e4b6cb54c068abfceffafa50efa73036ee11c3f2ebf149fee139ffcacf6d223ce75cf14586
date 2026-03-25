import Histogram from "./Histogram";
import { BuildRequest } from "./HistogramBuilder";
/**
 * Records integer values, and provides stable interval {@link Histogram} samples from
 * live recorded data without interrupting or stalling active recording of values. Each interval
 * histogram provided contains all value counts accumulated since the previous interval histogram
 * was taken.
 * <p>
 * This pattern is commonly used in logging interval histogram information while recording is ongoing.
 * <p>
 * {@link Recorder} supports concurrent
 * {@link Recorder#recordValue} or
 * {@link Recorder#recordValueWithExpectedInterval} calls.
 *
 */
declare class Recorder {
    private histogramBuildRequest;
    private clock;
    static idGenerator: number;
    private activeHistogram;
    private inactiveHistogram;
    /**
     * Construct an auto-resizing {@link Recorder} with a lowest discernible value of
     * 1 and an auto-adjusting highestTrackableValue. Can auto-resize up to track values up to Number.MAX_SAFE_INTEGER.
     *
     * @param histogramBuildRequest parameters used to build histograms while using this recorder.
     * @param clock (for testing purpose) an action that give current time in ms since 1970
     */
    constructor(histogramBuildRequest?: BuildRequest, clock?: () => number);
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
     * Record a value
     * <p>
     * To compensate for the loss of sampled values when a recorded value is larger than the expected
     * interval between value samples, Histogram will auto-generate an additional series of decreasingly-smaller
     * (down to the expectedIntervalBetweenValueSamples) value records.
     * <p>
     * See related notes {@link Histogram#recordValueWithExpectedInterval(long, long)}
     * for more explanations about coordinated omission and expected interval correction.
     *      *
     * @param value The value to record
     * @param expectedIntervalBetweenValueSamples If expectedIntervalBetweenValueSamples is larger than 0, add
     *                                           auto-generated value records as appropriate if value is larger
     *                                           than expectedIntervalBetweenValueSamples
     * @throws ArrayIndexOutOfBoundsException (may throw) if value is exceeds highestTrackableValue
     */
    recordValueWithExpectedInterval(value: number, expectedIntervalBetweenValueSamples: number): void;
    /**
     * Get an interval histogram, which will include a stable, consistent view of all value counts
     * accumulated since the last interval histogram was taken.
     * <p>
     * {@link Recorder#getIntervalHistogram(Histogram histogramToRecycle)
     * getIntervalHistogram(histogramToRecycle)}
     * accepts a previously returned interval histogram that can be recycled internally to avoid allocation
     * and content copying operations, and is therefore significantly more efficient for repeated use than
     * {@link Recorder#getIntervalHistogram()} and
     * {@link Recorder#getIntervalHistogramInto getIntervalHistogramInto()}. The provided
     * {@code histogramToRecycle} must
     * be either be null or an interval histogram returned by a previous call to
     * {@link Recorder#getIntervalHistogram(Histogram histogramToRecycle)
     * getIntervalHistogram(histogramToRecycle)} or
     * {@link Recorder#getIntervalHistogram()}.
     * <p>
     * NOTE: The caller is responsible for not recycling the same returned interval histogram more than once. If
     * the same interval histogram instance is recycled more than once, behavior is undefined.
     * <p>
     * Calling {@link Recorder#getIntervalHistogram(Histogram histogramToRecycle)
     * getIntervalHistogram(histogramToRecycle)} will reset the value counts, and start accumulating value
     * counts for the next interval
     *
     * @param histogramToRecycle a previously returned interval histogram that may be recycled to avoid allocation and
     *                           copy operations.
     * @return a histogram containing the value counts accumulated since the last interval histogram was taken.
     */
    getIntervalHistogram(histogramToRecycle?: Histogram): Histogram;
    /**
     * Place a copy of the value counts accumulated since accumulated (since the last interval histogram
     * was taken) into {@code targetHistogram}.
     *
     * Calling {@link Recorder#getIntervalHistogramInto getIntervalHistogramInto()} will reset
     * the value counts, and start accumulating value counts for the next interval.
     *
     * @param targetHistogram the histogram into which the interval histogram's data should be copied
     */
    getIntervalHistogramInto(targetHistogram: Histogram): void;
    /**
     * Reset any value counts accumulated thus far.
     */
    reset(): void;
    private performIntervalSample;
    /**
     * Release memory associated to this recorder by destroying
     * histograms used under the cover.
     * Useful when webassembly histograms are used.
     */
    destroy(): void;
}
export default Recorder;
