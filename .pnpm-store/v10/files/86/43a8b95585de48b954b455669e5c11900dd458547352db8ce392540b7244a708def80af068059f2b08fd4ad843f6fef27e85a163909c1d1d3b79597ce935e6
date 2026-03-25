Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const nodeCpuProfiler = require('@sentry-internal/node-cpu-profiler');
const os = require('os');
const process$1 = require('process');
const worker_threads = require('worker_threads');

/**
 * This serves as a build time flag that will be true by default, but false in non-debug builds or if users replace `__SENTRY_DEBUG__` in their generated code.
 *
 * ATTENTION: This constant must never cross package boundaries (i.e. be exported) to guarantee that it can be used for tree shaking.
 */
const DEBUG_BUILD = (typeof __SENTRY_DEBUG__ === 'undefined' || __SENTRY_DEBUG__);

const NODE_VERSION = core.parseSemver(process.versions.node) ;
const NODE_MAJOR = NODE_VERSION.major;

// We require the file because if we import it, it will be included in the bundle.
// I guess tsc does not check file contents when it's imported.
const PROFILER_THREAD_ID_STRING = String(worker_threads.threadId);
const PROFILER_THREAD_NAME = worker_threads.isMainThread ? 'main' : 'worker';
const FORMAT_VERSION = '1';
const CONTINUOUS_FORMAT_VERSION = '2';

// Machine properties (eval only once)
const PLATFORM = os.platform();
const RELEASE = os.release();
const VERSION = os.version();
const TYPE = os.type();
const MODEL = os.machine();
const ARCH = os.arch();

/**
 * Checks if the profile is a raw profile or a profile enriched with thread information.
 * @param {ThreadCpuProfile | RawThreadCpuProfile} profile
 * @returns {boolean}
 */
function isRawThreadCpuProfile(
  profile,
) {
  return !('thread_metadata' in profile);
}

/**
 * Enriches the profile with threadId of the current thread.
 * This is done in node as we seem to not be able to get the info from C native code.
 *
 * @param {ThreadCpuProfile | RawThreadCpuProfile} profile
 * @returns {ThreadCpuProfile}
 */
function enrichWithThreadInformation(
  profile,
) {
  if (!isRawThreadCpuProfile(profile)) {
    return profile;
  }

  return {
    samples: profile.samples,
    frames: profile.frames,
    stacks: profile.stacks,
    thread_metadata: {
      [PROFILER_THREAD_ID_STRING]: {
        name: PROFILER_THREAD_NAME,
      },
    },
  } ;
}

/**
 * Creates a profiling envelope item, if the profile does not pass validation, returns null.
 * @param {RawThreadCpuProfile}
 * @param {Event}
 * @returns {Profile | null}
 */
function createProfilingEvent(client, profile, event) {
  if (!isValidProfile(profile)) {
    return null;
  }

  return createProfilePayload(client, profile, {
    release: event.release ?? '',
    environment: event.environment ?? '',
    event_id: event.event_id ?? '',
    transaction: event.transaction ?? '',
    start_timestamp: event.start_timestamp ? event.start_timestamp * 1000 : Date.now(),
    trace_id: event.contexts?.trace?.trace_id ?? '',
    profile_id: profile.profile_id,
  });
}

/**
 * Create a profile
 * @param {RawThreadCpuProfile} cpuProfile
 * @param {options}
 * @returns {Profile}
 */
function createProfilePayload(
  client,
  cpuProfile,
  {
    release,
    environment,
    event_id,
    transaction,
    start_timestamp,
    trace_id,
    profile_id,
  }

,
) {
  // Log a warning if the profile has an invalid traceId (should be uuidv4).
  // All profiles and transactions are rejected if this is the case and we want to
  // warn users that this is happening if they enable debug flag
  if (trace_id?.length !== 32) {
    DEBUG_BUILD && core.debug.log(`[Profiling] Invalid traceId: ${trace_id} on profiled event`);
  }

  const enrichedThreadProfile = enrichWithThreadInformation(cpuProfile);

  const profile = {
    event_id: profile_id,
    timestamp: new Date(start_timestamp).toISOString(),
    platform: 'node',
    version: FORMAT_VERSION,
    release: release,
    environment: environment,
    measurements: cpuProfile.measurements,
    runtime: {
      name: 'node',
      version: process$1.versions.node || '',
    },
    os: {
      name: PLATFORM,
      version: RELEASE,
      build_number: VERSION,
    },
    device: {
      locale: process$1.env['LC_ALL'] || process$1.env['LC_MESSAGES'] || process$1.env['LANG'] || process$1.env['LANGUAGE'] || '',
      model: MODEL,
      manufacturer: TYPE,
      architecture: ARCH,
      is_emulator: false,
    },
    debug_meta: {
      images: applyDebugMetadata(client, cpuProfile.resources),
    },
    profile: enrichedThreadProfile ,
    transaction: {
      name: transaction,
      id: event_id,
      trace_id: trace_id || '',
      active_thread_id: PROFILER_THREAD_ID_STRING,
    },
  };

  return profile;
}

/**
 * Create a profile chunk from raw thread profile
 * @param {RawThreadCpuProfile} cpuProfile
 * @param {options}
 * @returns {Profile}
 */
function createProfileChunkPayload(
  client,
  cpuProfile,
  {
    release,
    environment,
    trace_id,
    profiler_id,
    chunk_id,
    sdk,
  }

,
) {
  // Log a warning if the profile has an invalid traceId (should be uuidv4).
  // All profiles and transactions are rejected if this is the case and we want to
  // warn users that this is happening if they enable debug flag
  if (trace_id?.length !== 32) {
    DEBUG_BUILD && core.debug.log(`[Profiling] Invalid traceId: ${trace_id} on profiled event`);
  }

  const enrichedThreadProfile = enrichWithThreadInformation(cpuProfile);

  const profile = {
    chunk_id: chunk_id,
    client_sdk: {
      name: sdk?.name ?? 'sentry.javascript.node',
      version: sdk?.version ?? '0.0.0',
    },
    profiler_id: profiler_id,
    platform: 'node',
    version: CONTINUOUS_FORMAT_VERSION,
    release: release,
    environment: environment,
    measurements: cpuProfile.measurements,
    debug_meta: {
      images: applyDebugMetadata(client, cpuProfile.resources),
    },
    profile: enrichedThreadProfile ,
  };

  return profile;
}

/**
 * Creates a profiling chunk envelope item, if the profile does not pass validation, returns null.
 */
function createProfilingChunkEvent(
  client,
  options,
  profile,
  sdk,
  identifiers,
) {
  if (!isValidProfileChunk(profile)) {
    return null;
  }

  return createProfileChunkPayload(client, profile, {
    release: options.release ?? '',
    environment: options.environment ?? '',
    trace_id: identifiers.trace_id ?? '',
    chunk_id: identifiers.chunk_id,
    profiler_id: identifiers.profiler_id,
    sdk,
  });
}

/**
 * Checks the given sample rate to make sure it is valid type and value (a boolean, or a number between 0 and 1).
 * @param {unknown} rate
 * @returns {boolean}
 */
function isValidSampleRate(rate) {
  // we need to check NaN explicitly because it's of type 'number' and therefore wouldn't get caught by this typecheck
  if ((typeof rate !== 'number' && typeof rate !== 'boolean') || (typeof rate === 'number' && isNaN(rate))) {
    DEBUG_BUILD &&
      core.debug.warn(
        `[Profiling] Invalid sample rate. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
          rate,
        )} of type ${JSON.stringify(typeof rate)}.`,
      );
    return false;
  }

  // Boolean sample rates are always valid
  if (rate === true || rate === false) {
    return true;
  }

  // in case sampleRate is a boolean, it will get automatically cast to 1 if it's true and 0 if it's false
  if (rate < 0 || rate > 1) {
    DEBUG_BUILD && core.debug.warn(`[Profiling] Invalid sample rate. Sample rate must be between 0 and 1. Got ${rate}.`);
    return false;
  }
  return true;
}

/**
 * Checks if the profile is valid and can be sent to Sentry.
 * @param {RawThreadCpuProfile} profile
 * @returns {boolean}
 */
function isValidProfile(profile) {
  if (profile.samples.length <= 1) {
    DEBUG_BUILD &&
      // Log a warning if the profile has less than 2 samples so users can know why
      // they are not seeing any profiling data and we cant avoid the back and forth
      // of asking them to provide us with a dump of the profile data.
      core.debug.log('[Profiling] Discarding profile because it contains less than 2 samples');
    return false;
  }

  if (!profile.profile_id) {
    return false;
  }

  return true;
}

/**
 * Checks if the profile chunk is valid and can be sent to Sentry.
 * @param profile
 * @returns
 */
function isValidProfileChunk(profile) {
  if (profile.samples.length <= 1) {
    DEBUG_BUILD &&
      // Log a warning if the profile has less than 2 samples so users can know why
      // they are not seeing any profiling data and we cant avoid the back and forth
      // of asking them to provide us with a dump of the profile data.
      core.debug.log('[Profiling] Discarding profile chunk because it contains less than 2 samples');
    return false;
  }

  return true;
}

/**
 * Adds items to envelope if they are not already present - mutates the envelope.
 * @param {Envelope} envelope
 * @param {Profile[]} profiles
 * @returns {Envelope}
 */
function addProfilesToEnvelope(envelope, profiles) {
  if (!profiles.length) {
    return envelope;
  }

  for (const profile of profiles) {
    // @ts-expect-error untyped envelope
    envelope[1].push([{ type: 'profile' }, profile]);
  }
  return envelope;
}

/**
 * Finds transactions with profile_id context in the envelope
 * @param {Envelope} envelope
 * @returns {Event[]}
 */
function findProfiledTransactionsFromEnvelope(envelope) {
  const events = [];

  core.forEachEnvelopeItem(envelope, (item, type) => {
    if (type !== 'transaction') {
      return;
    }

    // First item is the type, so we can skip it, everything else is an event
    for (let j = 1; j < item.length; j++) {
      const event = item[j] ;

      if (!event) {
        // Shouldn't happen, but lets be safe
        continue;
      }

      const profile_id = event.contexts?.profile?.profile_id;

      if (event && profile_id) {
        events.push(event);
      }
    }
  });

  return events;
}

/**
 * Creates event envelope headers for a profile chunk. This is separate from createEventEnvelopeHeaders util
 * as the profile chunk does not conform to the sentry event type
 */
function createEventEnvelopeHeaders(
  sdkInfo,
  tunnel,
  dsn,
) {
  return {
    event_id: core.uuid4(),
    sent_at: new Date().toISOString(),
    ...(sdkInfo && { sdk: sdkInfo }),
    ...(!!tunnel && dsn && { dsn: core.dsnToString(dsn) }),
  };
}

/**
 * Creates a standalone profile_chunk envelope.
 */
function makeProfileChunkEnvelope(
  platform,
  chunk,
  sdkInfo,
  tunnel,
  dsn,
) {
  const profileChunkHeader = {
    type: 'profile_chunk',
    platform,
  };

  return core.createEnvelope(createEventEnvelopeHeaders(sdkInfo, tunnel, dsn), [
    [profileChunkHeader, chunk],
  ]);
}

/**
 * Cross reference profile collected resources with debug_ids and return a list of debug images.
 * @param {string[]} resource_paths
 * @returns {DebugImage[]}
 */
function applyDebugMetadata(client, resource_paths) {
  const options = client.getOptions();

  if (!options?.stackParser) {
    return [];
  }

  return core.getDebugImagesForResources(options.stackParser, resource_paths);
}

const MAX_PROFILE_DURATION_MS = 30 * 1000;

/**
 * Takes a transaction and determines if it should be profiled or not. If it should be profiled, it returns the
 * profile_id, otherwise returns undefined. Takes care of setting profile context on transaction as well
 */
function maybeProfileSpan(
  client,
  span,
  customSamplingContext,
) {
  // profilesSampleRate is multiplied with tracesSampleRate to get the final sampling rate. We dont perform
  // the actual multiplication to get the final rate, but we discard the profile if the span was sampled,
  // so anything after this block from here is based on the span sampling.
  if (!core.spanIsSampled(span)) {
    return;
  }

  // Client and options are required for profiling
  if (!client) {
    DEBUG_BUILD && core.debug.log('[Profiling] Profiling disabled, no client found.');
    return;
  }

  const options = client.getOptions();
  if (!options) {
    DEBUG_BUILD && core.debug.log('[Profiling] Profiling disabled, no options found.');
    return;
  }

  const profilesSampler = options.profilesSampler;
  let profilesSampleRate = options.profilesSampleRate;

  // Prefer sampler to sample rate if both are provided.
  if (typeof profilesSampler === 'function') {
    const { description: spanName = '<unknown>', data } = core.spanToJSON(span);
    // We bail out early if that is not the case
    const parentSampled = true;

    profilesSampleRate = profilesSampler({
      name: spanName,
      attributes: data,
      parentSampled,
      ...customSamplingContext,
    });
  }

  // Since this is coming from the user (or from a function provided by the user), who knows what we might get. (The
  // only valid values are booleans or numbers between 0 and 1.)
  if (!isValidSampleRate(profilesSampleRate)) {
    DEBUG_BUILD && core.debug.warn('[Profiling] Discarding profile because of invalid sample rate.');
    return;
  }

  // if the function returned 0 (or false), or if `profileSampleRate` is 0, it's a sign the profile should be dropped
  if (!profilesSampleRate) {
    DEBUG_BUILD &&
      core.debug.log(
        `[Profiling] Discarding profile because ${
          typeof profilesSampler === 'function'
            ? 'profileSampler returned 0 or false'
            : 'a negative sampling decision was inherited or profileSampleRate is set to 0'
        }`,
      );
    return;
  }

  // Now we roll the dice. Math.random is inclusive of 0, but not of 1, so strict < is safe here. In case sampleRate is
  // a boolean, the < comparison will cause it to be automatically cast to 1 if it's true and 0 if it's false.
  const sampled = profilesSampleRate === true ? true : Math.random() < profilesSampleRate;
  // Check if we should sample this profile
  if (!sampled) {
    DEBUG_BUILD &&
      core.debug.log(
        `[Profiling] Discarding profile because it's not included in the random sample (sampling rate = ${Number(
          profilesSampleRate,
        )})`,
      );
    return;
  }

  const profile_id = core.uuid4();
  nodeCpuProfiler.CpuProfilerBindings.startProfiling(profile_id);
  DEBUG_BUILD && core.debug.log(`[Profiling] started profiling transaction: ${core.spanToJSON(span).description}`);

  // set transaction context - do this regardless if profiling fails down the line
  // so that we can still see the profile_id in the transaction context
  return profile_id;
}

/**
 * Stops the profiler for profile_id and returns the profile
 * @param transaction
 * @param profile_id
 * @returns
 */
function stopSpanProfile(span, profile_id) {
  // Should not happen, but satisfy the type checker and be safe regardless.
  if (!profile_id) {
    return null;
  }

  const profile = nodeCpuProfiler.CpuProfilerBindings.stopProfiling(profile_id, 0);
  DEBUG_BUILD && core.debug.log(`[Profiling] stopped profiling of transaction: ${core.spanToJSON(span).description}`);

  // In case of an overlapping span, stopProfiling may return null and silently ignore the overlapping profile.
  if (!profile) {
    DEBUG_BUILD &&
      core.debug.log(
        `[Profiling] profiler returned null profile for: ${core.spanToJSON(span).description}`,
        'this may indicate an overlapping span or a call to stopProfiling with a profile title that was never started',
      );
    return null;
  }

  // Assign profile_id to the profile
  profile.profile_id = profile_id;
  return profile;
}

const CHUNK_INTERVAL_MS = 1000 * 60;
const PROFILE_MAP = new core.LRUMap(50);
const PROFILE_TIMEOUTS = {};

function addToProfileQueue(profile_id, profile) {
  PROFILE_MAP.set(profile_id, profile);
}

function takeFromProfileQueue(profile_id) {
  const profile = PROFILE_MAP.get(profile_id);
  PROFILE_MAP.remove(profile_id);
  return profile;
}

class ContinuousProfiler {constructor() { ContinuousProfiler.prototype.__init.call(this);ContinuousProfiler.prototype.__init2.call(this);ContinuousProfiler.prototype.__init3.call(this);ContinuousProfiler.prototype.__init4.call(this);ContinuousProfiler.prototype.__init5.call(this);ContinuousProfiler.prototype.__init6.call(this);ContinuousProfiler.prototype.__init7.call(this); }

   __init() {this._client = undefined;}
   __init2() {this._chunkData = undefined;}
   __init3() {this._mode = undefined;}
   __init4() {this._legacyProfilerMode = undefined;}
   __init5() {this._profileLifecycle = undefined;}
   __init6() {this._sampled = undefined;}
   __init7() {this._sessionSamplingRate = undefined;}
  /**
   * Called when the profiler is attached to the client (continuous mode is enabled). If of the profiler
   * methods called before the profiler is initialized will result in a noop action with debug logs.
   * @param client
   */
   initialize(client) {
    this._client = client;
    const options = client.getOptions();

    this._mode = getProfilingMode(options);
    this._sessionSamplingRate = Math.random();
    this._sampled = this._sessionSamplingRate < (options.profileSessionSampleRate ?? 0);
    this._profileLifecycle = options.profileLifecycle ?? 'manual';

    switch (this._mode) {
      case 'legacy': {
        this._legacyProfilerMode =
          'profilesSampleRate' in options || 'profilesSampler' in options ? 'span' : 'continuous';

        DEBUG_BUILD && core.debug.log(`[Profiling] Profiling mode is ${this._legacyProfilerMode}.`);

        switch (this._legacyProfilerMode) {
          case 'span': {
            this._setupAutomaticSpanProfiling();
            break;
          }
          case 'continuous': {
            // Continous mode requires manual calls to profiler.start() and profiler.stop()
            break;
          }
          default: {
            DEBUG_BUILD &&
              core.debug.warn(
                `[Profiling] Unknown profiler mode: ${this._legacyProfilerMode}, profiler was not initialized`,
              );
            break;
          }
        }
        break;
      }

      case 'current': {
        this._setupSpanChunkInstrumentation();

        DEBUG_BUILD && core.debug.log(`[Profiling] Profiling mode is ${this._profileLifecycle}.`);

        switch (this._profileLifecycle) {
          case 'trace': {
            this._startTraceLifecycleProfiling();
            break;
          }
          case 'manual': {
            // Manual mode requires manual calls to profiler.startProfiler() and profiler.stopProfiler()
            break;
          }
          default: {
            DEBUG_BUILD &&
              core.debug.warn(`[Profiling] Unknown profiler mode: ${this._profileLifecycle}, profiler was not initialized`);
            break;
          }
        }
        break;
      }
      default: {
        DEBUG_BUILD && core.debug.warn(`[Profiling] Unknown profiler mode: ${this._mode}, profiler was not initialized`);
        break;
      }
    }

    // Attaches a listener to beforeSend which will add the threadId data to the event being sent.
    // This adds a constant overhead to all events being sent which could be improved to only attach
    // and detach the listener during a profiler session
    this._client.on('beforeSendEvent', this._onBeforeSendThreadContextAssignment.bind(this));
  }

  /**
   * Initializes a new profilerId session and schedules chunk profiling.
   * @returns void
   */
   start() {
    if (this._mode === 'current') {
      this._startProfiler();
      return;
    }

    if (!this._client) {
      DEBUG_BUILD && core.debug.log('[Profiling] Failed to start, sentry client was never attached to the profiler.');
      return;
    }

    if (this._mode !== 'legacy') {
      DEBUG_BUILD && core.debug.log('[Profiling] Continuous profiling is not supported in the current mode.');
      return;
    }

    if (this._legacyProfilerMode === 'span') {
      DEBUG_BUILD && core.debug.log('[Profiling] Calls to profiler.start() are not supported in span profiling mode.');
      return;
    }

    // Flush any existing chunks before starting a new one.

    this._stopChunkProfiling();

    // Restart the profiler session
    this._setupSpanChunkInstrumentation();
    this._restartChunkProfiling();
  }

  /**
   * Stops the current chunk and flushes the profile to Sentry.
   * @returns void
   */
   stop() {
    if (this._mode === 'current') {
      this._stopProfiler();
      return;
    }

    if (!this._client) {
      DEBUG_BUILD && core.debug.log('[Profiling] Failed to stop, sentry client was never attached to the profiler.');
      return;
    }

    if (this._mode !== 'legacy') {
      DEBUG_BUILD && core.debug.log('[Profiling] Continuous profiling is not supported in the current mode.');
      return;
    }

    if (this._legacyProfilerMode === 'span') {
      DEBUG_BUILD && core.debug.log('[Profiling] Calls to profiler.stop() are not supported in span profiling mode.');
      return;
    }

    this._stopChunkProfiling();
    this._teardownSpanChunkInstrumentation();
  }

   _startProfiler() {
    if (this._mode !== 'current') {
      DEBUG_BUILD && core.debug.log('[Profiling] Continuous profiling is not supported in the current mode.');
      return;
    }

    if (this._chunkData !== undefined) {
      DEBUG_BUILD && core.debug.log('[Profiling] Profile session already running, no-op.');
      return;
    }

    if (this._mode === 'current') {
      if (!this._sampled) {
        DEBUG_BUILD && core.debug.log('[Profiling] Profile session not sampled, no-op.');
        return;
      }
    }

    if (this._profileLifecycle === 'trace') {
      DEBUG_BUILD &&
        core.debug.log(
          '[Profiling] You are using the trace profile lifecycle, manual calls to profiler.startProfiler() and profiler.stopProfiler() will be ignored.',
        );
      return;
    }

    this._startChunkProfiling();
  }

   _stopProfiler() {
    if (this._mode !== 'current') {
      DEBUG_BUILD && core.debug.log('[Profiling] Continuous profiling is not supported in the current mode.');
      return;
    }

    if (this._profileLifecycle === 'trace') {
      DEBUG_BUILD &&
        core.debug.log(
          '[Profiling] You are using the trace profile lifecycle, manual calls to profiler.startProfiler() and profiler.stopProfiler() will be ignored.',
        );
      return;
    }

    if (!this._chunkData) {
      DEBUG_BUILD && core.debug.log('[Profiling] No profile session running, no-op.');
      return;
    }

    this._stopChunkProfiling();
  }

  /**
   * Starts trace lifecycle profiling. Profiling will remain active as long as there is an active span.
   */
   _startTraceLifecycleProfiling() {
    if (!this._client) {
      DEBUG_BUILD &&
        core.debug.log(
          '[Profiling] Failed to start trace lifecycle profiling, sentry client was never attached to the profiler.',
        );
      return;
    }

    let activeSpanCounter = 0;
    this._client.on('spanStart', _span => {
      if (activeSpanCounter === 0) {
        this._startChunkProfiling();
      }
      activeSpanCounter++;
    });

    this._client.on('spanEnd', _span => {
      if (activeSpanCounter === 1) {
        this._stopChunkProfiling();
      }
      activeSpanCounter--;
    });
  }

   _setupAutomaticSpanProfiling() {
    if (!this._client) {
      DEBUG_BUILD &&
        core.debug.log(
          '[Profiling] Failed to setup automatic span profiling, sentry client was never attached to the profiler.',
        );
      return;
    }

    const spanToProfileIdMap = new WeakMap();

    this._client.on('spanStart', span => {
      if (span !== core.getRootSpan(span)) {
        return;
      }

      const profile_id = maybeProfileSpan(this._client, span);

      if (profile_id) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const options = this._client.getOptions();
        // Not intended for external use, hence missing types, but we want to profile a couple of things at Sentry that
        // currently exceed the default timeout set by the SDKs.
        const maxProfileDurationMs = options._experiments?.maxProfileDurationMs || MAX_PROFILE_DURATION_MS;

        if (PROFILE_TIMEOUTS[profile_id]) {
          global.clearTimeout(PROFILE_TIMEOUTS[profile_id]);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete PROFILE_TIMEOUTS[profile_id];
        }

        // Enqueue a timeout to prevent profiles from running over max duration.
        const timeout = global.setTimeout(() => {
          DEBUG_BUILD &&
            core.debug.log(
              '[Profiling] max profile duration elapsed, stopping profiling for:',
              core.spanToJSON(span).description,
            );

          const profile = stopSpanProfile(span, profile_id);
          if (profile) {
            addToProfileQueue(profile_id, profile);
          }
        }, maxProfileDurationMs);

        // Unref timeout so it doesn't keep the process alive.
        timeout.unref();

        core.getIsolationScope().setContext('profile', { profile_id });
        spanToProfileIdMap.set(span, profile_id);
      }
    });

    this._client.on('spanEnd', span => {
      const profile_id = spanToProfileIdMap.get(span);

      if (profile_id) {
        if (PROFILE_TIMEOUTS[profile_id]) {
          global.clearTimeout(PROFILE_TIMEOUTS[profile_id]);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete PROFILE_TIMEOUTS[profile_id];
        }
        const profile = stopSpanProfile(span, profile_id);

        if (profile) {
          addToProfileQueue(profile_id, profile);
        }
      }
    });

    this._client.on('beforeEnvelope', (envelope) => {
      // if not profiles are in queue, there is nothing to add to the envelope.
      if (!PROFILE_MAP.size) {
        return;
      }

      const profiledTransactionEvents = findProfiledTransactionsFromEnvelope(envelope);
      if (!profiledTransactionEvents.length) {
        return;
      }

      const profilesToAddToEnvelope = [];

      for (const profiledTransaction of profiledTransactionEvents) {
        const profileContext = profiledTransaction.contexts?.profile;
        const profile_id = profileContext?.profile_id;

        if (!profile_id) {
          throw new TypeError('[Profiling] cannot find profile for a transaction without a profile context');
        }

        // Remove the profile from the transaction context before sending, relay will take care of the rest.
        if (profileContext) {
          delete profiledTransaction.contexts?.profile;
        }

        const cpuProfile = takeFromProfileQueue(profile_id);
        if (!cpuProfile) {
          DEBUG_BUILD && core.debug.log(`[Profiling] Could not retrieve profile for transaction: ${profile_id}`);
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const profile = createProfilingEvent(this._client, cpuProfile, profiledTransaction);
        if (!profile) return;

        profilesToAddToEnvelope.push(profile);

        // @ts-expect-error profile does not inherit from Event
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._client.emit('preprocessEvent', profile, {
          event_id: profiledTransaction.event_id,
        });

        // @ts-expect-error profile does not inherit from Event
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._client.emit('postprocessEvent', profile, {
          event_id: profiledTransaction.event_id,
        });
      }

      addProfilesToEnvelope(envelope, profilesToAddToEnvelope);
    });
  }

  /**
   * Stop profiler and initializes profiling of the next chunk
   */
   _restartChunkProfiling() {
    if (!this._client) {
      // The client is not attached to the profiler if the user has not enabled continuous profiling.
      // In this case, calling start() and stop() is a noop action.The reason this exists is because
      // it makes the types easier to work with and avoids users having to do null checks.
      DEBUG_BUILD && core.debug.log('[Profiling] Profiler was never attached to the client.');
      return;
    }

    if (this._chunkData) {
      DEBUG_BUILD &&
        core.debug.log(
          `[Profiling] Chunk with chunk_id ${this._chunkData.id} is still running, current chunk will be stopped a new chunk will be started.`,
        );
      this._stopChunkProfiling();
    }

    this._startChunkProfiling();
  }

  /**
   * Stops profiling of the current chunks and flushes the profile to Sentry
   */
   _stopChunkProfiling() {
    if (!this._chunkData) {
      DEBUG_BUILD && core.debug.log('[Profiling] No chunk data found, no-op.');
      return;
    }

    if (this._chunkData?.timer) {
      global.clearTimeout(this._chunkData.timer);
      this._chunkData.timer = undefined;
      DEBUG_BUILD && core.debug.log(`[Profiling] Stopping profiling chunk: ${this._chunkData.id}`);
    }

    if (!this._client) {
      DEBUG_BUILD &&
        core.debug.log('[Profiling] Failed to collect profile, sentry client was never attached to the profiler.');
      this._resetChunkData();
      return;
    }

    if (!this._chunkData?.id) {
      DEBUG_BUILD &&
        core.debug.log(`[Profiling] Failed to collect profile for: ${this._chunkData?.id}, the chunk_id is missing.`);
      this._resetChunkData();
      return;
    }

    const profile = nodeCpuProfiler.CpuProfilerBindings.stopProfiling(this._chunkData.id, nodeCpuProfiler.ProfileFormat.CHUNK);

    if (!profile) {
      DEBUG_BUILD && core.debug.log(`[Profiling] Failed to collect profile for: ${this._chunkData.id}`);
      this._resetChunkData();
      return;
    }

    if (!this._profilerId) {
      DEBUG_BUILD &&
        core.debug.log('[Profiling] Profile chunk does not contain a valid profiler_id, this is a bug in the SDK');
      this._resetChunkData();
      return;
    }
    if (profile) {
      DEBUG_BUILD && core.debug.log(`[Profiling] Sending profile chunk ${this._chunkData.id}.`);
    }

    DEBUG_BUILD && core.debug.log(`[Profiling] Profile chunk ${this._chunkData.id} sent to Sentry.`);
    const chunk = createProfilingChunkEvent(
      this._client,
      this._client.getOptions(),
      profile,
      this._client.getSdkMetadata()?.sdk,
      {
        chunk_id: this._chunkData.id,
        trace_id: this._chunkData.startTraceID,
        profiler_id: this._profilerId,
      },
    );

    if (!chunk) {
      DEBUG_BUILD && core.debug.log(`[Profiling] Failed to create profile chunk for: ${this._chunkData.id}`);
      this._resetChunkData();
      return;
    }

    this._flush(chunk);
    // Depending on the profile and stack sizes, stopping the profile and converting
    // the format may negatively impact the performance of the application. To avoid
    // blocking for too long, enqueue the next chunk start inside the next macrotask.
    // clear current chunk
    this._resetChunkData();
  }

  /**
   * Flushes the profile chunk to Sentry.
   * @param chunk
   */
   _flush(chunk) {
    if (!this._client) {
      DEBUG_BUILD &&
        core.debug.log('[Profiling] Failed to collect profile, sentry client was never attached to the profiler.');
      return;
    }

    const transport = this._client.getTransport();
    if (!transport) {
      DEBUG_BUILD && core.debug.log('[Profiling] No transport available to send profile chunk.');
      return;
    }

    const dsn = this._client.getDsn();
    const metadata = this._client.getSdkMetadata();
    const tunnel = this._client.getOptions().tunnel;

    const envelope = makeProfileChunkEnvelope('node', chunk, metadata?.sdk, tunnel, dsn);
    transport.send(envelope).then(null, reason => {
      DEBUG_BUILD && core.debug.error('Error while sending profile chunk envelope:', reason);
    });
  }

  /**
   * Starts the profiler and registers the flush timer for a given chunk.
   * @param chunk
   */
   _startChunkProfiling() {
    if (this._chunkData) {
      DEBUG_BUILD && core.debug.log('[Profiling] Chunk is already running, no-op.');
      return;
    }

    const traceId =
      core.getCurrentScope().getPropagationContext().traceId || core.getIsolationScope().getPropagationContext().traceId;
    const chunk = this._initializeChunk(traceId);

    nodeCpuProfiler.CpuProfilerBindings.startProfiling(chunk.id);
    DEBUG_BUILD && core.debug.log(`[Profiling] starting profiling chunk: ${chunk.id}`);

    chunk.timer = global.setTimeout(() => {
      DEBUG_BUILD && core.debug.log(`[Profiling] Stopping profiling chunk: ${chunk.id}`);
      this._stopChunkProfiling();
      DEBUG_BUILD && core.debug.log('[Profiling] Starting new profiling chunk.');
      setImmediate(this._restartChunkProfiling.bind(this));
    }, CHUNK_INTERVAL_MS);

    // Unref timeout so it doesn't keep the process alive.
    chunk.timer.unref();
  }

  /**
   * Attaches profiling information to spans that were started
   * during a profiling session.
   */
   _setupSpanChunkInstrumentation() {
    if (!this._client) {
      DEBUG_BUILD &&
        core.debug.log('[Profiling] Failed to initialize span profiling, sentry client was never attached to the profiler.');
      return;
    }

    this._profilerId = core.uuid4();
    core.getGlobalScope().setContext('profile', {
      profiler_id: this._profilerId,
    });
  }

  /**
   * Assigns thread_id and thread name context to a profiled event if there is an active profiler session
   */
   _onBeforeSendThreadContextAssignment(event) {
    if (!this._client || !this._profilerId) return;
    this._assignThreadIdContext(event);
  }

  /**
   * Clear profiling information from global context when a profile is not running.
   */
   _teardownSpanChunkInstrumentation() {
    this._profilerId = undefined;
    const globalScope = core.getGlobalScope();
    globalScope.setContext('profile', {});
  }

  /**
   * Initializes new profile chunk metadata
   */
   _initializeChunk(traceId) {
    this._chunkData = {
      id: core.uuid4(),
      startTraceID: traceId,
      timer: undefined,
    };
    return this._chunkData;
  }

  /**
   * Assigns thread_id and thread name context to a profiled event.
   */
   _assignThreadIdContext(event) {
    if (!event?.contexts?.profile) {
      return;
    }

    if (!event.contexts) {
      return;
    }

    // @ts-expect-error the trace fallback value is wrong, though it should never happen
    // and in case it does, we dont want to override whatever was passed initially.
    event.contexts.trace = {
      ...(event.contexts?.trace ?? {}),
      data: {
        ...(event.contexts?.trace?.data ?? {}),
        ['thread.id']: PROFILER_THREAD_ID_STRING,
        ['thread.name']: PROFILER_THREAD_NAME,
      },
    };
  }

  /**
   * Resets the current chunk state.
   */
   _resetChunkData() {
    this._chunkData = undefined;
  }
}

/** Exported only for tests. */
const _nodeProfilingIntegration = (() => {
  if (![16, 18, 20, 22, 24].includes(NODE_MAJOR)) {
    core.consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn(
        `[Sentry Profiling] You are using a Node.js version that does not have prebuilt binaries (${NODE_VERSION}).`,
        'The @sentry/profiling-node package only has prebuilt support for the following LTS versions of Node.js: 16, 18, 20, 22, 24.',
        'To use the @sentry/profiling-node package with this version of Node.js, you will need to compile the native addon from source.',
        'See: https://github.com/getsentry/sentry-javascript/tree/develop/packages/profiling-node#building-the-package-from-source',
      );
    });
  }

  return {
    name: 'ProfilingIntegration',
    _profiler: new ContinuousProfiler(),
    setup(client) {
      DEBUG_BUILD && core.debug.log('[Profiling] Profiling integration setup.');
      this._profiler.initialize(client);
      return;
    },
  };
}) ;

/**
 * Determines the profiling mode based on the options.
 * @param options
 * @returns 'legacy' if the options are using the legacy profiling API, 'current' if the options are using the current profiling API
 */
function getProfilingMode(options) {
  // Legacy mode takes precedence over current mode
  if ('profilesSampleRate' in options || 'profilesSampler' in options) {
    return 'legacy';
  }

  if ('profileSessionSampleRate' in options || 'profileLifecycle' in options) {
    return 'current';
  }

  // If neither are set, we are in the legacy continuous profiling mode
  return 'legacy';
}

/**
 * We need this integration in order to send data to Sentry. We hook into the event processor
 * and inspect each event to see if it is a transaction event and if that transaction event
 * contains a profile on it's metadata. If that is the case, we create a profiling event envelope
 * and delete the profile from the transaction metadata.
 */
const nodeProfilingIntegration = core.defineIntegration(_nodeProfilingIntegration);

exports.nodeProfilingIntegration = nodeProfilingIntegration;
//# sourceMappingURL=index.js.map
