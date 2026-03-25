import JsHistogram from "./JsHistogram";
import JsHistogramIterator from "./JsHistogramIterator";
/**
 * Used for iterating through all recorded histogram values using the finest granularity steps supported by the
 * underlying representation. The iteration steps through all non-zero recorded value counts, and terminates when
 * all recorded histogram values are exhausted.
 */
declare class RecordedValuesIterator extends JsHistogramIterator {
    visitedIndex: number;
    /**
     * @param histogram The histogram this iterator will operate on
     */
    constructor(histogram: JsHistogram);
    /**
     * Reset iterator for re-use in a fresh iteration over the same histogram data set.
     */
    reset(): void;
    private doReset;
    incrementIterationLevel(): void;
    reachedIterationLevel(): boolean;
}
export default RecordedValuesIterator;
