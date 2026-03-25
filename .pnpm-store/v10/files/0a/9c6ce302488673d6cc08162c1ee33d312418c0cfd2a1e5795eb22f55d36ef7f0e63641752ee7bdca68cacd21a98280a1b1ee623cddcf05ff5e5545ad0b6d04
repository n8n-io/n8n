import type { INPMetric, INPReportOpts, MetricRatingThresholds } from './types';
/** Thresholds for INP. See https://web.dev/articles/inp#what_is_a_good_inp_score */
export declare const INPThresholds: MetricRatingThresholds;
/**
 * Calculates the [INP](https://web.dev/articles/inp) value for the current
 * page and calls the `callback` function once the value is ready, along with
 * the `event` performance entries reported for that interaction. The reported
 * value is a `DOMHighResTimeStamp`.
 *
 * A custom `durationThreshold` configuration option can optionally be passed
 * to control what `event-timing` entries are considered for INP reporting. The
 * default threshold is `40`, which means INP scores of less than 40 will not
 * be reported. To avoid reporting no interactions in these cases, the library
 * will fall back to the input delay of the first interaction. Note that this
 * will not affect your 75th percentile INP value unless that value is also
 * less than 40 (well below the recommended
 * [good](https://web.dev/articles/inp#what_is_a_good_inp_score) threshold).
 *
 * If the `reportAllChanges` configuration option is set to `true`, the
 * `callback` function will be called as soon as the value is initially
 * determined as well as any time the value changes throughout the page
 * lifespan.
 *
 * _**Important:** INP should be continually monitored for changes throughout
 * the entire lifespan of a page—including if the user returns to the page after
 * it's been hidden/backgrounded. However, since browsers often [will not fire
 * additional callbacks once the user has backgrounded a
 * page](https://developer.chrome.com/blog/page-lifecycle-api/#advice-hidden),
 * `callback` is always called when the page's visibility state changes to
 * hidden. As a result, the `callback` function might be called multiple times
 * during the same page load._
 */
export declare const onINP: (onReport: (metric: INPMetric) => void, opts?: INPReportOpts) => void;
//# sourceMappingURL=getINP.d.ts.map