import { LCPMetric, MetricRatingThresholds, ReportOpts } from './types';
/** Thresholds for LCP. See https://web.dev/articles/lcp#what_is_a_good_lcp_score */
export declare const LCPThresholds: MetricRatingThresholds;
/**
 * Calculates the [LCP](https://web.dev/articles/lcp) value for the current page and
 * calls the `callback` function once the value is ready (along with the
 * relevant `largest-contentful-paint` performance entry used to determine the
 * value). The reported value is a `DOMHighResTimeStamp`.
 *
 * If the `reportAllChanges` configuration option is set to `true`, the
 * `callback` function will be called any time a new `largest-contentful-paint`
 * performance entry is dispatched, or once the final value of the metric has
 * been determined.
 */
export declare const onLCP: (onReport: (metric: LCPMetric) => void, opts?: ReportOpts) => void;
//# sourceMappingURL=getLCP.d.ts.map
