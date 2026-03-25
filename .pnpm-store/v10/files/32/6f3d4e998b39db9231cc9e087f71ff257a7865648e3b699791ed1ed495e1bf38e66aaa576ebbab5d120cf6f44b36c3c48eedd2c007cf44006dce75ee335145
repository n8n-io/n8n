import type { AttributionReportOpts, LoadState, Metric, ReportOpts } from './base';
export interface INPReportOpts extends ReportOpts {
    durationThreshold?: number;
}
export interface INPAttributionReportOpts extends AttributionReportOpts {
    durationThreshold?: number;
}
/**
 * An INP-specific version of the Metric object.
 */
export interface INPMetric extends Metric {
    name: 'INP';
    entries: PerformanceEventTiming[];
}
export interface INPLongestScriptSummary {
    /**
     * The longest Long Animation Frame script entry that intersects the INP
     * interaction.
     */
    entry: PerformanceScriptTiming;
    /**
     * The INP subpart where the longest script ran.
     */
    subpart: 'input-delay' | 'processing-duration' | 'presentation-delay';
    /**
     * The amount of time the longest script intersected the INP duration.
     */
    intersectingDuration: number;
}
/**
 * An object containing potentially-helpful debugging information that
 * can be sent along with the INP value for the current page visit in order
 * to help identify issues happening to real-users in the field.
 */
export interface INPAttribution {
    /**
     * By default, a selector identifying the element that the user first
     * interacted with as part of the frame where the INP candidate interaction
     * occurred. If this value is an empty string, that generally means the
     * element was removed from the DOM after the interaction. If the
     * `generateTarget` configuration option was passed, then this will instead
     * be the return value of that function, falling back to the default if that
     * returns null or undefined.
     */
    interactionTarget: string;
    /**
     * The time when the user first interacted during the frame where the INP
     * candidate interaction occurred (if more than one interaction occurred
     * within the frame, only the first time is reported).
     */
    interactionTime: DOMHighResTimeStamp;
    /**
     * The type of interaction, based on the event type of the `event` entry
     * that corresponds to the interaction (i.e. the first `event` entry
     * containing an `interactionId` dispatched in a given animation frame).
     * For "pointerdown", "pointerup", or "click" events this will be "pointer",
     * and for "keydown" or "keyup" events this will be "keyboard".
     */
    interactionType: 'pointer' | 'keyboard';
    /**
     * The best-guess timestamp of the next paint after the interaction.
     * In general, this timestamp is the same as the `startTime + duration` of
     * the event timing entry. However, since duration values are rounded to the
     * nearest 8ms (and can be rounded down), this value is clamped to always be
     * reported after the processing times.
     */
    nextPaintTime: DOMHighResTimeStamp;
    /**
     * An array of Event Timing entries that were processed within the same
     * animation frame as the INP candidate interaction.
     */
    processedEventEntries: PerformanceEventTiming[];
    /**
     * The time from when the user interacted with the page until when the
     * browser was first able to start processing event listeners for that
     * interaction. This time captures the delay before event processing can
     * begin due to the main thread being busy with other work.
     */
    inputDelay: number;
    /**
     * The time from when the first event listener started running in response to
     * the user interaction until when all event listener processing has finished.
     */
    processingDuration: number;
    /**
     * The time from when the browser finished processing all event listeners for
     * the user interaction until the next frame is presented on the screen and
     * visible to the user. This time includes work on the main thread (such as
     * `requestAnimationFrame()` callbacks, `ResizeObserver` and
     * `IntersectionObserver` callbacks, and style/layout calculation) as well
     * as off-main-thread work (such as compositor, GPU, and raster work).
     */
    presentationDelay: number;
    /**
     * The loading state of the document at the time when the interaction
     * corresponding to INP occurred (see `LoadState` for details). If the
     * interaction occurred while the document was loading and executing script
     * (e.g. usually in the `dom-interactive` phase) it can result in long delays.
     */
    loadState: LoadState;
    /**
     * If the browser supports the Long Animation Frame API, this array will
     * include any `long-animation-frame` entries that intersect with the INP
     * candidate interaction's `startTime` and the `processingEnd` time of the
     * last event processed within that animation frame. If the browser does not
     * support the Long Animation Frame API or no `long-animation-frame` entries
     * are detected, this array will be empty.
     */
    longAnimationFrameEntries: PerformanceLongAnimationFrameTiming[];
    /**
     * Summary information about the longest script entry intersecting the INP
     * duration. Note, only script entries above 5 milliseconds are reported by
     * the Long Animation Frame API.
     */
    longestScript?: INPLongestScriptSummary;
    /**
     * The total duration of Long Animation Frame scripts that intersect the INP
     * duration excluding any forced style and layout (that is included in
     * totalStyleAndLayout). Note, this is limited to scripts > 5 milliseconds.
     */
    totalScriptDuration?: number;
    /**
     * The total style and layout duration from any Long Animation Frames
     * intersecting the INP interaction. This includes any end-of-frame style and
     * layout duration + any forced style and layout duration.
     */
    totalStyleAndLayoutDuration?: number;
    /**
     * The off main-thread presentation delay from the end of the last Long
     * Animation Frame (where available) until the INP end point.
     */
    totalPaintDuration?: number;
    /**
     * The total unattributed time not included in any of the previous totals.
     * This includes scripts < 5 milliseconds and other timings not attributed
     * by Long Animation Frame (including when a frame is < 50ms and so has no
     * Long Animation Frame).
     * When no Long Animation Frames are present this will be undefined, rather
     * than everything being unattributed to make it clearer when it's expected
     * to be small.
     */
    totalUnattributedDuration?: number;
}
/**
 * An INP-specific version of the Metric object with attribution.
 */
export interface INPMetricWithAttribution extends INPMetric {
    attribution: INPAttribution;
}
//# sourceMappingURL=inp.d.ts.map