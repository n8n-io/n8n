import JsHistogram from "./JsHistogram";
import HistogramIterationValue from "./HistogramIterationValue";
/**
 * Used for iterating through histogram values.
 */
declare abstract class JsHistogramIterator {
    histogram: JsHistogram;
    savedHistogramTotalRawCount: number;
    currentIndex: number;
    currentValueAtIndex: number;
    nextValueAtIndex: number;
    prevValueIteratedTo: number;
    totalCountToPrevIndex: number;
    totalCountToCurrentIndex: number;
    totalValueToCurrentIndex: number;
    arrayTotalCount: number;
    countAtThisValue: number;
    private freshSubBucket;
    currentIterationValue: HistogramIterationValue;
    resetIterator(histogram: JsHistogram): void;
    /**
     * Returns true if the iteration has more elements. (In other words, returns true if next would return an
     * element rather than throwing an exception.)
     *
     * @return true if the iterator has more elements.
     */
    hasNext(): boolean;
    /**
     * Returns the next element in the iteration.
     *
     * @return the {@link HistogramIterationValue} associated with the next element in the iteration.
     */
    next(): HistogramIterationValue;
    abstract incrementIterationLevel(): void;
    /**
     * @return true if the current position's data should be emitted by the iterator
     */
    abstract reachedIterationLevel(): boolean;
    getPercentileIteratedTo(): number;
    getPercentileIteratedFrom(): number;
    getValueIteratedTo(): number;
    private exhaustedSubBuckets;
    incrementSubBucket(): void;
}
export default JsHistogramIterator;
