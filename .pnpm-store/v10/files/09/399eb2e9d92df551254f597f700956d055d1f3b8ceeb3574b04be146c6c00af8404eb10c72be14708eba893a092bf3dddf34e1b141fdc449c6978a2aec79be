import { getAsyncContextStrategy } from '../asyncContext/index.js';
import { getMainCarrier } from '../carrier.js';
import { getCurrentScope } from '../currentScopes.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME, SEMANTIC_ATTRIBUTE_SENTRY_SOURCE } from '../semanticAttributes.js';
import { SPAN_STATUS_UNSET, SPAN_STATUS_OK } from '../tracing/spanstatus.js';
import { getCapturedScopesOnSpan } from '../tracing/utils.js';
import { addNonEnumerableProperty } from './object.js';
import { generateSpanId } from './propagationContext.js';
import { timestampInSeconds } from './time.js';
import { generateSentryTraceHeader, generateTraceparentHeader } from './tracing.js';
import { consoleSandbox } from './debug-logger.js';
import { _getSpanForScope } from './spanOnScope.js';

// These are aligned with OpenTelemetry trace flags
const TRACE_FLAG_NONE = 0x0;
const TRACE_FLAG_SAMPLED = 0x1;

let hasShownSpanDropWarning = false;

/**
 * Convert a span to a trace context, which can be sent as the `trace` context in an event.
 * By default, this will only include trace_id, span_id & parent_span_id.
 * If `includeAllData` is true, it will also include data, op, status & origin.
 */
function spanToTransactionTraceContext(span) {
  const { spanId: span_id, traceId: trace_id } = span.spanContext();
  const { data, op, parent_span_id, status, origin, links } = spanToJSON(span);

  return {
    parent_span_id,
    span_id,
    trace_id,
    data,
    op,
    status,
    origin,
    links,
  };
}

/**
 * Convert a span to a trace context, which can be sent as the `trace` context in a non-transaction event.
 */
function spanToTraceContext(span) {
  const { spanId, traceId: trace_id, isRemote } = span.spanContext();

  // If the span is remote, we use a random/virtual span as span_id to the trace context,
  // and the remote span as parent_span_id
  const parent_span_id = isRemote ? spanId : spanToJSON(span).parent_span_id;
  const scope = getCapturedScopesOnSpan(span).scope;

  const span_id = isRemote ? scope?.getPropagationContext().propagationSpanId || generateSpanId() : spanId;

  return {
    parent_span_id,
    span_id,
    trace_id,
  };
}

/**
 * Convert a Span to a Sentry trace header.
 */
function spanToTraceHeader(span) {
  const { traceId, spanId } = span.spanContext();
  const sampled = spanIsSampled(span);
  return generateSentryTraceHeader(traceId, spanId, sampled);
}

/**
 * Convert a Span to a W3C traceparent header.
 */
function spanToTraceparentHeader(span) {
  const { traceId, spanId } = span.spanContext();
  const sampled = spanIsSampled(span);
  return generateTraceparentHeader(traceId, spanId, sampled);
}

/**
 *  Converts the span links array to a flattened version to be sent within an envelope.
 *
 *  If the links array is empty, it returns `undefined` so the empty value can be dropped before it's sent.
 */
function convertSpanLinksForEnvelope(links) {
  if (links && links.length > 0) {
    return links.map(({ context: { spanId, traceId, traceFlags, ...restContext }, attributes }) => ({
      span_id: spanId,
      trace_id: traceId,
      sampled: traceFlags === TRACE_FLAG_SAMPLED,
      attributes,
      ...restContext,
    }));
  } else {
    return undefined;
  }
}

/**
 * Convert a span time input into a timestamp in seconds.
 */
function spanTimeInputToSeconds(input) {
  if (typeof input === 'number') {
    return ensureTimestampInSeconds(input);
  }

  if (Array.isArray(input)) {
    // See {@link HrTime} for the array-based time format
    return input[0] + input[1] / 1e9;
  }

  if (input instanceof Date) {
    return ensureTimestampInSeconds(input.getTime());
  }

  return timestampInSeconds();
}

/**
 * Converts a timestamp to second, if it was in milliseconds, or keeps it as second.
 */
function ensureTimestampInSeconds(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp / 1000 : timestamp;
}

/**
 * Convert a span to a JSON representation.
 */
// Note: Because of this, we currently have a circular type dependency (which we opted out of in package.json).
// This is not avoidable as we need `spanToJSON` in `spanUtils.ts`, which in turn is needed by `span.ts` for backwards compatibility.
// And `spanToJSON` needs the Span class from `span.ts` to check here.
function spanToJSON(span) {
  if (spanIsSentrySpan(span)) {
    return span.getSpanJSON();
  }

  const { spanId: span_id, traceId: trace_id } = span.spanContext();

  // Handle a span from @opentelemetry/sdk-base-trace's `Span` class
  if (spanIsOpenTelemetrySdkTraceBaseSpan(span)) {
    const { attributes, startTime, name, endTime, status, links } = span;

    // In preparation for the next major of OpenTelemetry, we want to support
    // looking up the parent span id according to the new API
    // In OTel v1, the parent span id is accessed as `parentSpanId`
    // In OTel v2, the parent span id is accessed as `spanId` on the `parentSpanContext`
    const parentSpanId =
      'parentSpanId' in span
        ? span.parentSpanId
        : 'parentSpanContext' in span
          ? (span.parentSpanContext )?.spanId
          : undefined;

    return {
      span_id,
      trace_id,
      data: attributes,
      description: name,
      parent_span_id: parentSpanId,
      start_timestamp: spanTimeInputToSeconds(startTime),
      // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
      timestamp: spanTimeInputToSeconds(endTime) || undefined,
      status: getStatusMessage(status),
      op: attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
      origin: attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ,
      links: convertSpanLinksForEnvelope(links),
    };
  }

  // Finally, at least we have `spanContext()`....
  // This should not actually happen in reality, but we need to handle it for type safety.
  return {
    span_id,
    trace_id,
    start_timestamp: 0,
    data: {},
  };
}

function spanIsOpenTelemetrySdkTraceBaseSpan(span) {
  const castSpan = span ;
  return !!castSpan.attributes && !!castSpan.startTime && !!castSpan.name && !!castSpan.endTime && !!castSpan.status;
}

/** Exported only for tests. */

/**
 * Sadly, due to circular dependency checks we cannot actually import the Span class here and check for instanceof.
 * :( So instead we approximate this by checking if it has the `getSpanJSON` method.
 */
function spanIsSentrySpan(span) {
  return typeof (span ).getSpanJSON === 'function';
}

/**
 * Returns true if a span is sampled.
 * In most cases, you should just use `span.isRecording()` instead.
 * However, this has a slightly different semantic, as it also returns false if the span is finished.
 * So in the case where this distinction is important, use this method.
 */
function spanIsSampled(span) {
  // We align our trace flags with the ones OpenTelemetry use
  // So we also check for sampled the same way they do.
  const { traceFlags } = span.spanContext();
  return traceFlags === TRACE_FLAG_SAMPLED;
}

/** Get the status message to use for a JSON representation of a span. */
function getStatusMessage(status) {
  if (!status || status.code === SPAN_STATUS_UNSET) {
    return undefined;
  }

  if (status.code === SPAN_STATUS_OK) {
    return 'ok';
  }

  return status.message || 'internal_error';
}

const CHILD_SPANS_FIELD = '_sentryChildSpans';
const ROOT_SPAN_FIELD = '_sentryRootSpan';

/**
 * Adds an opaque child span reference to a span.
 */
function addChildSpanToSpan(span, childSpan) {
  // We store the root span reference on the child span
  // We need this for `getRootSpan()` to work
  const rootSpan = span[ROOT_SPAN_FIELD] || span;
  addNonEnumerableProperty(childSpan , ROOT_SPAN_FIELD, rootSpan);

  // We store a list of child spans on the parent span
  // We need this for `getSpanDescendants()` to work
  if (span[CHILD_SPANS_FIELD]) {
    span[CHILD_SPANS_FIELD].add(childSpan);
  } else {
    addNonEnumerableProperty(span, CHILD_SPANS_FIELD, new Set([childSpan]));
  }
}

/** This is only used internally by Idle Spans. */
function removeChildSpanFromSpan(span, childSpan) {
  if (span[CHILD_SPANS_FIELD]) {
    span[CHILD_SPANS_FIELD].delete(childSpan);
  }
}

/**
 * Returns an array of the given span and all of its descendants.
 */
function getSpanDescendants(span) {
  const resultSet = new Set();

  function addSpanChildren(span) {
    // This exit condition is required to not infinitely loop in case of a circular dependency.
    if (resultSet.has(span)) {
      return;
      // We want to ignore unsampled spans (e.g. non recording spans)
    } else if (spanIsSampled(span)) {
      resultSet.add(span);
      const childSpans = span[CHILD_SPANS_FIELD] ? Array.from(span[CHILD_SPANS_FIELD]) : [];
      for (const childSpan of childSpans) {
        addSpanChildren(childSpan);
      }
    }
  }

  addSpanChildren(span);

  return Array.from(resultSet);
}

/**
 * Returns the root span of a given span.
 */
function getRootSpan(span) {
  return span[ROOT_SPAN_FIELD] || span;
}

/**
 * Returns the currently active span.
 */
function getActiveSpan() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  if (acs.getActiveSpan) {
    return acs.getActiveSpan();
  }

  return _getSpanForScope(getCurrentScope());
}

/**
 * Logs a warning once if `beforeSendSpan` is used to drop spans.
 */
function showSpanDropWarning() {
  if (!hasShownSpanDropWarning) {
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn(
        '[Sentry] Returning null from `beforeSendSpan` is disallowed. To drop certain spans, configure the respective integrations directly or use `ignoreSpans`.',
      );
    });
    hasShownSpanDropWarning = true;
  }
}

/**
 * Updates the name of the given span and ensures that the span name is not
 * overwritten by the Sentry SDK.
 *
 * Use this function instead of `span.updateName()` if you want to make sure that
 * your name is kept. For some spans, for example root `http.server` spans the
 * Sentry SDK would otherwise overwrite the span name with a high-quality name
 * it infers when the span ends.
 *
 * Use this function in server code or when your span is started on the server
 * and on the client (browser). If you only update a span name on the client,
 * you can also use `span.updateName()` the SDK does not overwrite the name.
 *
 * @param span - The span to update the name of.
 * @param name - The name to set on the span.
 */
function updateSpanName(span, name) {
  span.updateName(name);
  span.setAttributes({
    [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
    [SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME]: name,
  });
}

export { TRACE_FLAG_NONE, TRACE_FLAG_SAMPLED, addChildSpanToSpan, convertSpanLinksForEnvelope, getActiveSpan, getRootSpan, getSpanDescendants, getStatusMessage, removeChildSpanFromSpan, showSpanDropWarning, spanIsSampled, spanTimeInputToSeconds, spanToJSON, spanToTraceContext, spanToTraceHeader, spanToTraceparentHeader, spanToTransactionTraceContext, updateSpanName };
//# sourceMappingURL=spanUtils.js.map
