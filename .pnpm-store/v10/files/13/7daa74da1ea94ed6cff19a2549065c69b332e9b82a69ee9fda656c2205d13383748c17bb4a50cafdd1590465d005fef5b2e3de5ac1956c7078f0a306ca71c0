import { Client, ContinuousProfiler, Span } from '@sentry/core';
/**
 * UIProfiler (Profiling V2):
 * Supports two lifecycle modes:
 *  - 'manual': controlled explicitly via start()/stop()
 *  - 'trace': automatically runs while there are active sampled root spans
 *
 * Profiles are emitted as standalone `profile_chunk` envelopes either when:
 * - there are no more sampled root spans, or
 * - the 60s chunk timer elapses while profiling is running.
 */
export declare class UIProfiler implements ContinuousProfiler<Client> {
    private _client;
    private _profiler;
    private _chunkTimer;
    private _profilerId;
    private _isRunning;
    private _sessionSampled;
    private _lifecycleMode;
    private _activeRootSpanIds;
    private _rootSpanTimeouts;
    constructor();
    /**
     * Initialize the profiler with client, session sampling and lifecycle mode.
     */
    initialize(client: Client): void;
    /** Starts UI profiling (only effective in 'manual' mode and when sampled). */
    start(): void;
    /** Stops UI profiling (only effective in 'manual' mode). */
    stop(): void;
    /** Handle an already-active root span at integration setup time (used only in trace mode). */
    notifyRootSpanActive(rootSpan: Span): void;
    /**
     * Begin profiling if not already running.
     */
    private _beginProfiling;
    /** End profiling session; final chunk will be collected and sent. */
    private _endProfiling;
    /** Trace-mode: attach spanStart/spanEnd listeners. */
    private _setupTraceLifecycleListeners;
    /**
     * Resets profiling information from scope and resets running state (used on failure)
     */
    private _resetProfilerInfo;
    /**
     * Clear and reset all per-root-span timeouts.
     */
    private _clearAllRootSpanTimeouts;
    /** Keep track of root spans and schedule safeguard timeout (trace mode). */
    private _registerTraceRootSpan;
    /**
     * Start a profiler instance if needed.
     */
    private _startProfilerInstance;
    /**
     * Schedule the next 60s chunk while running.
     * Each tick collects a chunk and restarts the profiler.
     * A chunk should be closed when there are no active root spans anymore OR when the maximum chunk interval is reached.
     */
    private _startPeriodicChunking;
    /**
     * Handle timeout for a specific root span ID to avoid indefinitely running profiler if `spanEnd` never fires.
     * If this was the last active root span, collect the current chunk and stop profiling.
     */
    private _onRootSpanTimeout;
    /**
     * Stop current profiler instance, convert profile to chunk & send.
     */
    private _collectCurrentChunk;
    /**
     * Send a profile chunk as a standalone envelope.
     */
    private _sendProfileChunk;
}
//# sourceMappingURL=UIProfiler.d.ts.map
