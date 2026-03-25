import type { ReplayRecordingMode, Span } from '@sentry/core';
import { ClickDetector } from './coreHandlers/handleClick';
import type { AddEventResult, AddUpdateCallback, AllPerformanceEntry, AllPerformanceEntryData, EventBuffer, InternalEventContext, RecordingEvent, RecordingOptions, ReplayContainer as ReplayContainerInterface, ReplayPerformanceEntry, ReplayPluginOptions, SendBufferedReplayOptions, Session, Timeouts } from './types';
import type { SKIPPED } from './util/throttle';
import { THROTTLED } from './util/throttle';
/**
 * The main replay container class, which holds all the state and methods for recording and sending replays.
 */
export declare class ReplayContainer implements ReplayContainerInterface {
    eventBuffer: EventBuffer | null;
    performanceEntries: AllPerformanceEntry[];
    replayPerformanceEntries: ReplayPerformanceEntry<AllPerformanceEntryData>[];
    session: Session | undefined;
    clickDetector: ClickDetector | undefined;
    /**
     * Recording can happen in one of two modes:
     *   - session: Record the whole session, sending it continuously
     *   - buffer: Always keep the last 60s of recording, requires:
     *     - having replaysOnErrorSampleRate > 0 to capture replay when an error occurs
     *     - or calling `flush()` to send the replay
     */
    recordingMode: ReplayRecordingMode;
    /**
     * The current or last active span.
     * This is only available when performance is enabled.
     */
    lastActiveSpan?: Span;
    /**
     * These are here so we can overwrite them in tests etc.
     * @hidden
     */
    readonly timeouts: Timeouts;
    /** The replay has to be manually started, because no sample rate (neither session or error) was provided. */
    private _requiresManualStart;
    private _throttledAddEvent;
    /**
     * Options to pass to `rrweb.record()`
     */
    private readonly _recordingOptions;
    private readonly _options;
    private _performanceCleanupCallback?;
    private _debouncedFlush;
    private _flushLock;
    /**
     * Timestamp of the last user activity. This lives across sessions.
     */
    private _lastActivity;
    /**
     * Is the integration currently active?
     */
    private _isEnabled;
    /**
     * Paused is a state where:
     * - DOM Recording is not listening at all
     * - Nothing will be added to event buffer (e.g. core SDK events)
     */
    private _isPaused;
    /**
     * Have we attached listeners to the core SDK?
     * Note we have to track this as there is no way to remove instrumentation handlers.
     */
    private _hasInitializedCoreListeners;
    /**
     * Function to stop recording
     */
    private _stopRecording;
    private _context;
    /**
     * Internal use for canvas recording options
     */
    private _canvas;
    /**
     * Handle when visibility of the page content changes. Opening a new tab will
     * cause the state to change to hidden because of content of current page will
     * be hidden. Likewise, moving a different window to cover the contents of the
     * page will also trigger a change to a hidden state.
     */
    private _handleVisibilityChange;
    /**
     * Handle when page is blurred
     */
    private _handleWindowBlur;
    /**
     * Handle when page is focused
     */
    private _handleWindowFocus;
    /** Ensure page remains active when a key is pressed. */
    private _handleKeyboardEvent;
    constructor({ options, recordingOptions, }: {
        options: ReplayPluginOptions;
        recordingOptions: RecordingOptions;
    });
    /** Get the event context. */
    getContext(): InternalEventContext;
    /** If recording is currently enabled. */
    isEnabled(): boolean;
    /** If recording is currently paused. */
    isPaused(): boolean;
    /**
     * Determine if canvas recording is enabled
     */
    isRecordingCanvas(): boolean;
    /** Get the replay integration options. */
    getOptions(): ReplayPluginOptions;
    /** A wrapper to conditionally capture exceptions. */
    handleException(error: unknown): void;
    /**
     * Initializes the plugin based on sampling configuration. Should not be
     * called outside of constructor.
     */
    initializeSampling(previousSessionId?: string): void;
    /**
     * Start a replay regardless of sampling rate. Calling this will always
     * create a new session. Will log a message if replay is already in progress.
     *
     * Creates or loads a session, attaches listeners to varying events (DOM,
     * _performanceObserver, Recording, Sentry SDK, etc)
     */
    start(): void;
    /**
     * Start replay buffering. Buffers until `flush()` is called or, if
     * `replaysOnErrorSampleRate` > 0, an error occurs.
     */
    startBuffering(): void;
    /**
     * Start recording.
     *
     * Note that this will cause a new DOM checkout
     */
    startRecording(): void;
    /**
     * Stops the recording, if it was running.
     *
     * Returns true if it was previously stopped, or is now stopped,
     * otherwise false.
     */
    stopRecording(): boolean;
    /**
     * Currently, this needs to be manually called (e.g. for tests). Sentry SDK
     * does not support a teardown
     */
    stop({ forceFlush, reason }?: {
        forceFlush?: boolean;
        reason?: string;
    }): Promise<void>;
    /**
     * Pause some replay functionality. See comments for `_isPaused`.
     * This differs from stop as this only stops DOM recording, it is
     * not as thorough of a shutdown as `stop()`.
     */
    pause(): void;
    /**
     * Resumes recording, see notes for `pause().
     *
     * Note that calling `startRecording()` here will cause a
     * new DOM checkout.`
     */
    resume(): void;
    /**
     * If not in "session" recording mode, flush event buffer which will create a new replay.
     * Unless `continueRecording` is false, the replay will continue to record and
     * behave as a "session"-based replay.
     *
     * Otherwise, queue up a flush.
     */
    sendBufferedReplayOrFlush({ continueRecording }?: SendBufferedReplayOptions): Promise<void>;
    /**
     * We want to batch uploads of replay events. Save events only if
     * `<flushMinDelay>` milliseconds have elapsed since the last event
     * *OR* if `<flushMaxDelay>` milliseconds have elapsed.
     *
     * Accepts a callback to perform side-effects and returns true to stop batch
     * processing and hand back control to caller.
     */
    addUpdate(cb: AddUpdateCallback): void;
    /**
     * Updates the user activity timestamp and resumes recording. This should be
     * called in an event handler for a user action that we consider as the user
     * being "active" (e.g. a mouse click).
     */
    triggerUserActivity(): void;
    /**
     * Updates the user activity timestamp *without* resuming
     * recording. Some user events (e.g. keydown) can be create
     * low-value replays that only contain the keypress as a
     * breadcrumb. Instead this would require other events to
     * create a new replay after a session has expired.
     */
    updateUserActivity(): void;
    /**
     * Only flush if `this.recordingMode === 'session'`
     */
    conditionalFlush(): Promise<void>;
    /**
     * Flush using debounce flush
     */
    flush(): Promise<void>;
    /**
     * Always flush via `_debouncedFlush` so that we do not have flushes triggered
     * from calling both `flush` and `_debouncedFlush`. Otherwise, there could be
     * cases of multiple flushes happening closely together.
     */
    flushImmediate(): Promise<void>;
    /**
     * Cancels queued up flushes.
     */
    cancelFlush(): void;
    /** Get the current session (=replay) ID
     *
     * @param onlyIfSampled - If true, will only return the session ID if the session is sampled.
     */
    getSessionId(onlyIfSampled?: boolean): string | undefined;
    /**
     * Checks if recording should be stopped due to user inactivity. Otherwise
     * check if session is expired and create a new session if so. Triggers a new
     * full snapshot on new session.
     *
     * Returns true if session is not expired, false otherwise.
     * @hidden
     */
    checkAndHandleExpiredSession(): boolean | void;
    /**
     * Capture some initial state that can change throughout the lifespan of the
     * replay. This is required because otherwise they would be captured at the
     * first flush.
     */
    setInitialState(): void;
    /**
     * Add a breadcrumb event, that may be throttled.
     * If it was throttled, we add a custom breadcrumb to indicate that.
     */
    throttledAddEvent(event: RecordingEvent, isCheckout?: boolean): typeof THROTTLED | typeof SKIPPED | Promise<AddEventResult | null>;
    /**
     * This will get the parametrized route name of the current page.
     * This is only available if performance is enabled, and if an instrumented router is used.
     */
    getCurrentRoute(): string | undefined;
    /**
     * Initialize and start all listeners to varying events (DOM,
     * Performance Observer, Recording, Sentry SDK, etc)
     */
    private _initializeRecording;
    /**
     * Loads (or refreshes) the current session.
     */
    private _initializeSessionForSampling;
    /**
     * Checks and potentially refreshes the current session.
     * Returns false if session is not recorded.
     */
    private _checkSession;
    /**
     * Refresh a session with a new one.
     * This stops the current session (without forcing a flush, as that would never work since we are expired),
     * and then does a new sampling based on the refreshed session.
     */
    private _refreshSession;
    /**
     * Adds listeners to record events for the replay
     */
    private _addListeners;
    /**
     * Cleans up listeners that were created in `_addListeners`
     */
    private _removeListeners;
    /**
     * Tasks to run when we consider a page to be hidden (via blurring and/or visibility)
     */
    private _doChangeToBackgroundTasks;
    /**
     * Tasks to run when we consider a page to be visible (via focus and/or visibility)
     */
    private _doChangeToForegroundTasks;
    /**
     * Update user activity (across session lifespans)
     */
    private _updateUserActivity;
    /**
     * Updates the session's last activity timestamp
     */
    private _updateSessionActivity;
    /**
     * Helper to create (and buffer) a replay breadcrumb from a core SDK breadcrumb
     */
    private _createCustomBreadcrumb;
    /**
     * Observed performance events are added to `this.performanceEntries`. These
     * are included in the replay event before it is finished and sent to Sentry.
     */
    private _addPerformanceEntries;
    /**
     * Clear _context
     */
    private _clearContext;
    /** Update the initial timestamp based on the buffer content. */
    private _updateInitialTimestampFromEventBuffer;
    /**
     * Return and clear _context
     */
    private _popEventContext;
    /**
     * Flushes replay event buffer to Sentry.
     *
     * Performance events are only added right before flushing - this is
     * due to the buffered performance observer events.
     *
     * Should never be called directly, only by `flush`
     */
    private _runFlush;
    /**
     * Flush recording data to Sentry. Creates a lock so that only a single flush
     * can be active at a time. Do not call this directly.
     */
    private _flush;
    /** Save the session, if it is sticky */
    private _maybeSaveSession;
    /** Handler for rrweb.record.onMutation */
    private _onMutationHandler;
}
//# sourceMappingURL=replay.d.ts.map