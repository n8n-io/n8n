interface PerformanceEntryMap {
    event: PerformanceEventTiming[];
    'first-input': PerformanceEventTiming[];
    'layout-shift': LayoutShift[];
    'largest-contentful-paint': LargestContentfulPaint[];
    'long-animation-frame': PerformanceLongAnimationFrameTiming[];
    paint: PerformancePaintTiming[];
    navigation: PerformanceNavigationTiming[];
    resource: PerformanceResourceTiming[];
    longtask: PerformanceEntry[];
    element: PerformanceEntry[];
}
/**
 * Takes a performance entry type and a callback function, and creates a
 * `PerformanceObserver` instance that will observe the specified entry type
 * with buffering enabled and call the callback _for each entry_.
 *
 * This function also feature-detects entry support and wraps the logic in a
 * try/catch to avoid errors in unsupporting browsers.
 */
export declare const observe: <K extends keyof PerformanceEntryMap>(type: K, callback: (entries: PerformanceEntryMap[K]) => void, opts?: PerformanceObserverInit) => PerformanceObserver | undefined;
export {};
//# sourceMappingURL=observe.d.ts.map
