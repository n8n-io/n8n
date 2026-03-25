/**
 * Represents a value point iterated through in a Histogram, with associated stats.
 * <ul>
 * <li><b><code>valueIteratedTo</code></b> :<br> The actual value level that was iterated to by the iterator</li>
 * <li><b><code>prevValueIteratedTo</code></b> :<br> The actual value level that was iterated from by the iterator</li>
 * <li><b><code>countAtValueIteratedTo</code></b> :<br> The count of recorded values in the histogram that
 * exactly match this [lowestEquivalentValue(valueIteratedTo)...highestEquivalentValue(valueIteratedTo)] value
 * range.</li>
 * <li><b><code>countAddedInThisIterationStep</code></b> :<br> The count of recorded values in the histogram that
 * were added to the totalCountToThisValue (below) as a result on this iteration step. Since multiple iteration
 * steps may occur with overlapping equivalent value ranges, the count may be lower than the count found at
 * the value (e.g. multiple linear steps or percentile levels can occur within a single equivalent value range)</li>
 * <li><b><code>totalCountToThisValue</code></b> :<br> The total count of all recorded values in the histogram at
 * values equal or smaller than valueIteratedTo.</li>
 * <li><b><code>totalValueToThisValue</code></b> :<br> The sum of all recorded values in the histogram at values
 * equal or smaller than valueIteratedTo.</li>
 * <li><b><code>percentile</code></b> :<br> The percentile of recorded values in the histogram at values equal
 * or smaller than valueIteratedTo.</li>
 * <li><b><code>percentileLevelIteratedTo</code></b> :<br> The percentile level that the iterator returning this
 * HistogramIterationValue had iterated to. Generally, percentileLevelIteratedTo will be equal to or smaller than
 * percentile, but the same value point can contain multiple iteration levels for some iterators. E.g. a
 * PercentileIterator can stop multiple times in the exact same value point (if the count at that value covers a
 * range of multiple percentiles in the requested percentile iteration points).</li>
 * </ul>
 */
declare class HistogramIterationValue {
    valueIteratedTo: number;
    valueIteratedFrom: number;
    countAtValueIteratedTo: number;
    countAddedInThisIterationStep: number;
    totalCountToThisValue: number;
    totalValueToThisValue: number;
    percentile: number;
    percentileLevelIteratedTo: number;
    constructor();
    reset(): void;
}
export default HistogramIterationValue;
