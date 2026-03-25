export * from './types/base';
export * from './types/cls';
export * from './types/fcp';
export * from './types/inp';
export * from './types/lcp';
export * from './types/ttfb';
interface PerformanceEntryMap {
    navigation: PerformanceNavigationTiming;
    resource: PerformanceResourceTiming;
    paint: PerformancePaintTiming;
}
declare global {
    interface Document {
        prerendering?: boolean;
        wasDiscarded?: boolean;
    }
    interface Performance {
        getEntriesByType<K extends keyof PerformanceEntryMap>(type: K): PerformanceEntryMap[K][];
    }
    interface PerformanceObserverInit {
        durationThreshold?: number;
    }
    interface PerformanceNavigationTiming {
        activationStart?: number;
    }
    interface PerformanceEventTiming extends PerformanceEntry {
        duration: DOMHighResTimeStamp;
        interactionId: number;
    }
    interface LayoutShiftAttribution {
        node: Node | null;
        previousRect: DOMRectReadOnly;
        currentRect: DOMRectReadOnly;
    }
    interface LayoutShift extends PerformanceEntry {
        value: number;
        sources: LayoutShiftAttribution[];
        hadRecentInput: boolean;
    }
    interface LargestContentfulPaint extends PerformanceEntry {
        readonly renderTime: DOMHighResTimeStamp;
        readonly loadTime: DOMHighResTimeStamp;
        readonly size: number;
        readonly id: string;
        readonly url: string;
        readonly element: Element | null;
    }
    export type ScriptInvokerType = 'classic-script' | 'module-script' | 'event-listener' | 'user-callback' | 'resolve-promise' | 'reject-promise';
    export type ScriptWindowAttribution = 'self' | 'descendant' | 'ancestor' | 'same-page' | 'other';
    interface PerformanceScriptTiming extends PerformanceEntry {
        readonly startTime: DOMHighResTimeStamp;
        readonly duration: DOMHighResTimeStamp;
        readonly name: string;
        readonly entryType: string;
        readonly invokerType: ScriptInvokerType;
        readonly invoker: string;
        readonly executionStart: DOMHighResTimeStamp;
        readonly sourceURL: string;
        readonly sourceFunctionName: string;
        readonly sourceCharPosition: number;
        readonly pauseDuration: DOMHighResTimeStamp;
        readonly forcedStyleAndLayoutDuration: DOMHighResTimeStamp;
        readonly window?: Window;
        readonly windowAttribution: ScriptWindowAttribution;
    }
    interface PerformanceLongAnimationFrameTiming extends PerformanceEntry {
        readonly startTime: DOMHighResTimeStamp;
        readonly duration: DOMHighResTimeStamp;
        readonly name: string;
        readonly entryType: string;
        readonly renderStart: DOMHighResTimeStamp;
        readonly styleAndLayoutStart: DOMHighResTimeStamp;
        readonly blockingDuration: DOMHighResTimeStamp;
        readonly firstUIEventTimestamp: DOMHighResTimeStamp;
        readonly scripts: PerformanceScriptTiming[];
    }
}
//# sourceMappingURL=types.d.ts.map