import { LoadState, Metric } from './base';
/**
 * A CLS-specific version of the Metric object.
 */
export interface CLSMetric extends Metric {
    name: 'CLS';
    entries: LayoutShift[];
}
/**
 * An object containing potentially-helpful debugging information that
 * can be sent along with the CLS value for the current page visit in order
 * to help identify issues happening to real-users in the field.
 */
export interface CLSAttribution {
    /**
     * By default, a selector identifying the first element (in document order)
     * that shifted when the single largest layout shift that contributed to the
     * page's CLS score occurred. If the `generateTarget` configuration option
     * was passed, then this will instead be the return value of that function,
     * falling back to the default if that returns null or undefined.
     */
    largestShiftTarget?: string;
    /**
     * The time when the single largest layout shift contributing to the page's
     * CLS score occurred.
     */
    largestShiftTime?: DOMHighResTimeStamp;
    /**
     * The layout shift score of the single largest layout shift contributing to
     * the page's CLS score.
     */
    largestShiftValue?: number;
    /**
     * The `LayoutShiftEntry` representing the single largest layout shift
     * contributing to the page's CLS score. (Useful when you need more than just
     * `largestShiftTarget`, `largestShiftTime`, and `largestShiftValue`).
     */
    largestShiftEntry?: LayoutShift;
    /**
     * The first element source (in document order) among the `sources` list
     * of the `largestShiftEntry` object. (Also useful when you need more than
     * just `largestShiftTarget`, `largestShiftTime`, and `largestShiftValue`).
     */
    largestShiftSource?: LayoutShiftAttribution;
    /**
     * The loading state of the document at the time when the largest layout
     * shift contribution to the page's CLS score occurred (see `LoadState`
     * for details).
     */
    loadState?: LoadState;
}
/**
 * A CLS-specific version of the Metric object with attribution.
 */
export interface CLSMetricWithAttribution extends CLSMetric {
    attribution: CLSAttribution;
}
//# sourceMappingURL=cls.d.ts.map
