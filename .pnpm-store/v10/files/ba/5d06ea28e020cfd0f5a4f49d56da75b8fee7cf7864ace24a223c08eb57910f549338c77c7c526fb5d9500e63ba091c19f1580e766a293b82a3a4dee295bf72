Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const index = require('../asyncContext/index.js');
const carrier = require('../carrier.js');
const currentScopes = require('../currentScopes.js');
const _exports = require('../exports.js');
const debugLogger = require('./debug-logger.js');
const spanUtils = require('./spanUtils.js');
const dynamicSamplingContext = require('../tracing/dynamicSamplingContext.js');
const baggage = require('./baggage.js');
const tracing = require('./tracing.js');

/**
 * Extracts trace propagation data from the current span or from the client's scope (via transaction or propagation
 * context) and serializes it to `sentry-trace` and `baggage` values. These values can be used to propagate
 * a trace via our tracing Http headers or Html `<meta>` tags.
 *
 * This function also applies some validation to the generated sentry-trace and baggage values to ensure that
 * only valid strings are returned.
 *
 * If (@param options.propagateTraceparent) is `true`, the function will also generate a `traceparent` value,
 * following the W3C traceparent header format.
 *
 * @returns an object with the tracing data values. The object keys are the name of the tracing key to be used as header
 * or meta tag name.
 */
function getTraceData(
  options = {},
) {
  const client = options.client || currentScopes.getClient();
  if (!_exports.isEnabled() || !client) {
    return {};
  }

  const carrier$1 = carrier.getMainCarrier();
  const acs = index.getAsyncContextStrategy(carrier$1);
  if (acs.getTraceData) {
    return acs.getTraceData(options);
  }

  const scope = options.scope || currentScopes.getCurrentScope();
  const span = options.span || spanUtils.getActiveSpan();
  const sentryTrace = span ? spanUtils.spanToTraceHeader(span) : scopeToTraceHeader(scope);
  const dsc = span ? dynamicSamplingContext.getDynamicSamplingContextFromSpan(span) : dynamicSamplingContext.getDynamicSamplingContextFromScope(client, scope);
  const baggage$1 = baggage.dynamicSamplingContextToSentryBaggageHeader(dsc);

  const isValidSentryTraceHeader = tracing.TRACEPARENT_REGEXP.test(sentryTrace);
  if (!isValidSentryTraceHeader) {
    debugLogger.debug.warn('Invalid sentry-trace data. Cannot generate trace data');
    return {};
  }

  const traceData = {
    'sentry-trace': sentryTrace,
    baggage: baggage$1,
  };

  if (options.propagateTraceparent) {
    traceData.traceparent = span ? spanUtils.spanToTraceparentHeader(span) : scopeToTraceparentHeader(scope);
  }

  return traceData;
}

/**
 * Get a sentry-trace header value for the given scope.
 */
function scopeToTraceHeader(scope) {
  const { traceId, sampled, propagationSpanId } = scope.getPropagationContext();
  return tracing.generateSentryTraceHeader(traceId, propagationSpanId, sampled);
}

function scopeToTraceparentHeader(scope) {
  const { traceId, sampled, propagationSpanId } = scope.getPropagationContext();
  return tracing.generateTraceparentHeader(traceId, propagationSpanId, sampled);
}

exports.getTraceData = getTraceData;
//# sourceMappingURL=traceData.js.map
