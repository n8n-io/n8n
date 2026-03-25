Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const constants = require('../constants.js');
const currentScopes = require('../currentScopes.js');
const semanticAttributes = require('../semanticAttributes.js');
const baggage = require('../utils/baggage.js');
const dsn = require('../utils/dsn.js');
const hasSpansEnabled = require('../utils/hasSpansEnabled.js');
const object = require('../utils/object.js');
const spanUtils = require('../utils/spanUtils.js');
const utils = require('./utils.js');

/**
 * If you change this value, also update the terser plugin config to
 * avoid minification of the object property!
 */
const FROZEN_DSC_FIELD = '_frozenDsc';

/**
 * Freeze the given DSC on the given span.
 */
function freezeDscOnSpan(span, dsc) {
  const spanWithMaybeDsc = span ;
  object.addNonEnumerableProperty(spanWithMaybeDsc, FROZEN_DSC_FIELD, dsc);
}

/**
 * Creates a dynamic sampling context from a client.
 *
 * Dispatches the `createDsc` lifecycle hook as a side effect.
 */
function getDynamicSamplingContextFromClient(trace_id, client) {
  const options = client.getOptions();

  const { publicKey: public_key } = client.getDsn() || {};

  // Instead of conditionally adding non-undefined values, we add them and then remove them if needed
  // otherwise, the order of baggage entries changes, which "breaks" a bunch of tests etc.
  const dsc = {
    environment: options.environment || constants.DEFAULT_ENVIRONMENT,
    release: options.release,
    public_key,
    trace_id,
    org_id: dsn.extractOrgIdFromClient(client),
  };

  client.emit('createDsc', dsc);

  return dsc;
}

/**
 * Get the dynamic sampling context for the currently active scopes.
 */
function getDynamicSamplingContextFromScope(client, scope) {
  const propagationContext = scope.getPropagationContext();
  return propagationContext.dsc || getDynamicSamplingContextFromClient(propagationContext.traceId, client);
}

/**
 * Creates a dynamic sampling context from a span (and client and scope)
 *
 * @param span the span from which a few values like the root span name and sample rate are extracted.
 *
 * @returns a dynamic sampling context
 */
function getDynamicSamplingContextFromSpan(span) {
  const client = currentScopes.getClient();
  if (!client) {
    return {};
  }

  const rootSpan = spanUtils.getRootSpan(span);
  const rootSpanJson = spanUtils.spanToJSON(rootSpan);
  const rootSpanAttributes = rootSpanJson.data;
  const traceState = rootSpan.spanContext().traceState;

  // The span sample rate that was locally applied to the root span should also always be applied to the DSC, even if the DSC is frozen.
  // This is so that the downstream traces/services can use parentSampleRate in their `tracesSampler` to make consistent sampling decisions across the entire trace.
  const rootSpanSampleRate =
    traceState?.get('sentry.sample_rate') ??
    rootSpanAttributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE] ??
    rootSpanAttributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_PREVIOUS_TRACE_SAMPLE_RATE];

  function applyLocalSampleRateToDsc(dsc) {
    if (typeof rootSpanSampleRate === 'number' || typeof rootSpanSampleRate === 'string') {
      dsc.sample_rate = `${rootSpanSampleRate}`;
    }
    return dsc;
  }

  // For core implementation, we freeze the DSC onto the span as a non-enumerable property
  const frozenDsc = (rootSpan )[FROZEN_DSC_FIELD];
  if (frozenDsc) {
    return applyLocalSampleRateToDsc(frozenDsc);
  }

  // For OpenTelemetry, we freeze the DSC on the trace state
  const traceStateDsc = traceState?.get('sentry.dsc');

  // If the span has a DSC, we want it to take precedence
  const dscOnTraceState = traceStateDsc && baggage.baggageHeaderToDynamicSamplingContext(traceStateDsc);

  if (dscOnTraceState) {
    return applyLocalSampleRateToDsc(dscOnTraceState);
  }

  // Else, we generate it from the span
  const dsc = getDynamicSamplingContextFromClient(span.spanContext().traceId, client);

  // We don't want to have a transaction name in the DSC if the source is "url" because URLs might contain PII
  const source = rootSpanAttributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];

  // after JSON conversion, txn.name becomes jsonSpan.description
  const name = rootSpanJson.description;
  if (source !== 'url' && name) {
    dsc.transaction = name;
  }

  // How can we even land here with hasSpansEnabled() returning false?
  // Otel creates a Non-recording span in Tracing Without Performance mode when handling incoming requests
  // So we end up with an active span that is not sampled (neither positively nor negatively)
  if (hasSpansEnabled.hasSpansEnabled()) {
    dsc.sampled = String(spanUtils.spanIsSampled(rootSpan));
    dsc.sample_rand =
      // In OTEL we store the sample rand on the trace state because we cannot access scopes for NonRecordingSpans
      // The Sentry OTEL SpanSampler takes care of writing the sample rand on the root span
      traceState?.get('sentry.sample_rand') ??
      // On all other platforms we can actually get the scopes from a root span (we use this as a fallback)
      utils.getCapturedScopesOnSpan(rootSpan).scope?.getPropagationContext().sampleRand.toString();
  }

  applyLocalSampleRateToDsc(dsc);

  client.emit('createDsc', dsc, rootSpan);

  return dsc;
}

/**
 * Convert a Span to a baggage header.
 */
function spanToBaggageHeader(span) {
  const dsc = getDynamicSamplingContextFromSpan(span);
  return baggage.dynamicSamplingContextToSentryBaggageHeader(dsc);
}

exports.freezeDscOnSpan = freezeDscOnSpan;
exports.getDynamicSamplingContextFromClient = getDynamicSamplingContextFromClient;
exports.getDynamicSamplingContextFromScope = getDynamicSamplingContextFromScope;
exports.getDynamicSamplingContextFromSpan = getDynamicSamplingContextFromSpan;
exports.spanToBaggageHeader = spanToBaggageHeader;
//# sourceMappingURL=dynamicSamplingContext.js.map
