Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');

const MS_TO_NS = 1e6;

// Checking if we are in Main or Worker thread: `self` (not `window`) is the `globalThis` in Web Workers and `importScripts` are only available in Web Workers
const isMainThread = 'window' in core.GLOBAL_OBJ && core.GLOBAL_OBJ.window === core.GLOBAL_OBJ && typeof importScripts === 'undefined';

// Setting ID to 0 as we cannot get an ID from Web Workers
const PROFILER_THREAD_ID_STRING = String(0);
const PROFILER_THREAD_NAME = isMainThread ? 'main' : 'worker';

// We force make this optional to be on the safe side...
const navigator = helpers.WINDOW.navigator ;

// Machine properties (eval only once)
let OS_PLATFORM = '';
let OS_PLATFORM_VERSION = '';
let OS_ARCH = '';
let OS_BROWSER = navigator?.userAgent || '';
let OS_MODEL = '';
const OS_LOCALE = navigator?.language || navigator?.languages?.[0] || '';

function isUserAgentData(data) {
  return typeof data === 'object' && data !== null && 'getHighEntropyValues' in data;
}

// @ts-expect-error userAgentData is not part of the navigator interface yet
const userAgentData = navigator?.userAgentData;

if (isUserAgentData(userAgentData)) {
  userAgentData
    .getHighEntropyValues(['architecture', 'model', 'platform', 'platformVersion', 'fullVersionList'])
    .then((ua) => {
      OS_PLATFORM = ua.platform || '';
      OS_ARCH = ua.architecture || '';
      OS_MODEL = ua.model || '';
      OS_PLATFORM_VERSION = ua.platformVersion || '';

      if (ua.fullVersionList?.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstUa = ua.fullVersionList[ua.fullVersionList.length - 1];
        OS_BROWSER = `${firstUa.brand} ${firstUa.version}`;
      }
    })
    .catch(e => void 0);
}

function isProcessedJSSelfProfile(profile) {
  return !('thread_metadata' in profile);
}

// Enriches the profile with threadId of the current thread.
// This is done in node as we seem to not be able to get the info from C native code.
/**
 *
 */
function enrichWithThreadInformation(profile) {
  if (!isProcessedJSSelfProfile(profile)) {
    return profile;
  }

  return convertJSSelfProfileToSampledFormat(profile);
}

// Profile is marked as optional because it is deleted from the metadata
// by the integration before the event is processed by other integrations.

function getTraceId(event) {
  const traceId = event.contexts?.trace?.trace_id;
  // Log a warning if the profile has an invalid traceId (should be uuidv4).
  // All profiles and transactions are rejected if this is the case and we want to
  // warn users that this is happening if they enable debug flag
  if (typeof traceId === 'string' && traceId.length !== 32) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.log(`[Profiling] Invalid traceId: ${traceId} on profiled event`);
    }
  }
  if (typeof traceId !== 'string') {
    return '';
  }

  return traceId;
}
/**
 * Creates a profiling event envelope from a Sentry event. If profile does not pass
 * validation, returns null.
 * @param event
 * @param dsn
 * @param metadata
 * @param tunnel
 * @returns {EventEnvelope | null}
 */

/**
 * Creates a profiling event envelope from a Sentry event.
 */
function createProfilePayload(
  profile_id,
  start_timestamp,
  processed_profile,
  event,
) {
  if (event.type !== 'transaction') {
    // createProfilingEventEnvelope should only be called for transactions,
    // we type guard this behavior with isProfiledTransactionEvent.
    throw new TypeError('Profiling events may only be attached to transactions, this should never occur.');
  }

  if (processed_profile === undefined || processed_profile === null) {
    throw new TypeError(
      `Cannot construct profiling event envelope without a valid profile. Got ${processed_profile} instead.`,
    );
  }

  const traceId = getTraceId(event);
  const enrichedThreadProfile = enrichWithThreadInformation(processed_profile);
  const transactionStartMs = start_timestamp
    ? start_timestamp
    : typeof event.start_timestamp === 'number'
      ? event.start_timestamp * 1000
      : core.timestampInSeconds() * 1000;
  const transactionEndMs = typeof event.timestamp === 'number' ? event.timestamp * 1000 : core.timestampInSeconds() * 1000;

  const profile = {
    event_id: profile_id,
    timestamp: new Date(transactionStartMs).toISOString(),
    platform: 'javascript',
    version: '1',
    release: event.release || '',
    environment: event.environment || core.DEFAULT_ENVIRONMENT,
    runtime: {
      name: 'javascript',
      version: helpers.WINDOW.navigator.userAgent,
    },
    os: {
      name: OS_PLATFORM,
      version: OS_PLATFORM_VERSION,
      build_number: OS_BROWSER,
    },
    device: {
      locale: OS_LOCALE,
      model: OS_MODEL,
      manufacturer: OS_BROWSER,
      architecture: OS_ARCH,
      is_emulator: false,
    },
    debug_meta: {
      images: applyDebugMetadata(processed_profile.resources),
    },
    profile: enrichedThreadProfile,
    transactions: [
      {
        name: event.transaction || '',
        id: event.event_id || core.uuid4(),
        trace_id: traceId,
        active_thread_id: PROFILER_THREAD_ID_STRING,
        relative_start_ns: '0',
        relative_end_ns: ((transactionEndMs - transactionStartMs) * 1e6).toFixed(0),
      },
    ],
  };

  return profile;
}

/**
 * Create a profile chunk envelope item
 */
function createProfileChunkPayload(
  jsSelfProfile,
  client,
  profilerId,
) {
  // only == to catch null and undefined
  if (jsSelfProfile == null) {
    throw new TypeError(
      `Cannot construct profiling event envelope without a valid profile. Got ${jsSelfProfile} instead.`,
    );
  }

  const continuousProfile = convertToContinuousProfile(jsSelfProfile);

  const options = client.getOptions();
  const sdk = client.getSdkMetadata?.()?.sdk;

  return {
    chunk_id: core.uuid4(),
    client_sdk: {
      name: sdk?.name ?? 'sentry.javascript.browser',
      version: sdk?.version ?? '0.0.0',
    },
    profiler_id: profilerId || core.uuid4(),
    platform: 'javascript',
    version: '2',
    release: options.release ?? '',
    environment: options.environment ?? 'production',
    debug_meta: {
      // function name obfuscation
      images: applyDebugMetadata(jsSelfProfile.resources),
    },
    profile: continuousProfile,
  };
}

/**
 * Validate a profile chunk against the Sample Format V2 requirements.
 * https://develop.sentry.dev/sdk/telemetry/profiles/sample-format-v2/
 * - Presence of samples, stacks, frames
 * - Required metadata fields
 */
function validateProfileChunk(chunk) {
  try {
    // Required metadata
    if (!chunk || typeof chunk !== 'object') {
      return { reason: 'chunk is not an object' };
    }

    // profiler_id and chunk_id must be 32 lowercase hex chars
    const isHex32 = (val) => typeof val === 'string' && /^[a-f0-9]{32}$/.test(val);
    if (!isHex32(chunk.profiler_id)) {
      return { reason: 'missing or invalid profiler_id' };
    }
    if (!isHex32(chunk.chunk_id)) {
      return { reason: 'missing or invalid chunk_id' };
    }

    if (!chunk.client_sdk) {
      return { reason: 'missing client_sdk metadata' };
    }

    // Profile data must have frames, stacks, samples
    const profile = chunk.profile ;
    if (!profile) {
      return { reason: 'missing profile data' };
    }

    if (!Array.isArray(profile.frames) || !profile.frames.length) {
      return { reason: 'profile has no frames' };
    }
    if (!Array.isArray(profile.stacks) || !profile.stacks.length) {
      return { reason: 'profile has no stacks' };
    }
    if (!Array.isArray(profile.samples) || !profile.samples.length) {
      return { reason: 'profile has no samples' };
    }

    return { valid: true };
  } catch (e) {
    return { reason: `unknown validation error: ${e}` };
  }
}

/**
 * Convert from JSSelfProfile format to ContinuousThreadCpuProfile format.
 */
function convertToContinuousProfile(input

) {
  // Frames map 1:1 by index; fill only when present to avoid sparse writes
  const frames = [];
  for (let i = 0; i < input.frames.length; i++) {
    const frame = input.frames[i];
    if (!frame) {
      continue;
    }
    frames[i] = {
      function: frame.name,
      abs_path: typeof frame.resourceId === 'number' ? input.resources[frame.resourceId] : undefined,
      lineno: frame.line,
      colno: frame.column,
    };
  }

  // Build stacks by following parent links, top->down order (root last)
  const stacks = [];
  for (let i = 0; i < input.stacks.length; i++) {
    const stackHead = input.stacks[i];
    if (!stackHead) {
      continue;
    }
    const list = [];
    let current = stackHead;
    while (current) {
      list.push(current.frameId);
      current = current.parentId === undefined ? undefined : input.stacks[current.parentId];
    }
    stacks[i] = list;
  }

  // Align timestamps to SDK time origin to match span/event timelines
  const perfOrigin = core.browserPerformanceTimeOrigin();
  const origin = typeof performance.timeOrigin === 'number' ? performance.timeOrigin : perfOrigin || 0;
  const adjustForOriginChange = origin - (perfOrigin || origin);

  const samples = [];
  for (let i = 0; i < input.samples.length; i++) {
    const sample = input.samples[i];
    if (!sample) {
      continue;
    }
    // Convert ms to seconds epoch-based timestamp
    const timestampSeconds = (origin + (sample.timestamp - adjustForOriginChange)) / 1000;
    samples[i] = {
      stack_id: sample.stackId ?? 0,
      thread_id: PROFILER_THREAD_ID_STRING,
      timestamp: timestampSeconds,
    };
  }

  return {
    frames,
    stacks,
    samples,
    thread_metadata: { [PROFILER_THREAD_ID_STRING]: { name: PROFILER_THREAD_NAME } },
  };
}

/*
  See packages/browser-utils/src/browser/router.ts
*/
/**
 *
 */
function isAutomatedPageLoadSpan(span) {
  return core.spanToJSON(span).op === 'pageload';
}

/**
 * Converts a JSSelfProfile to a our sampled format.
 * Does not currently perform stack indexing.
 */
function convertJSSelfProfileToSampledFormat(input) {
  let EMPTY_STACK_ID = undefined;
  let STACK_ID = 0;

  // Initialize the profile that we will fill with data
  const profile = {
    samples: [],
    stacks: [],
    frames: [],
    thread_metadata: {
      [PROFILER_THREAD_ID_STRING]: { name: PROFILER_THREAD_NAME },
    },
  };

  const firstSample = input.samples[0];
  if (!firstSample) {
    return profile;
  }

  // We assert samples.length > 0 above and timestamp should always be present
  const start = firstSample.timestamp;
  // The JS SDK might change it's time origin based on some heuristic (see See packages/utils/src/time.ts)
  // when that happens, we need to ensure we are correcting the profile timings so the two timelines stay in sync.
  // Since JS self profiling time origin is always initialized to performance.timeOrigin, we need to adjust for
  // the drift between the SDK selected value and our profile time origin.
  const perfOrigin = core.browserPerformanceTimeOrigin();
  const origin = typeof performance.timeOrigin === 'number' ? performance.timeOrigin : perfOrigin || 0;
  const adjustForOriginChange = origin - (perfOrigin || origin);

  input.samples.forEach((jsSample, i) => {
    // If sample has no stack, add an empty sample
    if (jsSample.stackId === undefined) {
      if (EMPTY_STACK_ID === undefined) {
        EMPTY_STACK_ID = STACK_ID;
        profile.stacks[EMPTY_STACK_ID] = [];
        STACK_ID++;
      }

      profile['samples'][i] = {
        // convert ms timestamp to ns
        elapsed_since_start_ns: ((jsSample.timestamp + adjustForOriginChange - start) * MS_TO_NS).toFixed(0),
        stack_id: EMPTY_STACK_ID,
        thread_id: PROFILER_THREAD_ID_STRING,
      };
      return;
    }

    let stackTop = input.stacks[jsSample.stackId];

    // Functions in top->down order (root is last)
    // We follow the stackTop.parentId trail and collect each visited frameId
    const stack = [];

    while (stackTop) {
      stack.push(stackTop.frameId);

      const frame = input.frames[stackTop.frameId];

      // If our frame has not been indexed yet, index it
      if (frame && profile.frames[stackTop.frameId] === undefined) {
        profile.frames[stackTop.frameId] = {
          function: frame.name,
          abs_path: typeof frame.resourceId === 'number' ? input.resources[frame.resourceId] : undefined,
          lineno: frame.line,
          colno: frame.column,
        };
      }

      stackTop = stackTop.parentId === undefined ? undefined : input.stacks[stackTop.parentId];
    }

    const sample = {
      // convert ms timestamp to ns
      elapsed_since_start_ns: ((jsSample.timestamp + adjustForOriginChange - start) * MS_TO_NS).toFixed(0),
      stack_id: STACK_ID,
      thread_id: PROFILER_THREAD_ID_STRING,
    };

    profile['stacks'][STACK_ID] = stack;
    profile['samples'][i] = sample;
    STACK_ID++;
  });

  return profile;
}

/**
 * Adds items to envelope if they are not already present - mutates the envelope.
 * @param envelope
 */
function addProfilesToEnvelope(envelope, profiles) {
  if (!profiles.length) {
    return envelope;
  }

  for (const profile of profiles) {
    envelope[1].push([{ type: 'profile' }, profile]);
  }
  return envelope;
}

/**
 * Finds transactions with profile_id context in the envelope
 * @param envelope
 * @returns
 */
function findProfiledTransactionsFromEnvelope(envelope) {
  const events = [];

  core.forEachEnvelopeItem(envelope, (item, type) => {
    if (type !== 'transaction') {
      return;
    }

    for (let j = 1; j < item.length; j++) {
      const event = item[j] ;

      if (event?.contexts?.profile?.profile_id) {
        events.push(item[j] );
      }
    }
  });

  return events;
}

/**
 * Applies debug meta data to an event from a list of paths to resources (sourcemaps)
 */
function applyDebugMetadata(resource_paths) {
  const client = core.getClient();
  const options = client?.getOptions();
  const stackParser = options?.stackParser;

  if (!stackParser) {
    return [];
  }

  return core.getDebugImagesForResources(stackParser, resource_paths);
}

/**
 * Checks the given sample rate to make sure it is valid type and value (a boolean, or a number between 0 and 1).
 */
function isValidSampleRate(rate) {
  // we need to check NaN explicitly because it's of type 'number' and therefore wouldn't get caught by this typecheck
  if ((typeof rate !== 'number' && typeof rate !== 'boolean') || (typeof rate === 'number' && isNaN(rate))) {
    debugBuild.DEBUG_BUILD &&
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
    debugBuild.DEBUG_BUILD && core.debug.warn(`[Profiling] Invalid sample rate. Sample rate must be between 0 and 1. Got ${rate}.`);
    return false;
  }
  return true;
}

function isValidProfile(profile) {
  if (profile.samples.length < 2) {
    if (debugBuild.DEBUG_BUILD) {
      // Log a warning if the profile has less than 2 samples so users can know why
      // they are not seeing any profiling data and we cant avoid the back and forth
      // of asking them to provide us with a dump of the profile data.
      core.debug.log('[Profiling] Discarding profile because it contains less than 2 samples');
    }
    return false;
  }

  if (!profile.frames.length) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.log('[Profiling] Discarding profile because it contains no frames');
    }
    return false;
  }

  return true;
}

// Keep a flag value to avoid re-initializing the profiler constructor. If it fails
// once, it will always fail and this allows us to early return.
let PROFILING_CONSTRUCTOR_FAILED = false;
const MAX_PROFILE_DURATION_MS = 30000;

/**
 * Check if profiler constructor is available.
 * @param maybeProfiler
 */
function isJSProfilerSupported(maybeProfiler) {
  return typeof maybeProfiler === 'function';
}

/**
 * Starts the profiler and returns the profiler instance.
 */
function startJSSelfProfile() {
  // Feature support check first
  const JSProfilerConstructor = helpers.WINDOW.Profiler;

  if (!isJSProfilerSupported(JSProfilerConstructor)) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.log('[Profiling] Profiling is not supported by this browser, Profiler interface missing on window object.');
    }
    return;
  }

  // From initial testing, it seems that the minimum value for sampleInterval is 10ms.
  const samplingIntervalMS = 10;
  // Start the profiler
  const maxSamples = Math.floor(MAX_PROFILE_DURATION_MS / samplingIntervalMS);

  // Attempt to initialize the profiler constructor, if it fails, we disable profiling for the current user session.
  // This is likely due to a missing 'Document-Policy': 'js-profiling' header. We do not want to throw an error if this happens
  // as we risk breaking the user's application, so just disable profiling and log an error.
  try {
    return new JSProfilerConstructor({ sampleInterval: samplingIntervalMS, maxBufferSize: maxSamples });
  } catch (e) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.log(
        "[Profiling] Failed to initialize the Profiling constructor, this is likely due to a missing 'Document-Policy': 'js-profiling' header.",
      );
      core.debug.log('[Profiling] Disabling profiling for current user session.');
    }
    PROFILING_CONSTRUCTOR_FAILED = true;
  }

  return;
}

/**
 * Determine if a profile should be profiled.
 */
function shouldProfileSpanLegacy(span) {
  // If constructor failed once, it will always fail, so we can early return.
  if (PROFILING_CONSTRUCTOR_FAILED) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.log('[Profiling] Profiling has been disabled for the duration of the current user session.');
    }
    return false;
  }

  if (!span.isRecording()) {
    debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Discarding profile because root span was not sampled.');
    return false;
  }

  const client = core.getClient();
  const options = client?.getOptions();
  if (!options) {
    debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Profiling disabled, no options found.');
    return false;
  }

  // eslint-disable-next-line deprecation/deprecation
  const profilesSampleRate = (options ).profilesSampleRate

;

  // Since this is coming from the user (or from a function provided by the user), who knows what we might get. (The
  // only valid values are booleans or numbers between 0 and 1.)
  if (!isValidSampleRate(profilesSampleRate)) {
    debugBuild.DEBUG_BUILD && core.debug.warn('[Profiling] Discarding profile because of invalid sample rate.');
    return false;
  }

  // if the function returned 0 (or false), or if `profileSampleRate` is 0, it's a sign the profile should be dropped
  if (!profilesSampleRate) {
    debugBuild.DEBUG_BUILD &&
      core.debug.log(
        '[Profiling] Discarding profile because a negative sampling decision was inherited or profileSampleRate is set to 0',
      );
    return false;
  }

  // Now we roll the dice. Math.random is inclusive of 0, but not of 1, so strict < is safe here. In case sampleRate is
  // a boolean, the < comparison will cause it to be automatically cast to 1 if it's true and 0 if it's false.
  const sampled = profilesSampleRate === true ? true : Math.random() < profilesSampleRate;
  // Check if we should sample this profile
  if (!sampled) {
    debugBuild.DEBUG_BUILD &&
      core.debug.log(
        `[Profiling] Discarding profile because it's not included in the random sample (sampling rate = ${Number(
          profilesSampleRate,
        )})`,
      );
    return false;
  }

  return true;
}

/**
 * Determine if a profile should be created for the current session.
 */
function shouldProfileSession(options) {
  // If constructor failed once, it will always fail, so we can early return.
  if (PROFILING_CONSTRUCTOR_FAILED) {
    if (debugBuild.DEBUG_BUILD) {
      core.debug.log(
        '[Profiling] Profiling has been disabled for the duration of the current user session as the JS Profiler could not be started.',
      );
    }
    return false;
  }

  if (options.profileLifecycle !== 'trace' && options.profileLifecycle !== 'manual') {
    debugBuild.DEBUG_BUILD && core.debug.warn('[Profiling] Session not sampled. Invalid `profileLifecycle` option.');
    return false;
  }

  //  Session sampling: profileSessionSampleRate gates whether profiling is enabled for this session
  const profileSessionSampleRate = options.profileSessionSampleRate;

  if (!isValidSampleRate(profileSessionSampleRate)) {
    debugBuild.DEBUG_BUILD && core.debug.warn('[Profiling] Discarding profile because of invalid profileSessionSampleRate.');
    return false;
  }

  if (!profileSessionSampleRate) {
    debugBuild.DEBUG_BUILD &&
      core.debug.log('[Profiling] Discarding profile because profileSessionSampleRate is not defined or set to 0');
    return false;
  }

  return Math.random() <= profileSessionSampleRate;
}

/**
 * Checks if legacy profiling is configured.
 */
function hasLegacyProfiling(options) {
  // eslint-disable-next-line deprecation/deprecation
  return typeof options.profilesSampleRate !== 'undefined';
}

/**
 * Creates a profiling envelope item, if the profile does not pass validation, returns null.
 * @param event
 * @returns {Profile | null}
 */
function createProfilingEvent(
  profile_id,
  start_timestamp,
  profile,
  event,
) {
  if (!isValidProfile(profile)) {
    return null;
  }

  return createProfilePayload(profile_id, start_timestamp, profile, event);
}

// TODO (v8): We need to obtain profile ids in @sentry-internal/tracing,
// but we don't have access to this map because importing this map would
// cause a circular dependency. We need to resolve this in v8.
const PROFILE_MAP = new Map();
/**
 *
 */
function getActiveProfilesCount() {
  return PROFILE_MAP.size;
}

/**
 * Retrieves profile from global cache and removes it.
 */
function takeProfileFromGlobalCache(profile_id) {
  const profile = PROFILE_MAP.get(profile_id);
  if (profile) {
    PROFILE_MAP.delete(profile_id);
  }
  return profile;
}
/**
 * Adds profile to global cache and evicts the oldest profile if the cache is full.
 */
function addProfileToGlobalCache(profile_id, profile) {
  PROFILE_MAP.set(profile_id, profile);

  if (PROFILE_MAP.size > 30) {
    const last = PROFILE_MAP.keys().next().value;
    if (last !== undefined) {
      PROFILE_MAP.delete(last);
    }
  }
}

/**
 * Attaches the profiled thread information to the event's trace context.
 */
function attachProfiledThreadToEvent(event) {
  if (!event?.contexts?.profile) {
    return event;
  }

  if (!event.contexts) {
    return event;
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

  // Attach thread info to individual spans so that spans can be associated with the profiled thread on the UI even if contexts are missing.
  event.spans?.forEach(span => {
    span.data = {
      ...(span.data || {}),
      ['thread.id']: PROFILER_THREAD_ID_STRING,
      ['thread.name']: PROFILER_THREAD_NAME,
    };
  });

  return event;
}

exports.MAX_PROFILE_DURATION_MS = MAX_PROFILE_DURATION_MS;
exports.PROFILER_THREAD_ID_STRING = PROFILER_THREAD_ID_STRING;
exports.PROFILER_THREAD_NAME = PROFILER_THREAD_NAME;
exports.addProfileToGlobalCache = addProfileToGlobalCache;
exports.addProfilesToEnvelope = addProfilesToEnvelope;
exports.applyDebugMetadata = applyDebugMetadata;
exports.attachProfiledThreadToEvent = attachProfiledThreadToEvent;
exports.convertJSSelfProfileToSampledFormat = convertJSSelfProfileToSampledFormat;
exports.createProfileChunkPayload = createProfileChunkPayload;
exports.createProfilePayload = createProfilePayload;
exports.createProfilingEvent = createProfilingEvent;
exports.enrichWithThreadInformation = enrichWithThreadInformation;
exports.findProfiledTransactionsFromEnvelope = findProfiledTransactionsFromEnvelope;
exports.getActiveProfilesCount = getActiveProfilesCount;
exports.hasLegacyProfiling = hasLegacyProfiling;
exports.isAutomatedPageLoadSpan = isAutomatedPageLoadSpan;
exports.isValidSampleRate = isValidSampleRate;
exports.shouldProfileSession = shouldProfileSession;
exports.shouldProfileSpanLegacy = shouldProfileSpanLegacy;
exports.startJSSelfProfile = startJSSelfProfile;
exports.takeProfileFromGlobalCache = takeProfileFromGlobalCache;
exports.validateProfileChunk = validateProfileChunk;
//# sourceMappingURL=utils.js.map
