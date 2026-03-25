import type { Breadcrumb, ErrorEvent, ReplayRecordingData, ReplayRecordingMode, Span } from '@sentry/core';
import type { SKIPPED, THROTTLED } from '../util/throttle';
import type { AllPerformanceEntry, AllPerformanceEntryData, ReplayPerformanceEntry } from './performance';
import type { ReplayFrameEvent } from './replayFrame';
import type { ReplayNetworkRequestOrResponse } from './request';
import type { CanvasManagerInterface, CanvasManagerOptions, ReplayEventWithTime, RrwebRecordOptions } from './rrweb';
export type RecordingEvent = ReplayFrameEvent | ReplayEventWithTime;
export type RecordingOptions = RrwebRecordOptions;
export interface SendReplayData {
    recordingData: ReplayRecordingData;
    replayId: string;
    segmentId: number;
    eventContext: PopEventContext;
    timestamp: number;
    session: Session;
    onError?: (err: unknown) => void;
}
export interface Timeouts {
    sessionIdlePause: number;
    sessionIdleExpire: number;
}
/**
 * The request payload to worker
 */
export interface WorkerRequest {
    id: number;
    method: 'clear' | 'addEvent' | 'finish';
    arg?: string;
}
/**
 * The response from the worker
 */
export interface WorkerResponse {
    id: number;
    method: string;
    success: boolean;
    response: unknown;
}
export type AddEventResult = void;
export interface BeforeAddRecordingEvent {
    (event: ReplayFrameEvent): ReplayFrameEvent | null | undefined;
}
export interface ReplayNetworkOptions {
    /**
     * Capture request/response details for XHR/Fetch requests that match the given URLs.
     * The URLs can be strings or regular expressions.
     * When provided a string, we will match any URL that contains the given string.
     * You can use a Regex to handle exact matches or more complex matching.
     *
     * Only URLs matching these patterns will have bodies & additional headers captured.
     */
    networkDetailAllowUrls: (string | RegExp)[];
    /**
     * Deny request/response details for XHR/Fetch requests that match the given URLs.
     * The URLs can be strings or regular expressions.
     * When provided a string, we will deny any URL that contains the given string.
     * You can use a Regex to handle exact matches or more complex matching.
     * URLs matching these patterns will not have bodies & additional headers captured.
     */
    networkDetailDenyUrls: (string | RegExp)[];
    /**
     * If request & response bodies should be captured.
     * Only applies to URLs matched by `networkDetailAllowUrls` and not matched by `networkDetailDenyUrls`.
     * Defaults to true.
     */
    networkCaptureBodies: boolean;
    /**
     * Capture the following request headers, in addition to the default ones.
     * Only applies to URLs matched by `networkDetailAllowUrls` and not matched by `networkDetailDenyUrls`.
     * Any headers defined here will be captured in addition to the default headers.
     */
    networkRequestHeaders: string[];
    /**
     * Capture the following response headers, in addition to the default ones.
     * Only applies to URLs matched by `networkDetailAllowUrls` and not matched by `networkDetailDenyUrls`.
     * Any headers defined here will be captured in addition to the default headers.
     */
    networkResponseHeaders: string[];
}
export type ReplayWorkerURL = string | URL;
export interface ReplayPluginOptions extends ReplayNetworkOptions {
    /**
     * The sample rate for session-long replays. 1.0 will record all sessions and
     * 0 will record none.
     */
    sessionSampleRate: number;
    /**
     * The sample rate for sessions that has had an error occur. This is
     * independent of `sessionSampleRate`.
     */
    errorSampleRate: number;
    /**
     * If false, will create a new session per pageload. Otherwise, saves session
     * to Session Storage.
     */
    stickySession: boolean;
    /**
     * The amount of time to wait before sending a replay
     */
    flushMinDelay: number;
    /**
     * The max amount of time to wait before sending a replay
     */
    flushMaxDelay: number;
    /**
     * Attempt to use compression when web workers are available
     *
     * (default is true)
     */
    useCompression: boolean;
    /**
     * If defined, use this worker URL instead of the default included one for compression.
     * This will only be used if `useCompression` is not false.
     */
    workerUrl?: ReplayWorkerURL;
    /**
     * Block all media (e.g. images, svg, video) in recordings.
     */
    blockAllMedia: boolean;
    /**
     * Mask all inputs in recordings
     */
    maskAllInputs: boolean;
    /**
     * Mask all text in recordings
     */
    maskAllText: boolean;
    /**
     * A high number of DOM mutations (in a single event loop) can cause
     * performance regressions in end-users' browsers. This setting will create
     * a breadcrumb in the recording when the limit has been reached.
     */
    mutationBreadcrumbLimit: number;
    /**
     * A high number of DOM mutations (in a single event loop) can cause
     * performance regressions in end-users' browsers. This setting will cause
     * recording to stop when the limit has been reached.
     */
    mutationLimit: number;
    /**
     * The max. time in ms to wait for a slow click to finish.
     * After this amount of time we stop waiting for actions after a click happened.
     * Set this to 0 to disable slow click capture.
     *
     * Default: 7000ms
     */
    slowClickTimeout: number;
    /**
     * Ignore clicks on elements matching the given selectors for slow click detection.
     */
    slowClickIgnoreSelectors: string[];
    /**
     * The min. duration (in ms) a replay has to have before it is sent to Sentry.
     * Whenever attempting to flush a session that is shorter than this, it will not actually send it to Sentry.
     * Note that this is capped at max. 50s, so we don't unintentionally drop buffered replays that are longer than 60s
     *
     * Warning: Setting this to a higher value can result in unintended drops of onError-sampled replays.
     *
     */
    minReplayDuration: number;
    /**
     * The max. duration (in ms) a replay session may be.
     * This is capped at max. 60min.
     */
    maxReplayDuration: number;
    /**
     * Callback before adding a custom recording event
     *
     * Events added by the underlying DOM recording library can *not* be modified,
     * only custom recording events from the Replay integration will trigger the
     * callback listeners. This can be used to scrub certain fields in an event (e.g. URLs from navigation events).
     *
     * Returning a `null` will drop the event completely. Note, dropping a recording
     * event is not the same as dropping the replay, the replay will still exist and
     * continue to function.
     */
    beforeAddRecordingEvent?: BeforeAddRecordingEvent;
    /**
     * An optional callback to be called before we decide to sample based on an error.
     * If specified, this callback will receive an error that was captured by Sentry.
     * Return `true` to continue sampling for this error, or `false` to ignore this error for replay sampling.
     * Note that returning `true` means that the `replaysOnErrorSampleRate` will be checked,
     * not that it will definitely be sampled.
     * Use this to filter out groups of errors that should def. not be sampled.
     */
    beforeErrorSampling?: (event: ErrorEvent) => boolean;
    /**
     * Callback when an internal SDK error occurs. This can be used to debug SDK
     * issues.
     */
    onError?: (err: unknown) => void;
    /**
     * Patch the global Request() interface to store original request bodies.
     * This allows Replay to capture the original body from Request objects passed to fetch().
     *
     * When enabled, creates a copy of the original body before it's converted to a ReadableStream.
     * This is useful for capturing request bodies in network breadcrumbs.
     *
     * Note: This modifies the global Request constructor.
     *
     * @default false
     */
    attachRawBodyFromRequest?: boolean;
    /**
     * _experiments allows users to enable experimental or internal features.
     * We don't consider such features as part of the public API and hence we don't guarantee semver for them.
     * Experimental features can be added, changed or removed at any time.
     *
     * Default: undefined
     */
    _experiments: Partial<{
        captureExceptions: boolean;
        traceInternals: boolean;
        continuousCheckout: number;
        /**
         * Before enabling, please read the security considerations:
         * https://github.com/rrweb-io/rrweb/blob/master/docs/recipes/cross-origin-iframes.md#considerations
         */
        recordCrossOriginIframes: boolean;
        /**
         * Completely ignore mutations matching the given selectors.
         * This can be used if a specific type of mutation is causing (e.g. performance) problems.
         * NOTE: This can be dangerous to use, as mutations are applied as incremental patches.
         * Make sure to verify that the captured replays still work when using this option.
         */
        ignoreMutations: string[];
    }>;
}
/**
 * The options that can be set in the plugin options. `sessionSampleRate` and `errorSampleRate` are added
 * in the root level of the SDK options as `replaysSessionSampleRate` and `replaysOnErrorSampleRate`.
 */
export type InitialReplayPluginOptions = Omit<ReplayPluginOptions, 'sessionSampleRate' | 'errorSampleRate'>;
type OptionalReplayPluginOptions = Partial<InitialReplayPluginOptions> & {
    /**
     * Mask element attributes that are contained in list
     */
    maskAttributes?: string[];
};
/**
 * Session options that are configurable by the integration configuration
 */
export interface SessionOptions extends Pick<ReplayPluginOptions, 'sessionSampleRate' | 'stickySession'> {
    /**
     * Should buffer recordings to be saved later either by error sampling, or by
     * manually calling `flush()`. This is only a factor if not sampled for a
     * session-based replay.
     */
    allowBuffering: boolean;
}
export interface ReplayIntegrationPrivacyOptions {
    /**
     * Mask text content for elements that match the CSS selectors in the list.
     */
    mask?: string[];
    /**
     * Unmask text content for elements that match the CSS selectors in the list.
     */
    unmask?: string[];
    /**
     * Block elements that match the CSS selectors in the list. Blocking replaces
     * the element with an empty placeholder with the same dimensions.
     */
    block?: string[];
    /**
     * Unblock elements that match the CSS selectors in the list. This is useful when using `blockAllMedia`.
     */
    unblock?: string[];
    /**
     * Ignore input events for elements that match the CSS selectors in the list.
     */
    ignore?: string[];
    /**
     * A callback function to customize how your text is masked.
     */
    maskFn?: (s: string) => string;
}
export interface ReplayConfiguration extends ReplayIntegrationPrivacyOptions, OptionalReplayPluginOptions, Pick<RecordingOptions, 'maskAllText' | 'maskAllInputs'> {
}
interface CommonEventContext {
    /**
     * The initial URL of the session
     */
    initialUrl: string;
    /**
     * The initial starting timestamp in ms of the session.
     */
    initialTimestamp: number;
    /**
     * Ordered list of URLs that have been visited during a replay segment
     */
    urls: string[];
}
export interface PopEventContext extends CommonEventContext {
    /**
     * List of Sentry error ids that have occurred during a replay segment
     */
    errorIds: Array<string>;
    /**
     * List of Sentry trace ids that have occurred during a replay segment
     */
    traceIds: Array<string>;
}
/**
 * Additional context that will be sent w/ `replay_event`
 */
export interface InternalEventContext extends CommonEventContext {
    /**
     * Set of Sentry error ids that have occurred during a replay segment
     */
    errorIds: Set<string>;
    /**
     * Set of Sentry trace ids that have occurred during a replay segment
     */
    traceIds: Set<string>;
}
export type Sampled = false | 'session' | 'buffer';
export interface Session {
    id: string;
    /**
     * Start time of current session (in ms)
     */
    started: number;
    /**
     * Last known activity of the session (in ms)
     */
    lastActivity: number;
    /**
     * Segment ID for replay events
     */
    segmentId: number;
    /**
     * The ID of the previous session.
     * If this is empty, there was no previous session.
     */
    previousSessionId?: string;
    /**
     * Is the session sampled? `false` if not sampled, otherwise, `session` or `buffer`
     */
    sampled: Sampled;
    /**
     * Session is dirty when its id has been linked to an event (e.g. error event).
     * This is helpful when a session is mistakenly stuck in "buffer" mode (e.g. network issues preventing it from being converted to "session" mode).
     * The dirty flag is used to prevent updating the session start time to the earliest event in the buffer so that it can be refreshed if it's been expired.
     */
    dirty?: boolean;
}
export type EventBufferType = 'sync' | 'worker';
export interface EventBuffer {
    /**
     * If any events have been added to the buffer.
     */
    readonly hasEvents: boolean;
    /**
     * The buffer type
     */
    readonly type: EventBufferType;
    /**
     * If the event buffer contains a checkout event.
     */
    hasCheckout: boolean;
    /**
     * If the event buffer needs to wait for a checkout event before it
     * starts buffering events.
     */
    waitForCheckout: boolean;
    /**
     * Destroy the event buffer.
     */
    destroy(): void;
    /**
     * Clear the event buffer.
     */
    clear(): void;
    /**
     * Add an event to the event buffer.
     *
     * Returns a promise that resolves if the event was successfully added, else rejects.
     */
    addEvent(event: RecordingEvent): Promise<AddEventResult>;
    /**
     * Clears and returns the contents of the buffer.
     */
    finish(): Promise<ReplayRecordingData>;
    /**
     * Get the earliest timestamp in ms of any event currently in the buffer.
     */
    getEarliestTimestamp(): number | null;
}
export type AddUpdateCallback = () => boolean | void;
export interface SendBufferedReplayOptions {
    continueRecording?: boolean;
}
export interface ReplayClickDetector {
    addListeners(): void;
    removeListeners(): void;
    /** Handle a click breadcrumb. */
    handleClick(breadcrumb: Breadcrumb, node: HTMLElement): void;
    /** Register a mutation that happened at a given time. */
    registerMutation(timestamp?: number): void;
    /** Register a scroll that happened at a given time. */
    registerScroll(timestamp?: number): void;
    /** Register that a click on an element happened. */
    registerClick(element: HTMLElement): void;
}
export interface ReplayContainer {
    eventBuffer: EventBuffer | null;
    clickDetector: ReplayClickDetector | undefined;
    /**
     * List of PerformanceEntry from PerformanceObservers.
     */
    performanceEntries: AllPerformanceEntry[];
    /**
     * List of already processed performance data, ready to be added to replay.
     */
    replayPerformanceEntries: ReplayPerformanceEntry<AllPerformanceEntryData>[];
    session: Session | undefined;
    recordingMode: ReplayRecordingMode;
    timeouts: Timeouts;
    lastActiveSpan?: Span;
    throttledAddEvent: (event: RecordingEvent, isCheckout?: boolean) => typeof THROTTLED | typeof SKIPPED | Promise<AddEventResult | null>;
    isEnabled(): boolean;
    isPaused(): boolean;
    isRecordingCanvas(): boolean;
    getContext(): InternalEventContext;
    initializeSampling(): void;
    start(): void;
    stop(options?: {
        reason?: string;
        forceflush?: boolean;
    }): Promise<void>;
    pause(): void;
    resume(): void;
    startRecording(): void;
    stopRecording(): boolean;
    sendBufferedReplayOrFlush(options?: SendBufferedReplayOptions): Promise<void>;
    conditionalFlush(): Promise<void>;
    flush(): Promise<void>;
    flushImmediate(): Promise<void>;
    cancelFlush(): void;
    triggerUserActivity(): void;
    updateUserActivity(): void;
    addUpdate(cb: AddUpdateCallback): void;
    getOptions(): ReplayPluginOptions;
    getSessionId(): string | undefined;
    checkAndHandleExpiredSession(): boolean | void;
    setInitialState(): void;
    getCurrentRoute(): string | undefined;
    handleException(err: unknown): void;
}
export type ReplayNetworkRequestData = {
    startTimestamp: number;
    endTimestamp: number;
    url: string;
    method?: string;
    statusCode: number;
    request?: ReplayNetworkRequestOrResponse;
    response?: ReplayNetworkRequestOrResponse;
};
export interface SlowClickConfig {
    threshold: number;
    timeout: number;
    scrollTimeout: number;
    ignoreSelector: string;
}
export interface ReplayCanvasIntegrationOptions {
    enableManualSnapshot?: boolean;
    recordCanvas: true;
    getCanvasManager: (options: CanvasManagerOptions) => CanvasManagerInterface;
    sampling: {
        canvas: number;
    };
    dataURLOptions: {
        type: string;
        quality: number;
    };
}
export {};
//# sourceMappingURL=replay.d.ts.map