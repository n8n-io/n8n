import { Client, Integration, ReplayRecordingMode } from '@sentry/core';
import { ReplayConfiguration, SendBufferedReplayOptions } from './types';
/**
 * Instruments the global Request constructor to store the original body.
 * This allows us to retrieve the original body value later, since Request
 * converts string bodies to ReadableStreams.
 */
export declare function _INTERNAL_instrumentRequestInterface(): void;
/**
 * Sentry integration for [Session Replay](https://sentry.io/for/session-replay/).
 *
 * See the [Replay documentation](https://docs.sentry.io/platforms/javascript/guides/session-replay/) for more information.
 *
 * @example
 *
 * ```
 * Sentry.init({
 *   dsn: '__DSN__',
 *   integrations: [Sentry.replayIntegration()],
 * });
 * ```
 */
export declare const replayIntegration: (options?: ReplayConfiguration) => Replay;
/**
 * Replay integration
 */
export declare class Replay implements Integration {
    /**
     * @inheritDoc
     */
    name: string;
    /**
     * Options to pass to `rrweb.record()`
     */
    private readonly _recordingOptions;
    /**
     * Initial options passed to the replay integration, merged with default values.
     * Note: `sessionSampleRate` and `errorSampleRate` are not required here, as they
     * can only be finally set when setupOnce() is called.
     *
     * @private
     */
    private readonly _initialOptions;
    private _replay?;
    constructor({ flushMinDelay, flushMaxDelay, minReplayDuration, maxReplayDuration, stickySession, useCompression, workerUrl, _experiments, maskAllText, maskAllInputs, blockAllMedia, mutationBreadcrumbLimit, mutationLimit, slowClickTimeout, slowClickIgnoreSelectors, networkDetailAllowUrls, networkDetailDenyUrls, networkCaptureBodies, networkRequestHeaders, networkResponseHeaders, mask, maskAttributes, unmask, block, unblock, ignore, maskFn, beforeAddRecordingEvent, beforeErrorSampling, onError, attachRawBodyFromRequest, }?: ReplayConfiguration);
    /*If replay has already been initialized
    Update _isInitialized */
    protected _isInitialized: boolean;
    /**
     * Setup and initialize replay container
     */
    afterAllSetup(client: Client): void;
    /**
     * Start a replay regardless of sampling rate. Calling this will always
     * create a new session. Will log a message if replay is already in progress.
     *
     * Creates or loads a session, attaches listeners to varying events (DOM,
     * PerformanceObserver, Recording, Sentry SDK, etc)
     */
    start(): void;
    /**
     * Start replay buffering. Buffers until `flush()` is called or, if
     * `replaysOnErrorSampleRate` > 0, until an error occurs.
     */
    startBuffering(): void;
    /**
     * Currently, this needs to be manually called (e.g. for tests). Sentry SDK
     * does not support a teardown
     */
    stop(): Promise<void>;
    /**
     * If not in "session" recording mode, flush event buffer which will create a new replay.
     * If replay is not enabled, a new session replay is started.
     * Unless `continueRecording` is false, the replay will continue to record and
     * behave as a "session"-based replay.
     *
     * Otherwise, queue up a flush.
     */
    flush(options?: SendBufferedReplayOptions): Promise<void>;
    /**
     * Get the current session ID.
     *
     * @param onlyIfSampled - If true, will only return the session ID if the session is sampled.
     *
     */
    getReplayId(onlyIfSampled?: boolean): string | undefined;
    /**
     * Get the current recording mode. This can be either `session` or `buffer`.
     *
     * `session`: Recording the whole session, sending it continuously
     * `buffer`: Always keeping the last 60s of recording, requires:
     *   - having replaysOnErrorSampleRate > 0 to capture replay when an error occurs
     *   - or calling `flush()` to send the replay
     */
    getRecordingMode(): ReplayRecordingMode | undefined;
    /**
     * Initializes replay.
     */
    protected _initialize(client: Client): void;
    /** Setup the integration. */
    private _setup;
    /** Get canvas options from ReplayCanvas integration, if it is also added. */
    private _maybeLoadFromReplayCanvasIntegration;
}
//# sourceMappingURL=integration.d.ts.map
