import { getClient, getCurrentScope } from '../currentScopes.js';
import { DEBUG_BUILD } from '../debug-build.js';
import { createSpanEnvelope } from '../envelope.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME, SEMANTIC_ATTRIBUTE_PROFILE_ID, SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME } from '../semanticAttributes.js';
import { debug } from '../utils/debug-logger.js';
import { generateTraceId, generateSpanId } from '../utils/propagationContext.js';
import { TRACE_FLAG_SAMPLED, TRACE_FLAG_NONE, spanTimeInputToSeconds, convertSpanLinksForEnvelope, getRootSpan, getStatusMessage, spanToJSON, getSpanDescendants, spanToTransactionTraceContext } from '../utils/spanUtils.js';
import { timestampInSeconds } from '../utils/time.js';
import { getDynamicSamplingContextFromSpan } from './dynamicSamplingContext.js';
import { logSpanEnd } from './logSpans.js';
import { timedEventsToMeasurements } from './measurement.js';
import { getCapturedScopesOnSpan } from './utils.js';

const MAX_SPAN_COUNT = 1000;

/**
 * Span contains all data about a span
 */
class SentrySpan  {

  /** Epoch timestamp in seconds when the span started. */

  /** Epoch timestamp in seconds when the span ended. */

  /** Internal keeper of the status */

  /** The timed events added to this span. */

  /** if true, treat span as a standalone span (not part of a transaction) */

  /**
   * You should never call the constructor manually, always use `Sentry.startSpan()`
   * or other span methods.
   * @internal
   * @hideconstructor
   * @hidden
   */
   constructor(spanContext = {}) {
    this._traceId = spanContext.traceId || generateTraceId();
    this._spanId = spanContext.spanId || generateSpanId();
    this._startTime = spanContext.startTimestamp || timestampInSeconds();
    this._links = spanContext.links;

    this._attributes = {};
    this.setAttributes({
      [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'manual',
      [SEMANTIC_ATTRIBUTE_SENTRY_OP]: spanContext.op,
      ...spanContext.attributes,
    });

    this._name = spanContext.name;

    if (spanContext.parentSpanId) {
      this._parentSpanId = spanContext.parentSpanId;
    }
    // We want to include booleans as well here
    if ('sampled' in spanContext) {
      this._sampled = spanContext.sampled;
    }
    if (spanContext.endTimestamp) {
      this._endTime = spanContext.endTimestamp;
    }

    this._events = [];

    this._isStandaloneSpan = spanContext.isStandalone;

    // If the span is already ended, ensure we finalize the span immediately
    if (this._endTime) {
      this._onSpanEnded();
    }
  }

  /** @inheritDoc */
   addLink(link) {
    if (this._links) {
      this._links.push(link);
    } else {
      this._links = [link];
    }
    return this;
  }

  /** @inheritDoc */
   addLinks(links) {
    if (this._links) {
      this._links.push(...links);
    } else {
      this._links = links;
    }
    return this;
  }

  /**
   * This should generally not be used,
   * but it is needed for being compliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   recordException(_exception, _time) {
    // noop
  }

  /** @inheritdoc */
   spanContext() {
    const { _spanId: spanId, _traceId: traceId, _sampled: sampled } = this;
    return {
      spanId,
      traceId,
      traceFlags: sampled ? TRACE_FLAG_SAMPLED : TRACE_FLAG_NONE,
    };
  }

  /** @inheritdoc */
   setAttribute(key, value) {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._attributes[key];
    } else {
      this._attributes[key] = value;
    }

    return this;
  }

  /** @inheritdoc */
   setAttributes(attributes) {
    Object.keys(attributes).forEach(key => this.setAttribute(key, attributes[key]));
    return this;
  }

  /**
   * This should generally not be used,
   * but we need it for browser tracing where we want to adjust the start time afterwards.
   * USE THIS WITH CAUTION!
   *
   * @hidden
   * @internal
   */
   updateStartTime(timeInput) {
    this._startTime = spanTimeInputToSeconds(timeInput);
  }

  /**
   * @inheritDoc
   */
   setStatus(value) {
    this._status = value;
    return this;
  }

  /**
   * @inheritDoc
   */
   updateName(name) {
    this._name = name;
    this.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'custom');
    return this;
  }

  /** @inheritdoc */
   end(endTimestamp) {
    // If already ended, skip
    if (this._endTime) {
      return;
    }

    this._endTime = spanTimeInputToSeconds(endTimestamp);
    logSpanEnd(this);

    this._onSpanEnded();
  }

  /**
   * Get JSON representation of this span.
   *
   * @hidden
   * @internal This method is purely for internal purposes and should not be used outside
   * of SDK code. If you need to get a JSON representation of a span,
   * use `spanToJSON(span)` instead.
   */
   getSpanJSON() {
    return {
      data: this._attributes,
      description: this._name,
      op: this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
      parent_span_id: this._parentSpanId,
      span_id: this._spanId,
      start_timestamp: this._startTime,
      status: getStatusMessage(this._status),
      timestamp: this._endTime,
      trace_id: this._traceId,
      origin: this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ,
      profile_id: this._attributes[SEMANTIC_ATTRIBUTE_PROFILE_ID] ,
      exclusive_time: this._attributes[SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME] ,
      measurements: timedEventsToMeasurements(this._events),
      is_segment: (this._isStandaloneSpan && getRootSpan(this) === this) || undefined,
      segment_id: this._isStandaloneSpan ? getRootSpan(this).spanContext().spanId : undefined,
      links: convertSpanLinksForEnvelope(this._links),
    };
  }

  /** @inheritdoc */
   isRecording() {
    return !this._endTime && !!this._sampled;
  }

  /**
   * @inheritdoc
   */
   addEvent(
    name,
    attributesOrStartTime,
    startTime,
  ) {
    DEBUG_BUILD && debug.log('[Tracing] Adding an event to span:', name);

    const time = isSpanTimeInput(attributesOrStartTime) ? attributesOrStartTime : startTime || timestampInSeconds();
    const attributes = isSpanTimeInput(attributesOrStartTime) ? {} : attributesOrStartTime || {};

    const event = {
      name,
      time: spanTimeInputToSeconds(time),
      attributes,
    };

    this._events.push(event);

    return this;
  }

  /**
   * This method should generally not be used,
   * but for now we need a way to publicly check if the `_isStandaloneSpan` flag is set.
   * USE THIS WITH CAUTION!
   * @internal
   * @hidden
   * @experimental
   */
   isStandaloneSpan() {
    return !!this._isStandaloneSpan;
  }

  /** Emit `spanEnd` when the span is ended. */
   _onSpanEnded() {
    const client = getClient();
    if (client) {
      client.emit('spanEnd', this);
    }

    // A segment span is basically the root span of a local span tree.
    // So for now, this is either what we previously refer to as the root span,
    // or a standalone span.
    const isSegmentSpan = this._isStandaloneSpan || this === getRootSpan(this);

    if (!isSegmentSpan) {
      return;
    }

    // if this is a standalone span, we send it immediately
    if (this._isStandaloneSpan) {
      if (this._sampled) {
        sendSpanEnvelope(createSpanEnvelope([this], client));
      } else {
        DEBUG_BUILD &&
          debug.log('[Tracing] Discarding standalone span because its trace was not chosen to be sampled.');
        if (client) {
          client.recordDroppedEvent('sample_rate', 'span');
        }
      }
      return;
    }

    const transactionEvent = this._convertSpanToTransaction();
    if (transactionEvent) {
      const scope = getCapturedScopesOnSpan(this).scope || getCurrentScope();
      scope.captureEvent(transactionEvent);
    }
  }

  /**
   * Finish the transaction & prepare the event to send to Sentry.
   */
   _convertSpanToTransaction() {
    // We can only convert finished spans
    if (!isFullFinishedSpan(spanToJSON(this))) {
      return undefined;
    }

    if (!this._name) {
      DEBUG_BUILD && debug.warn('Transaction has no name, falling back to `<unlabeled transaction>`.');
      this._name = '<unlabeled transaction>';
    }

    const { scope: capturedSpanScope, isolationScope: capturedSpanIsolationScope } = getCapturedScopesOnSpan(this);

    const normalizedRequest = capturedSpanScope?.getScopeData().sdkProcessingMetadata?.normalizedRequest;

    if (this._sampled !== true) {
      return undefined;
    }

    // The transaction span itself as well as any potential standalone spans should be filtered out
    const finishedSpans = getSpanDescendants(this).filter(span => span !== this && !isStandaloneSpan(span));

    const spans = finishedSpans.map(span => spanToJSON(span)).filter(isFullFinishedSpan);

    const source = this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];

    // remove internal root span attributes we don't need to send.
    /* eslint-disable @typescript-eslint/no-dynamic-delete */
    delete this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
    spans.forEach(span => {
      delete span.data[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
    });
    // eslint-enabled-next-line @typescript-eslint/no-dynamic-delete

    const transaction = {
      contexts: {
        trace: spanToTransactionTraceContext(this),
      },
      spans:
        // spans.sort() mutates the array, but `spans` is already a copy so we can safely do this here
        // we do not use spans anymore after this point
        spans.length > MAX_SPAN_COUNT
          ? spans.sort((a, b) => a.start_timestamp - b.start_timestamp).slice(0, MAX_SPAN_COUNT)
          : spans,
      start_timestamp: this._startTime,
      timestamp: this._endTime,
      transaction: this._name,
      type: 'transaction',
      sdkProcessingMetadata: {
        capturedSpanScope,
        capturedSpanIsolationScope,
        dynamicSamplingContext: getDynamicSamplingContextFromSpan(this),
      },
      request: normalizedRequest,
      ...(source && {
        transaction_info: {
          source,
        },
      }),
    };

    const measurements = timedEventsToMeasurements(this._events);
    const hasMeasurements = measurements && Object.keys(measurements).length;

    if (hasMeasurements) {
      DEBUG_BUILD &&
        debug.log(
          '[Measurements] Adding measurements to transaction event',
          JSON.stringify(measurements, undefined, 2),
        );
      transaction.measurements = measurements;
    }

    return transaction;
  }
}

function isSpanTimeInput(value) {
  return (value && typeof value === 'number') || value instanceof Date || Array.isArray(value);
}

// We want to filter out any incomplete SpanJSON objects
function isFullFinishedSpan(input) {
  return !!input.start_timestamp && !!input.timestamp && !!input.span_id && !!input.trace_id;
}

/** `SentrySpan`s can be sent as a standalone span rather than belonging to a transaction */
function isStandaloneSpan(span) {
  return span instanceof SentrySpan && span.isStandaloneSpan();
}

/**
 * Sends a `SpanEnvelope`.
 *
 * Note: If the envelope's spans are dropped, e.g. via `beforeSendSpan`,
 * the envelope will not be sent either.
 */
function sendSpanEnvelope(envelope) {
  const client = getClient();
  if (!client) {
    return;
  }

  const spanItems = envelope[1];
  if (!spanItems || spanItems.length === 0) {
    client.recordDroppedEvent('before_send', 'span');
    return;
  }

  // sendEnvelope should not throw
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  client.sendEnvelope(envelope);
}

export { SentrySpan };
//# sourceMappingURL=sentrySpan.js.map
