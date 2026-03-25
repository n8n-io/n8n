Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../debug-build.js');
const debugLogger = require('../utils/debug-logger.js');
const hasSpansEnabled = require('../utils/hasSpansEnabled.js');
const parseSampleRate = require('../utils/parseSampleRate.js');

/**
 * Makes a sampling decision for the given options.
 *
 * Called every time a root span is created. Only root spans which emerge with a `sampled` value of `true` will be
 * sent to Sentry.
 */
function sampleSpan(
  options,
  samplingContext,
  sampleRand,
) {
  // nothing to do if span recording is not enabled
  if (!hasSpansEnabled.hasSpansEnabled(options)) {
    return [false];
  }

  let localSampleRateWasApplied = undefined;

  // we would have bailed already if neither `tracesSampler` nor `tracesSampleRate` were defined, so one of these should
  // work; prefer the hook if so
  let sampleRate;
  if (typeof options.tracesSampler === 'function') {
    sampleRate = options.tracesSampler({
      ...samplingContext,
      inheritOrSampleWith: fallbackSampleRate => {
        // If we have an incoming parent sample rate, we'll just use that one.
        // The sampling decision will be inherited because of the sample_rand that was generated when the trace reached the incoming boundaries of the SDK.
        if (typeof samplingContext.parentSampleRate === 'number') {
          return samplingContext.parentSampleRate;
        }

        // Fallback if parent sample rate is not on the incoming trace (e.g. if there is no baggage)
        // This is to provide backwards compatibility if there are incoming traces from older SDKs that don't send a parent sample rate or a sample rand. In these cases we just want to force either a sampling decision on the downstream traces via the sample rate.
        if (typeof samplingContext.parentSampled === 'boolean') {
          return Number(samplingContext.parentSampled);
        }

        return fallbackSampleRate;
      },
    });
    localSampleRateWasApplied = true;
  } else if (samplingContext.parentSampled !== undefined) {
    sampleRate = samplingContext.parentSampled;
  } else if (typeof options.tracesSampleRate !== 'undefined') {
    sampleRate = options.tracesSampleRate;
    localSampleRateWasApplied = true;
  }

  // Since this is coming from the user (or from a function provided by the user), who knows what we might get.
  // (The only valid values are booleans or numbers between 0 and 1.)
  const parsedSampleRate = parseSampleRate.parseSampleRate(sampleRate);

  if (parsedSampleRate === undefined) {
    debugBuild.DEBUG_BUILD &&
      debugLogger.debug.warn(
        `[Tracing] Discarding root span because of invalid sample rate. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
          sampleRate,
        )} of type ${JSON.stringify(typeof sampleRate)}.`,
      );
    return [false];
  }

  // if the function returned 0 (or false), or if `tracesSampleRate` is 0, it's a sign the transaction should be dropped
  if (!parsedSampleRate) {
    debugBuild.DEBUG_BUILD &&
      debugLogger.debug.log(
        `[Tracing] Discarding transaction because ${
          typeof options.tracesSampler === 'function'
            ? 'tracesSampler returned 0 or false'
            : 'a negative sampling decision was inherited or tracesSampleRate is set to 0'
        }`,
      );
    return [false, parsedSampleRate, localSampleRateWasApplied];
  }

  // We always compare the sample rand for the current execution context against the chosen sample rate.
  // Read more: https://develop.sentry.dev/sdk/telemetry/traces/#propagated-random-value
  const shouldSample = sampleRand < parsedSampleRate;

  // if we're not going to keep it, we're done
  if (!shouldSample) {
    debugBuild.DEBUG_BUILD &&
      debugLogger.debug.log(
        `[Tracing] Discarding transaction because it's not included in the random sample (sampling rate = ${Number(
          sampleRate,
        )})`,
      );
  }

  return [shouldSample, parsedSampleRate, localSampleRateWasApplied];
}

exports.sampleSpan = sampleSpan;
//# sourceMappingURL=sampling.js.map
