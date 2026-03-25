import type { AllPerformanceEntry, AllPerformanceEntryData, ReplayContainer, ReplayPerformanceEntry, WebVitalData } from '../types';
export interface Metric {
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
     * Any performance entries relevant to the metric value calculation.
     * The array may also be empty if the metric value was not based on any
     * entries (e.g. a CLS value of 0 given no layout shifts).
     */
    entries: PerformanceEntry[] | LayoutShift[];
}
interface LayoutShift extends PerformanceEntry {
    value: number;
    sources: LayoutShiftAttribution[];
    hadRecentInput: boolean;
}
interface LayoutShiftAttribution {
    node?: Node;
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
}
/**
 * Handler creater for web vitals
 */
export declare function webVitalHandler(getter: (metric: Metric) => ReplayPerformanceEntry<AllPerformanceEntryData>, replay: ReplayContainer): (data: {
    metric: Metric;
}) => void;
/**
 * Create replay performance entries from the browser performance entries.
 */
export declare function createPerformanceEntries(entries: AllPerformanceEntry[]): ReplayPerformanceEntry<AllPerformanceEntryData>[];
/**
 * Add a LCP event to the replay based on a LCP metric.
 */
export declare function getLargestContentfulPaint(metric: Metric): ReplayPerformanceEntry<WebVitalData>;
/**
 * Add a CLS event to the replay based on a CLS metric.
 */
export declare function getCumulativeLayoutShift(metric: Metric): ReplayPerformanceEntry<WebVitalData>;
/**
 * Add an INP event to the replay based on an INP metric.
 */
export declare function getInteractionToNextPaint(metric: Metric): ReplayPerformanceEntry<WebVitalData>;
export {};
//# sourceMappingURL=createPerformanceEntries.d.ts.map