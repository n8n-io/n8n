type InstrumentHandlerTypePerformanceObserver = 'longtask' | 'event' | 'navigation' | 'paint' | 'resource' | 'element' | 'first-input';
interface PerformanceEntry {
    readonly duration: number;
    readonly entryType: string;
    readonly name: string;
    readonly startTime: number;
    toJSON(): Record<string, unknown>;
}
interface PerformanceEventTiming extends PerformanceEntry {
    processingStart: number;
    processingEnd: number;
    duration: number;
    cancelable?: boolean;
    target?: unknown | null;
    interactionId?: number;
}
interface PerformanceScriptTiming extends PerformanceEntry {
    sourceURL: string;
    sourceFunctionName: string;
    sourceCharPosition: number;
    invoker: string;
    invokerType: string;
}
export interface PerformanceLongAnimationFrameTiming extends PerformanceEntry {
    scripts: PerformanceScriptTiming[];
}
interface Metric {
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
     * The type of navigation
     *
     * Navigation Timing API (or `undefined` if the browser doesn't
     * support that API). For pages that are restored from the bfcache, this
     * value will be 'back-forward-cache'.
     */
    navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore';
}
type CleanupHandlerCallback = () => void;
/**
 * Add a callback that will be triggered when a CLS metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 *
 * Pass `stopOnCallback = true` to stop listening for CLS when the cleanup callback is called.
 * This will lead to the CLS being finalized and frozen.
 */
export declare function addClsInstrumentationHandler(callback: (data: {
    metric: Metric;
}) => void, stopOnCallback?: boolean): CleanupHandlerCallback;
/**
 * Add a callback that will be triggered when a LCP metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 *
 * Pass `stopOnCallback = true` to stop listening for LCP when the cleanup callback is called.
 * This will lead to the LCP being finalized and frozen.
 */
export declare function addLcpInstrumentationHandler(callback: (data: {
    metric: Metric;
}) => void, stopOnCallback?: boolean): CleanupHandlerCallback;
/**
 * Add a callback that will be triggered when a TTFD metric is available.
 */
export declare function addTtfbInstrumentationHandler(callback: (data: {
    metric: Metric;
}) => void): CleanupHandlerCallback;
export type InstrumentationHandlerCallback = (data: {
    metric: Omit<Metric, 'entries'> & {
        entries: PerformanceEventTiming[];
    };
}) => void;
/**
 * Add a callback that will be triggered when a INP metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 */
export declare function addInpInstrumentationHandler(callback: InstrumentationHandlerCallback): CleanupHandlerCallback;
export declare function addPerformanceInstrumentationHandler(type: 'event', callback: (data: {
    entries: ((PerformanceEntry & {
        target?: unknown | null;
    }) | PerformanceEventTiming)[];
}) => void): CleanupHandlerCallback;
export declare function addPerformanceInstrumentationHandler(type: InstrumentHandlerTypePerformanceObserver, callback: (data: {
    entries: PerformanceEntry[];
}) => void): CleanupHandlerCallback;
/**
 * Check if a PerformanceEntry is a PerformanceEventTiming by checking for the `duration` property.
 */
export declare function isPerformanceEventTiming(entry: PerformanceEntry): entry is PerformanceEventTiming;
export {};
//# sourceMappingURL=instrument.d.ts.map