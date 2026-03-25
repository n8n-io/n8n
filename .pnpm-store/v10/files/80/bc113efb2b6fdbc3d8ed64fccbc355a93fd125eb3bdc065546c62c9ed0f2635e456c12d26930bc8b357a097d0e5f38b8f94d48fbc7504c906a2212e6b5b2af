"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.JsHistogram = void 0;
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
const RecordedValuesIterator_1 = require("./RecordedValuesIterator");
const PercentileIterator_1 = require("./PercentileIterator");
const formatters_1 = require("./formatters");
const ulp_1 = require("./ulp");
const Histogram_1 = require("./Histogram");
const { pow, floor, ceil, log2, max, min } = Math;
class JsHistogram {
    incrementTotalCount() {
        this._totalCount++;
    }
    addToTotalCount(value) {
        this._totalCount += value;
    }
    setTotalCount(value) {
        this._totalCount = value;
    }
    /**
     * Get the total count of all recorded values in the histogram
     * @return the total count of all recorded values in the histogram
     */
    get totalCount() {
        return this._totalCount;
    }
    updatedMaxValue(value) {
        const internalValue = value + this.unitMagnitudeMask;
        this.maxValue = internalValue;
    }
    updateMinNonZeroValue(value) {
        if (value <= this.unitMagnitudeMask) {
            return;
        }
        const internalValue = floor(value / this.lowestDiscernibleValueRounded) *
            this.lowestDiscernibleValueRounded;
        this.minNonZeroValue = internalValue;
    }
    constructor(lowestDiscernibleValue, highestTrackableValue, numberOfSignificantValueDigits) {
        this.autoResize = false;
        this.startTimeStampMsec = Number.MAX_SAFE_INTEGER;
        this.endTimeStampMsec = 0;
        this.tag = Histogram_1.NO_TAG;
        this.maxValue = 0;
        this.minNonZeroValue = Number.MAX_SAFE_INTEGER;
        this.identity = 0;
        this.highestTrackableValue = 0;
        this.lowestDiscernibleValue = 0;
        this.numberOfSignificantValueDigits = 0;
        this.bucketCount = 0;
        this.subBucketCount = 0;
        this.countsArrayLength = 0;
        this.wordSizeInBytes = 0;
        // Verify argument validity
        if (lowestDiscernibleValue < 1) {
            throw new Error("lowestDiscernibleValue must be >= 1");
        }
        if (highestTrackableValue < 2 * lowestDiscernibleValue) {
            throw new Error(`highestTrackableValue must be >= 2 * lowestDiscernibleValue ( 2 * ${lowestDiscernibleValue} )`);
        }
        if (numberOfSignificantValueDigits < 0 ||
            numberOfSignificantValueDigits > 5) {
            throw new Error("numberOfSignificantValueDigits must be between 0 and 5");
        }
        this.identity = JsHistogram.identityBuilder++;
        this.init(lowestDiscernibleValue, highestTrackableValue, numberOfSignificantValueDigits);
    }
    init(lowestDiscernibleValue, highestTrackableValue, numberOfSignificantValueDigits) {
        this.lowestDiscernibleValue = lowestDiscernibleValue;
        this.highestTrackableValue = highestTrackableValue;
        this.numberOfSignificantValueDigits = numberOfSignificantValueDigits;
        /*
         * Given a 3 decimal point accuracy, the expectation is obviously for "+/- 1 unit at 1000". It also means that
         * it's "ok to be +/- 2 units at 2000". The "tricky" thing is that it is NOT ok to be +/- 2 units at 1999. Only
         * starting at 2000. So internally, we need to maintain single unit resolution to 2x 10^decimalPoints.
         */
        const largestValueWithSingleUnitResolution = 2 * floor(pow(10, numberOfSignificantValueDigits));
        this.unitMagnitude = floor(log2(lowestDiscernibleValue));
        this.lowestDiscernibleValueRounded = pow(2, this.unitMagnitude);
        this.unitMagnitudeMask = this.lowestDiscernibleValueRounded - 1;
        // We need to maintain power-of-two subBucketCount (for clean direct indexing) that is large enough to
        // provide unit resolution to at least largestValueWithSingleUnitResolution. So figure out
        // largestValueWithSingleUnitResolution's nearest power-of-two (rounded up), and use that:
        const subBucketCountMagnitude = ceil(log2(largestValueWithSingleUnitResolution));
        this.subBucketHalfCountMagnitude =
            (subBucketCountMagnitude > 1 ? subBucketCountMagnitude : 1) - 1;
        this.subBucketCount = pow(2, this.subBucketHalfCountMagnitude + 1);
        this.subBucketHalfCount = this.subBucketCount / 2;
        this.subBucketMask =
            (floor(this.subBucketCount) - 1) * pow(2, this.unitMagnitude);
        this.establishSize(highestTrackableValue);
        this.leadingZeroCountBase =
            53 - this.unitMagnitude - this.subBucketHalfCountMagnitude - 1;
        this.percentileIterator = new PercentileIterator_1.default(this, 1);
        this.recordedValuesIterator = new RecordedValuesIterator_1.default(this);
    }
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
    establishSize(newHighestTrackableValue) {
        // establish counts array length:
        this.countsArrayLength = this.determineArrayLengthNeeded(newHighestTrackableValue);
        // establish exponent range needed to support the trackable value with no overflow:
        this.bucketCount = this.getBucketsNeededToCoverValue(newHighestTrackableValue);
        // establish the new highest trackable value:
        this.highestTrackableValue = newHighestTrackableValue;
    }
    determineArrayLengthNeeded(highestTrackableValue) {
        if (highestTrackableValue < 2 * this.lowestDiscernibleValue) {
            throw new Error("highestTrackableValue (" +
                highestTrackableValue +
                ") cannot be < (2 * lowestDiscernibleValue)");
        }
        //determine counts array length needed:
        const countsArrayLength = this.getLengthForNumberOfBuckets(this.getBucketsNeededToCoverValue(highestTrackableValue));
        return countsArrayLength;
    }
    /**
     * If we have N such that subBucketCount * 2^N > max value, we need storage for N+1 buckets, each with enough
     * slots to hold the top half of the subBucketCount (the lower half is covered by previous buckets), and the +1
     * being used for the lower half of the 0'th bucket. Or, equivalently, we need 1 more bucket to capture the max
     * value if we consider the sub-bucket length to be halved.
     */
    getLengthForNumberOfBuckets(numberOfBuckets) {
        const lengthNeeded = (numberOfBuckets + 1) * (this.subBucketCount / 2);
        return lengthNeeded;
    }
    getBucketsNeededToCoverValue(value) {
        // the k'th bucket can express from 0 * 2^k to subBucketCount * 2^k in units of 2^k
        let smallestUntrackableValue = this.subBucketCount * pow(2, this.unitMagnitude);
        // always have at least 1 bucket
        let bucketsNeeded = 1;
        while (smallestUntrackableValue <= value) {
            if (smallestUntrackableValue > Number.MAX_SAFE_INTEGER / 2) {
                // TODO check array max size in JavaScript
                // next shift will overflow, meaning that bucket could represent values up to ones greater than
                // Number.MAX_SAFE_INTEGER, so it's the last bucket
                return bucketsNeeded + 1;
            }
            smallestUntrackableValue = smallestUntrackableValue * 2;
            bucketsNeeded++;
        }
        return bucketsNeeded;
    }
    /**
     * Record a value in the histogram
     *
     * @param value The value to be recorded
     * @throws may throw Error if value is exceeds highestTrackableValue
     */
    recordValue(value) {
        this.recordSingleValue(value);
    }
    recordSingleValue(value) {
        const countsIndex = this.countsArrayIndex(value);
        if (countsIndex >= this.countsArrayLength) {
            this.handleRecordException(1, value);
        }
        else {
            this.incrementCountAtIndex(countsIndex);
        }
        this.updateMinAndMax(value);
        this.incrementTotalCount();
    }
    handleRecordException(count, value) {
        if (!this.autoResize) {
            throw new Error("Value " + value + " is outside of histogram covered range");
        }
        this.resize(value);
        var countsIndex = this.countsArrayIndex(value);
        this.addToCountAtIndex(countsIndex, count);
        this.highestTrackableValue = this.highestEquivalentValue(this.valueFromIndex(this.countsArrayLength - 1));
    }
    countsArrayIndex(value) {
        if (value < 0) {
            throw new Error("Histogram recorded value cannot be negative.");
        }
        const bucketIndex = this.getBucketIndex(value);
        const subBucketIndex = this.getSubBucketIndex(value, bucketIndex);
        return this.computeCountsArrayIndex(bucketIndex, subBucketIndex);
    }
    computeCountsArrayIndex(bucketIndex, subBucketIndex) {
        // TODO
        //assert(subBucketIndex < subBucketCount);
        //assert(bucketIndex == 0 || (subBucketIndex >= subBucketHalfCount));
        // Calculate the index for the first entry that will be used in the bucket (halfway through subBucketCount).
        // For bucketIndex 0, all subBucketCount entries may be used, but bucketBaseIndex is still set in the middle.
        const bucketBaseIndex = (bucketIndex + 1) * pow(2, this.subBucketHalfCountMagnitude);
        // Calculate the offset in the bucket. This subtraction will result in a positive value in all buckets except
        // the 0th bucket (since a value in that bucket may be less than half the bucket's 0 to subBucketCount range).
        // However, this works out since we give bucket 0 twice as much space.
        const offsetInBucket = subBucketIndex - this.subBucketHalfCount;
        // The following is the equivalent of ((subBucketIndex  - subBucketHalfCount) + bucketBaseIndex;
        return bucketBaseIndex + offsetInBucket;
    }
    /**
     * @return the lowest (and therefore highest precision) bucket index that can represent the value
     */
    getBucketIndex(value) {
        // Calculates the number of powers of two by which the value is greater than the biggest value that fits in
        // bucket 0. This is the bucket index since each successive bucket can hold a value 2x greater.
        // The mask maps small values to bucket 0.
        // return this.leadingZeroCountBase - Long.numberOfLeadingZeros(value | subBucketMask);
        return max(floor(log2(value)) -
            this.subBucketHalfCountMagnitude -
            this.unitMagnitude, 0);
    }
    getSubBucketIndex(value, bucketIndex) {
        // For bucketIndex 0, this is just value, so it may be anywhere in 0 to subBucketCount.
        // For other bucketIndex, this will always end up in the top half of subBucketCount: assume that for some bucket
        // k > 0, this calculation will yield a value in the bottom half of 0 to subBucketCount. Then, because of how
        // buckets overlap, it would have also been in the top half of bucket k-1, and therefore would have
        // returned k-1 in getBucketIndex(). Since we would then shift it one fewer bits here, it would be twice as big,
        // and therefore in the top half of subBucketCount.
        return floor(value / pow(2, bucketIndex + this.unitMagnitude));
    }
    updateMinAndMax(value) {
        if (value > this.maxValue) {
            this.updatedMaxValue(value);
        }
        if (value < this.minNonZeroValue && value !== 0) {
            this.updateMinNonZeroValue(value);
        }
    }
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
    getValueAtPercentile(percentile) {
        const requestedPercentile = min(percentile, 100); // Truncate down to 100%
        // round count up to nearest integer, to ensure that the largest value that the requested percentile
        // of overall recorded values is actually included. However, this must be done with care:
        //
        // First, Compute fp value for count at the requested percentile. Note that fp result end up
        // being 1 ulp larger than the correct integer count for this percentile:
        const fpCountAtPercentile = (requestedPercentile / 100.0) * this.totalCount;
        // Next, round up, but make sure to prevent <= 1 ulp inaccurancies in the above fp math from
        // making us skip a count:
        const countAtPercentile = max(ceil(fpCountAtPercentile - (0, ulp_1.default)(fpCountAtPercentile)), // round up
        1 // Make sure we at least reach the first recorded entry
        );
        let totalToCurrentIndex = 0;
        for (let i = 0; i < this.countsArrayLength; i++) {
            totalToCurrentIndex += this.getCountAtIndex(i);
            if (totalToCurrentIndex >= countAtPercentile) {
                var valueAtIndex = this.valueFromIndex(i);
                return percentile === 0.0
                    ? this.lowestEquivalentValue(valueAtIndex)
                    : this.highestEquivalentValue(valueAtIndex);
            }
        }
        return 0;
    }
    valueFromIndexes(bucketIndex, subBucketIndex) {
        return subBucketIndex * pow(2, bucketIndex + this.unitMagnitude);
    }
    valueFromIndex(index) {
        let bucketIndex = floor(index / this.subBucketHalfCount) - 1;
        let subBucketIndex = (index % this.subBucketHalfCount) + this.subBucketHalfCount;
        if (bucketIndex < 0) {
            subBucketIndex -= this.subBucketHalfCount;
            bucketIndex = 0;
        }
        return this.valueFromIndexes(bucketIndex, subBucketIndex);
    }
    /**
     * Get the lowest value that is equivalent to the given value within the histogram's resolution.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The lowest value that is equivalent to the given value within the histogram's resolution.
     */
    lowestEquivalentValue(value) {
        const bucketIndex = this.getBucketIndex(value);
        const subBucketIndex = this.getSubBucketIndex(value, bucketIndex);
        const thisValueBaseLevel = this.valueFromIndexes(bucketIndex, subBucketIndex);
        return thisValueBaseLevel;
    }
    /**
     * Get the highest value that is equivalent to the given value within the histogram's resolution.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The highest value that is equivalent to the given value within the histogram's resolution.
     */
    highestEquivalentValue(value) {
        return this.nextNonEquivalentValue(value) - 1;
    }
    /**
     * Get the next value that is not equivalent to the given value within the histogram's resolution.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The next value that is not equivalent to the given value within the histogram's resolution.
     */
    nextNonEquivalentValue(value) {
        return (this.lowestEquivalentValue(value) + this.sizeOfEquivalentValueRange(value));
    }
    /**
     * Get the size (in value units) of the range of values that are equivalent to the given value within the
     * histogram's resolution. Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The size of the range of values equivalent to the given value.
     */
    sizeOfEquivalentValueRange(value) {
        const bucketIndex = this.getBucketIndex(value);
        const subBucketIndex = this.getSubBucketIndex(value, bucketIndex);
        const distanceToNextValue = pow(2, this.unitMagnitude +
            (subBucketIndex >= this.subBucketCount ? bucketIndex + 1 : bucketIndex));
        return distanceToNextValue;
    }
    /**
     * Get a value that lies in the middle (rounded up) of the range of values equivalent the given value.
     * Where "equivalent" means that value samples recorded for any two
     * equivalent values are counted in a common total count.
     *
     * @param value The given value
     * @return The value lies in the middle (rounded up) of the range of values equivalent the given value.
     */
    medianEquivalentValue(value) {
        return (this.lowestEquivalentValue(value) +
            floor(this.sizeOfEquivalentValueRange(value) / 2));
    }
    /**
     * Get the computed mean value of all recorded values in the histogram
     *
     * @return the mean value (in value units) of the histogram data
     */
    get mean() {
        if (this.totalCount === 0) {
            return 0;
        }
        this.recordedValuesIterator.reset();
        let totalValue = 0;
        while (this.recordedValuesIterator.hasNext()) {
            const iterationValue = this.recordedValuesIterator.next();
            totalValue +=
                this.medianEquivalentValue(iterationValue.valueIteratedTo) *
                    iterationValue.countAtValueIteratedTo;
        }
        return totalValue / this.totalCount;
    }
    getStdDeviation(mean = this.mean) {
        if (this.totalCount === 0) {
            return 0;
        }
        let geometric_deviation_total = 0.0;
        this.recordedValuesIterator.reset();
        while (this.recordedValuesIterator.hasNext()) {
            const iterationValue = this.recordedValuesIterator.next();
            const deviation = this.medianEquivalentValue(iterationValue.valueIteratedTo) - mean;
            geometric_deviation_total +=
                deviation * deviation * iterationValue.countAddedInThisIterationStep;
        }
        const std_deviation = Math.sqrt(geometric_deviation_total / this.totalCount);
        return std_deviation;
    }
    /**
     * Get the computed standard deviation of all recorded values in the histogram
     *
     * @return the standard deviation (in value units) of the histogram data
     */
    get stdDeviation() {
        if (this.totalCount === 0) {
            return 0;
        }
        const mean = this.mean;
        let geometric_deviation_total = 0.0;
        this.recordedValuesIterator.reset();
        while (this.recordedValuesIterator.hasNext()) {
            const iterationValue = this.recordedValuesIterator.next();
            const deviation = this.medianEquivalentValue(iterationValue.valueIteratedTo) - mean;
            geometric_deviation_total +=
                deviation * deviation * iterationValue.countAddedInThisIterationStep;
        }
        const std_deviation = Math.sqrt(geometric_deviation_total / this.totalCount);
        return std_deviation;
    }
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
    outputPercentileDistribution(percentileTicksPerHalfDistance = 5, outputValueUnitScalingRatio = 1, useCsvFormat = false) {
        let result = "";
        if (useCsvFormat) {
            result += '"Value","Percentile","TotalCount","1/(1-Percentile)"\n';
        }
        else {
            result += "       Value     Percentile TotalCount 1/(1-Percentile)\n\n";
        }
        const iterator = this.percentileIterator;
        iterator.reset(percentileTicksPerHalfDistance);
        let lineFormatter;
        let lastLineFormatter;
        if (useCsvFormat) {
            const valueFormatter = (0, formatters_1.floatFormatter)(0, this.numberOfSignificantValueDigits);
            const percentileFormatter = (0, formatters_1.floatFormatter)(0, 12);
            const lastFormatter = (0, formatters_1.floatFormatter)(0, 2);
            lineFormatter = (iterationValue) => valueFormatter(iterationValue.valueIteratedTo / outputValueUnitScalingRatio) +
                "," +
                percentileFormatter(iterationValue.percentileLevelIteratedTo / 100) +
                "," +
                iterationValue.totalCountToThisValue +
                "," +
                lastFormatter(1 / (1 - iterationValue.percentileLevelIteratedTo / 100)) +
                "\n";
            lastLineFormatter = (iterationValue) => valueFormatter(iterationValue.valueIteratedTo / outputValueUnitScalingRatio) +
                "," +
                percentileFormatter(iterationValue.percentileLevelIteratedTo / 100) +
                "," +
                iterationValue.totalCountToThisValue +
                ",Infinity\n";
        }
        else {
            const valueFormatter = (0, formatters_1.floatFormatter)(12, this.numberOfSignificantValueDigits);
            const percentileFormatter = (0, formatters_1.floatFormatter)(2, 12);
            const totalCountFormatter = (0, formatters_1.integerFormatter)(10);
            const lastFormatter = (0, formatters_1.floatFormatter)(14, 2);
            lineFormatter = (iterationValue) => valueFormatter(iterationValue.valueIteratedTo / outputValueUnitScalingRatio) +
                " " +
                percentileFormatter(iterationValue.percentileLevelIteratedTo / 100) +
                " " +
                totalCountFormatter(iterationValue.totalCountToThisValue) +
                " " +
                lastFormatter(1 / (1 - iterationValue.percentileLevelIteratedTo / 100)) +
                "\n";
            lastLineFormatter = (iterationValue) => valueFormatter(iterationValue.valueIteratedTo / outputValueUnitScalingRatio) +
                " " +
                percentileFormatter(iterationValue.percentileLevelIteratedTo / 100) +
                " " +
                totalCountFormatter(iterationValue.totalCountToThisValue) +
                "\n";
        }
        while (iterator.hasNext()) {
            const iterationValue = iterator.next();
            if (iterationValue.percentileLevelIteratedTo < 100) {
                result += lineFormatter(iterationValue);
            }
            else {
                result += lastLineFormatter(iterationValue);
            }
        }
        if (!useCsvFormat) {
            // Calculate and output mean and std. deviation.
            // Note: mean/std. deviation numbers are very often completely irrelevant when
            // data is extremely non-normal in distribution (e.g. in cases of strong multi-modal
            // response time distribution associated with GC pauses). However, reporting these numbers
            // can be very useful for contrasting with the detailed percentile distribution
            // reported by outputPercentileDistribution(). It is not at all surprising to find
            // percentile distributions where results fall many tens or even hundreds of standard
            // deviations away from the mean - such results simply indicate that the data sampled
            // exhibits a very non-normal distribution, highlighting situations for which the std.
            // deviation metric is a useless indicator.
            //
            const formatter = (0, formatters_1.floatFormatter)(12, this.numberOfSignificantValueDigits);
            const _mean = this.mean;
            const mean = formatter(_mean / outputValueUnitScalingRatio);
            const std_deviation = formatter(this.getStdDeviation(_mean) / outputValueUnitScalingRatio);
            const max = formatter(this.maxValue / outputValueUnitScalingRatio);
            const intFormatter = (0, formatters_1.integerFormatter)(12);
            const totalCount = intFormatter(this.totalCount);
            const bucketCount = intFormatter(this.bucketCount);
            const subBucketCount = intFormatter(this.subBucketCount);
            result += `#[Mean    = ${mean}, StdDeviation   = ${std_deviation}]
#[Max     = ${max}, Total count    = ${totalCount}]
#[Buckets = ${bucketCount}, SubBuckets     = ${subBucketCount}]
`;
        }
        return result;
    }
    get summary() {
        return (0, Histogram_1.toSummary)(this);
    }
    toJSON() {
        return this.summary;
    }
    inspect() {
        return this.toString();
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
        return this.toString();
    }
    /**
     * Provide a (conservatively high) estimate of the Histogram's total footprint in bytes
     *
     * @return a (conservatively high) estimate of the Histogram's total footprint in bytes
     */
    get estimatedFootprintInBytes() {
        return this._getEstimatedFootprintInBytes();
    }
    recordSingleValueWithExpectedInterval(value, expectedIntervalBetweenValueSamples) {
        this.recordSingleValue(value);
        if (expectedIntervalBetweenValueSamples <= 0) {
            return;
        }
        for (let missingValue = value - expectedIntervalBetweenValueSamples; missingValue >= expectedIntervalBetweenValueSamples; missingValue -= expectedIntervalBetweenValueSamples) {
            this.recordSingleValue(missingValue);
        }
    }
    recordCountAtValue(count, value) {
        const countsIndex = this.countsArrayIndex(value);
        if (countsIndex >= this.countsArrayLength) {
            this.handleRecordException(count, value);
        }
        else {
            this.addToCountAtIndex(countsIndex, count);
        }
        this.updateMinAndMax(value);
        this.addToTotalCount(count);
    }
    /**
     * Record a value in the histogram (adding to the value's current count)
     *
     * @param value The value to be recorded
     * @param count The number of occurrences of this value to record
     * @throws ArrayIndexOutOfBoundsException (may throw) if value is exceeds highestTrackableValue
     */
    recordValueWithCount(value, count) {
        this.recordCountAtValue(count, value);
    }
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
    recordValueWithExpectedInterval(value, expectedIntervalBetweenValueSamples) {
        this.recordSingleValueWithExpectedInterval(value, expectedIntervalBetweenValueSamples);
    }
    recordValueWithCountAndExpectedInterval(value, count, expectedIntervalBetweenValueSamples) {
        this.recordCountAtValue(count, value);
        if (expectedIntervalBetweenValueSamples <= 0) {
            return;
        }
        for (let missingValue = value - expectedIntervalBetweenValueSamples; missingValue >= expectedIntervalBetweenValueSamples; missingValue -= expectedIntervalBetweenValueSamples) {
            this.recordCountAtValue(count, missingValue);
        }
    }
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
    addWhileCorrectingForCoordinatedOmission(otherHistogram, expectedIntervalBetweenValueSamples) {
        const toHistogram = this;
        const otherValues = new RecordedValuesIterator_1.default(otherHistogram);
        while (otherValues.hasNext()) {
            const v = otherValues.next();
            toHistogram.recordValueWithCountAndExpectedInterval(v.valueIteratedTo, v.countAtValueIteratedTo, expectedIntervalBetweenValueSamples);
        }
    }
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
    add(otherHistogram) {
        if (!(otherHistogram instanceof JsHistogram)) {
            // should be impossible to be in this situation but actually
            // TypeScript has some flaws...
            throw new Error("Cannot add a WASM histogram to a regular JS histogram");
        }
        const highestRecordableValue = this.highestEquivalentValue(this.valueFromIndex(this.countsArrayLength - 1));
        if (highestRecordableValue < otherHistogram.maxValue) {
            if (!this.autoResize) {
                throw new Error("The other histogram includes values that do not fit in this histogram's range.");
            }
            this.resize(otherHistogram.maxValue);
        }
        if (this.bucketCount === otherHistogram.bucketCount &&
            this.subBucketCount === otherHistogram.subBucketCount &&
            this.unitMagnitude === otherHistogram.unitMagnitude) {
            // Counts arrays are of the same length and meaning, so we can just iterate and add directly:
            let observedOtherTotalCount = 0;
            for (let i = 0; i < otherHistogram.countsArrayLength; i++) {
                const otherCount = otherHistogram.getCountAtIndex(i);
                if (otherCount > 0) {
                    this.addToCountAtIndex(i, otherCount);
                    observedOtherTotalCount += otherCount;
                }
            }
            this.setTotalCount(this.totalCount + observedOtherTotalCount);
            this.updatedMaxValue(max(this.maxValue, otherHistogram.maxValue));
            this.updateMinNonZeroValue(min(this.minNonZeroValue, otherHistogram.minNonZeroValue));
        }
        else {
            // Arrays are not a direct match (or the other could change on the fly in some valid way),
            // so we can't just stream through and add them. Instead, go through the array and add each
            // non-zero value found at it's proper value:
            // Do max value first, to avoid max value updates on each iteration:
            const otherMaxIndex = otherHistogram.countsArrayIndex(otherHistogram.maxValue);
            let otherCount = otherHistogram.getCountAtIndex(otherMaxIndex);
            this.recordCountAtValue(otherCount, otherHistogram.valueFromIndex(otherMaxIndex));
            // Record the remaining values, up to but not including the max value:
            for (let i = 0; i < otherMaxIndex; i++) {
                otherCount = otherHistogram.getCountAtIndex(i);
                if (otherCount > 0) {
                    this.recordCountAtValue(otherCount, otherHistogram.valueFromIndex(i));
                }
            }
        }
        this.startTimeStampMsec = min(this.startTimeStampMsec, otherHistogram.startTimeStampMsec);
        this.endTimeStampMsec = max(this.endTimeStampMsec, otherHistogram.endTimeStampMsec);
    }
    /**
     * Get the count of recorded values at a specific value (to within the histogram resolution at the value level).
     *
     * @param value The value for which to provide the recorded count
     * @return The total count of values recorded in the histogram within the value range that is
     * {@literal >=} lowestEquivalentValue(<i>value</i>) and {@literal <=} highestEquivalentValue(<i>value</i>)
     */
    getCountAtValue(value) {
        const index = min(max(0, this.countsArrayIndex(value)), this.countsArrayLength - 1);
        return this.getCountAtIndex(index);
    }
    /**
     * Subtract the contents of another histogram from this one.
     * <p>
     * The start/end timestamps of this histogram will remain unchanged.
     *
     * @param otherHistogram The other histogram.
     * @throws ArrayIndexOutOfBoundsException (may throw) if values in otherHistogram's are higher than highestTrackableValue.
     *
     */
    subtract(otherHistogram) {
        const highestRecordableValue = this.valueFromIndex(this.countsArrayLength - 1);
        if (!(otherHistogram instanceof JsHistogram)) {
            // should be impossible to be in this situation but actually
            // TypeScript has some flaws...
            throw new Error("Cannot subtract a WASM histogram to a regular JS histogram");
        }
        if (highestRecordableValue < otherHistogram.maxValue) {
            if (!this.autoResize) {
                throw new Error("The other histogram includes values that do not fit in this histogram's range.");
            }
            this.resize(otherHistogram.maxValue);
        }
        if (this.bucketCount === otherHistogram.bucketCount &&
            this.subBucketCount === otherHistogram.subBucketCount &&
            this.unitMagnitude === otherHistogram.unitMagnitude) {
            // optim
            // Counts arrays are of the same length and meaning, so we can just iterate and add directly:
            let observedOtherTotalCount = 0;
            for (let i = 0; i < otherHistogram.countsArrayLength; i++) {
                const otherCount = otherHistogram.getCountAtIndex(i);
                if (otherCount > 0) {
                    this.addToCountAtIndex(i, -otherCount);
                    observedOtherTotalCount += otherCount;
                }
            }
            this.setTotalCount(this.totalCount - observedOtherTotalCount);
        }
        else {
            for (let i = 0; i < otherHistogram.countsArrayLength; i++) {
                const otherCount = otherHistogram.getCountAtIndex(i);
                if (otherCount > 0) {
                    const otherValue = otherHistogram.valueFromIndex(i);
                    if (this.getCountAtValue(otherValue) < otherCount) {
                        throw new Error("otherHistogram count (" +
                            otherCount +
                            ") at value " +
                            otherValue +
                            " is larger than this one's (" +
                            this.getCountAtValue(otherValue) +
                            ")");
                    }
                    this.recordCountAtValue(-otherCount, otherValue);
                }
            }
        }
        // With subtraction, the max and minNonZero values could have changed:
        if (this.getCountAtValue(this.maxValue) <= 0 ||
            this.getCountAtValue(this.minNonZeroValue) <= 0) {
            this.establishInternalTackingValues();
        }
    }
    establishInternalTackingValues(lengthToCover = this.countsArrayLength) {
        this.maxValue = 0;
        this.minNonZeroValue = Number.MAX_VALUE;
        let maxIndex = -1;
        let minNonZeroIndex = -1;
        let observedTotalCount = 0;
        for (let index = 0; index < lengthToCover; index++) {
            const countAtIndex = this.getCountAtIndex(index);
            if (countAtIndex > 0) {
                observedTotalCount += countAtIndex;
                maxIndex = index;
                if (minNonZeroIndex == -1 && index != 0) {
                    minNonZeroIndex = index;
                }
            }
        }
        if (maxIndex >= 0) {
            this.updatedMaxValue(this.highestEquivalentValue(this.valueFromIndex(maxIndex)));
        }
        if (minNonZeroIndex >= 0) {
            this.updateMinNonZeroValue(this.valueFromIndex(minNonZeroIndex));
        }
        this.setTotalCount(observedTotalCount);
    }
    reset() {
        this.clearCounts();
        this.setTotalCount(0);
        this.startTimeStampMsec = 0;
        this.endTimeStampMsec = 0;
        this.tag = Histogram_1.NO_TAG;
        this.maxValue = 0;
        this.minNonZeroValue = Number.MAX_SAFE_INTEGER;
    }
    destroy() {
        // no op - not needed here
    }
}
exports.JsHistogram = JsHistogram;
exports.default = JsHistogram;
//# sourceMappingURL=JsHistogram.js.map