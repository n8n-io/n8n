Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const utils = require('./utils.js');

const CHUNK_INTERVAL_MS = 60000; // 1 minute
// Maximum length for trace lifecycle profiling per root span (e.g. if spanEnd never fires)
const MAX_ROOT_SPAN_PROFILE_MS = 300000; // 5 minutes max per root span in trace mode

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
class UIProfiler  {

  // Manual + Trace
   // one per Profiler session
   // current profiler instance active flag
   // sampling decision for entire session

  // Trace-only

   constructor() {
    this._client = undefined;
    this._profiler = undefined;
    this._chunkTimer = undefined;

    this._profilerId = undefined;
    this._isRunning = false;
    this._sessionSampled = false;
    this._lifecycleMode = undefined;

    this._activeRootSpanIds = new Set();
    this._rootSpanTimeouts = new Map();
  }

  /**
   * Initialize the profiler with client, session sampling and lifecycle mode.
   */
   initialize(client) {
    const lifecycleMode = (client.getOptions() ).profileLifecycle;
    const sessionSampled = utils.shouldProfileSession(client.getOptions());

    debugBuild.DEBUG_BUILD && core.debug.log(`[Profiling] Initializing profiler (lifecycle='${lifecycleMode}').`);

    if (!sessionSampled) {
      debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Session not sampled. Skipping lifecycle profiler initialization.');
    }

    // One Profiler ID per profiling session (user session)
    this._profilerId = core.uuid4();
    this._client = client;
    this._sessionSampled = sessionSampled;
    this._lifecycleMode = lifecycleMode;

    if (lifecycleMode === 'trace') {
      this._setupTraceLifecycleListeners(client);
    }
  }

  /** Starts UI profiling (only effective in 'manual' mode and when sampled). */
   start() {
    if (this._lifecycleMode === 'trace') {
      debugBuild.DEBUG_BUILD &&
        core.debug.warn(
          '[Profiling] `profileLifecycle` is set to "trace". Calls to `uiProfiler.start()` are ignored in trace mode.',
        );
      return;
    }

    if (this._isRunning) {
      debugBuild.DEBUG_BUILD && core.debug.warn('[Profiling] Profile session is already running, `uiProfiler.start()` is a no-op.');
      return;
    }

    if (!this._sessionSampled) {
      debugBuild.DEBUG_BUILD && core.debug.warn('[Profiling] Session is not sampled, `uiProfiler.start()` is a no-op.');
      return;
    }

    this._beginProfiling();
  }

  /** Stops UI profiling (only effective in 'manual' mode). */
   stop() {
    if (this._lifecycleMode === 'trace') {
      debugBuild.DEBUG_BUILD &&
        core.debug.warn(
          '[Profiling] `profileLifecycle` is set to "trace". Calls to `uiProfiler.stop()` are ignored in trace mode.',
        );
      return;
    }

    if (!this._isRunning) {
      debugBuild.DEBUG_BUILD && core.debug.warn('[Profiling] Profiler is not running, `uiProfiler.stop()` is a no-op.');
      return;
    }

    this._endProfiling();
  }

  /** Handle an already-active root span at integration setup time (used only in trace mode). */
   notifyRootSpanActive(rootSpan) {
    if (this._lifecycleMode !== 'trace' || !this._sessionSampled) {
      return;
    }

    const spanId = rootSpan.spanContext().spanId;
    if (!spanId || this._activeRootSpanIds.has(spanId)) {
      return;
    }

    this._registerTraceRootSpan(spanId);

    const rootSpanCount = this._activeRootSpanIds.size;

    if (rootSpanCount === 1) {
      debugBuild.DEBUG_BUILD &&
        core.debug.log('[Profiling] Detected already active root span during setup. Active root spans now:', rootSpanCount);

      this._beginProfiling();
    }
  }

  /**
   * Begin profiling if not already running.
   */
   _beginProfiling() {
    if (this._isRunning) {
      return;
    }
    this._isRunning = true;

    debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Started profiling with profiler ID:', this._profilerId);

    // Expose profiler_id to match root spans with profiles
    core.getGlobalScope().setContext('profile', { profiler_id: this._profilerId });

    this._startProfilerInstance();

    if (!this._profiler) {
      debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Failed to start JS Profiler; stopping.');
      this._resetProfilerInfo();
      return;
    }

    this._startPeriodicChunking();
  }

  /** End profiling session; final chunk will be collected and sent. */
   _endProfiling() {
    if (!this._isRunning) {
      return;
    }
    this._isRunning = false;

    if (this._chunkTimer) {
      clearTimeout(this._chunkTimer);
      this._chunkTimer = undefined;
    }

    this._clearAllRootSpanTimeouts();

    // Collect whatever was currently recording
    this._collectCurrentChunk().catch(e => {
      debugBuild.DEBUG_BUILD && core.debug.error('[Profiling] Failed to collect current profile chunk on `stop()`:', e);
    });

    // Manual: Clear profiling context so spans outside start()/stop() aren't marked as profiled
    // Trace: Profile context is kept for the whole session duration
    if (this._lifecycleMode === 'manual') {
      core.getGlobalScope().setContext('profile', {});
    }
  }

  /** Trace-mode: attach spanStart/spanEnd listeners. */
   _setupTraceLifecycleListeners(client) {
    client.on('spanStart', span => {
      if (!this._sessionSampled) {
        debugBuild.DEBUG_BUILD &&
          core.debug.log('[Profiling] Span not profiled because of negative sampling decision for user session.');
        return;
      }
      if (span !== core.getRootSpan(span)) {
        return; // only care about root spans
      }
      // Only count sampled root spans
      if (!span.isRecording()) {
        debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Discarding profile because root span was not sampled.');
        return;
      }

      const spanId = span.spanContext().spanId;
      if (!spanId || this._activeRootSpanIds.has(spanId)) {
        return;
      }

      this._registerTraceRootSpan(spanId);

      const rootSpanCount = this._activeRootSpanIds.size;
      if (rootSpanCount === 1) {
        debugBuild.DEBUG_BUILD &&
          core.debug.log(
            `[Profiling] Root span ${spanId} started. Profiling active while there are active root spans (count=${rootSpanCount}).`,
          );
        this._beginProfiling();
      }
    });

    client.on('spanEnd', span => {
      if (!this._sessionSampled) {
        return;
      }
      const spanId = span.spanContext().spanId;
      if (!spanId || !this._activeRootSpanIds.has(spanId)) {
        return;
      }
      this._activeRootSpanIds.delete(spanId);
      const rootSpanCount = this._activeRootSpanIds.size;

      debugBuild.DEBUG_BUILD &&
        core.debug.log(
          `[Profiling] Root span with ID ${spanId} ended. Will continue profiling for as long as there are active root spans (currently: ${rootSpanCount}).`,
        );
      if (rootSpanCount === 0) {
        this._collectCurrentChunk().catch(e => {
          debugBuild.DEBUG_BUILD && core.debug.error('[Profiling] Failed to collect current profile chunk on last `spanEnd`:', e);
        });
        this._endProfiling();
      }
    });
  }

  /**
   * Resets profiling information from scope and resets running state (used on failure)
   */
   _resetProfilerInfo() {
    this._isRunning = false;
    core.getGlobalScope().setContext('profile', {});
  }

  /**
   * Clear and reset all per-root-span timeouts.
   */
   _clearAllRootSpanTimeouts() {
    this._rootSpanTimeouts.forEach(timeout => clearTimeout(timeout));
    this._rootSpanTimeouts.clear();
  }

  /** Keep track of root spans and schedule safeguard timeout (trace mode). */
   _registerTraceRootSpan(spanId) {
    this._activeRootSpanIds.add(spanId);
    const timeout = setTimeout(() => this._onRootSpanTimeout(spanId), MAX_ROOT_SPAN_PROFILE_MS);
    this._rootSpanTimeouts.set(spanId, timeout);
  }

  /**
   * Start a profiler instance if needed.
   */
   _startProfilerInstance() {
    if (this._profiler?.stopped === false) {
      return; // already running
    }
    const profiler = utils.startJSSelfProfile();
    if (!profiler) {
      debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Failed to start JS Profiler.');
      return;
    }
    this._profiler = profiler;
  }

  /**
   * Schedule the next 60s chunk while running.
   * Each tick collects a chunk and restarts the profiler.
   * A chunk should be closed when there are no active root spans anymore OR when the maximum chunk interval is reached.
   */
   _startPeriodicChunking() {
    if (!this._isRunning) {
      return;
    }

    this._chunkTimer = setTimeout(() => {
      this._collectCurrentChunk().catch(e => {
        debugBuild.DEBUG_BUILD && core.debug.error('[Profiling] Failed to collect current profile chunk during periodic chunking:', e);
      });

      if (this._isRunning) {
        this._startProfilerInstance();

        if (!this._profiler) {
          // If restart failed, stop scheduling further chunks and reset context.
          this._resetProfilerInfo();
          return;
        }

        this._startPeriodicChunking();
      }
    }, CHUNK_INTERVAL_MS);
  }

  /**
   * Handle timeout for a specific root span ID to avoid indefinitely running profiler if `spanEnd` never fires.
   * If this was the last active root span, collect the current chunk and stop profiling.
   */
   _onRootSpanTimeout(rootSpanId) {
    // If span already ended, ignore
    if (!this._rootSpanTimeouts.has(rootSpanId)) {
      return;
    }
    this._rootSpanTimeouts.delete(rootSpanId);

    if (!this._activeRootSpanIds.has(rootSpanId)) {
      return;
    }

    debugBuild.DEBUG_BUILD &&
      core.debug.log(
        `[Profiling] Reached 5-minute timeout for root span ${rootSpanId}. You likely started a manual root span that never called \`.end()\`.`,
      );

    this._activeRootSpanIds.delete(rootSpanId);

    if (this._activeRootSpanIds.size === 0) {
      this._endProfiling();
    }
  }

  /**
   * Stop current profiler instance, convert profile to chunk & send.
   */
   async _collectCurrentChunk() {
    const prevProfiler = this._profiler;
    this._profiler = undefined;

    if (!prevProfiler) {
      return;
    }

    try {
      const profile = await prevProfiler.stop();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const chunk = utils.createProfileChunkPayload(profile, this._client, this._profilerId);

      // Validate chunk before sending
      const validationReturn = utils.validateProfileChunk(chunk);
      if ('reason' in validationReturn) {
        debugBuild.DEBUG_BUILD &&
          core.debug.log(
            '[Profiling] Discarding invalid profile chunk (this is probably a bug in the SDK):',
            validationReturn.reason,
          );
        return;
      }

      this._sendProfileChunk(chunk);

      debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Collected browser profile chunk.');
    } catch (e) {
      debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Error while stopping JS Profiler for chunk:', e);
    }
  }

  /**
   * Send a profile chunk as a standalone envelope.
   */
   _sendProfileChunk(chunk) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const client = this._client;

    const sdkInfo = core.getSdkMetadataForEnvelopeHeader(client.getSdkMetadata?.());
    const dsn = client.getDsn();
    const tunnel = client.getOptions().tunnel;

    const envelope = core.createEnvelope(
      {
        event_id: core.uuid4(),
        sent_at: new Date().toISOString(),
        ...(sdkInfo && { sdk: sdkInfo }),
        ...(!!tunnel && dsn && { dsn: core.dsnToString(dsn) }),
      },
      [[{ type: 'profile_chunk', platform: 'javascript' }, chunk]],
    );

    client.sendEnvelope(envelope).then(null, reason => {
      debugBuild.DEBUG_BUILD && core.debug.error('Error while sending profile chunk envelope:', reason);
    });
  }
}

exports.UIProfiler = UIProfiler;
//# sourceMappingURL=UIProfiler.js.map
