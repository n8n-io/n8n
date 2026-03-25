import { CLSMetric, CLSMetricWithAttribution } from './cls';
import { FCPMetric, FCPMetricWithAttribution } from './fcp';
import { INPMetric, INPMetricWithAttribution } from './inp';
import { LCPMetric, LCPMetricWithAttribution } from './lcp';
import { TTFBMetric, TTFBMetricWithAttribution } from './ttfb';
export interface Metric {
    /**
     * The name of the metric (in acronym form).
     */
    name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
    /**
     * The current value of the metric.
     */
    value: number;
    /**
     * The rating as to whether the metric value is within the "good",
     * "needs improvement", or "poor" thresholds of the metric.
     */
    rating: 'good' | 'needs-improvement' | 'poor';
    /**
     * The delta between the current value and the last-reported value.
     * On the first report, `delta` and `value` will always be the same.
     */
    delta: number;
    /**
     * A unique ID representing this particular metric instance. This ID can
     * be used by an analytics tool to dedupe multiple values sent for the same
     * metric instance, or to group multiple deltas together and calculate a
     * total. It can also be used to differentiate multiple different metric
     * instances sent from the same page, which can happen if the page is
     * restored from the back/forward cache (in that case new metrics object
     * get created).
     */
    id: string;
    /**
     * Any performance entries relevant to the metric value calculation.
     * The array may also be empty if the metric value was not based on any
     * entries (e.g. a CLS value of 0 given no layout shifts).
     */
    entries: PerformanceEntry[];
    /**
     * The type of navigation.
     *
     * This will be the value returned by the Navigation Timing API (or
     * `undefined` if the browser doesn't support that API), with the following
     * exceptions:
     * - 'back-forward-cache': for pages that are restored from the bfcache.
     * - 'back_forward' is renamed to 'back-forward' for consistency.
     * - 'prerender': for pages that were prerendered.
     * - 'restore': for pages that were discarded by the browser and then
     * restored by the user.
     */
    navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore';
}
/** The union of supported metric types. */
export type MetricType = CLSMetric | FCPMetric | INPMetric | LCPMetric | TTFBMetric;
/** The union of supported metric attribution types. */
export type MetricWithAttribution = CLSMetricWithAttribution | FCPMetricWithAttribution | INPMetricWithAttribution | LCPMetricWithAttribution | TTFBMetricWithAttribution;
/**
 * The thresholds of metric's "good", "needs improvement", and "poor" ratings.
 *
 * - Metric values up to and including [0] are rated "good"
 * - Metric values up to and including [1] are rated "needs improvement"
 * - Metric values above [1] are "poor"
 *
 * | Metric value    | Rating              |
 * | --------------- | ------------------- |
 * | ≦ [0]           | "good"              |
 * | > [0] and ≦ [1] | "needs improvement" |
 * | > [1]           | "poor"              |
 */
export type MetricRatingThresholds = [
    number,
    number
];
/**
 * @deprecated Use metric-specific function types instead, such as:
 * `(metric: LCPMetric) => void`. If a single callback type is needed for
 * multiple metrics, use `(metric: MetricType) => void`.
 */
export interface ReportCallback {
    (metric: MetricType): void;
}
export interface ReportOpts {
    reportAllChanges?: boolean;
}
export interface AttributionReportOpts extends ReportOpts {
    generateTarget?: (el: Node | null) => string | undefined;
}
/**
 * The loading state of the document. Note: this value is similar to
 * `document.readyState` but it subdivides the "interactive" state into the
 * time before and after the DOMContentLoaded event fires.
 *
 * State descriptions:
 * - `loading`: the initial document response has not yet been fully downloaded
 *   and parsed. This is equivalent to the corresponding `readyState` value.
 * - `dom-interactive`: the document has been fully loaded and parsed, but
 *   scripts may not have yet finished loading and executing.
 * - `dom-content-loaded`: the document is fully loaded and parsed, and all
 *   scripts (except `async` scripts) have loaded and finished executing.
 * - `complete`: the document and all of its sub-resources have finished
 *   loading. This is equivalent to the corresponding `readyState` value.
 */
export type LoadState = 'loading' | 'dom-interactive' | 'dom-content-loaded' | 'complete';
//# sourceMappingURL=base.d.ts.map
