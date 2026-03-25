import { getClient, getCurrentScope } from '../currentScopes.js';
import { DEBUG_BUILD } from '../debug-build.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON } from '../semanticAttributes.js';
import { debug } from '../utils/debug-logger.js';
import { hasSpansEnabled } from '../utils/hasSpansEnabled.js';
import { shouldIgnoreSpan } from '../utils/should-ignore-span.js';
import { _setSpanForScope } from '../utils/spanOnScope.js';
import { getActiveSpan, spanTimeInputToSeconds, getSpanDescendants, spanToJSON, removeChildSpanFromSpan } from '../utils/spanUtils.js';
import { timestampInSeconds } from '../utils/time.js';
import { getDynamicSamplingContextFromSpan, freezeDscOnSpan } from './dynamicSamplingContext.js';
import { SentryNonRecordingSpan } from './sentryNonRecordingSpan.js';
import { SentrySpan } from './sentrySpan.js';
import { SPAN_STATUS_OK, SPAN_STATUS_ERROR } from './spanstatus.js';
import { startInactiveSpan } from './trace.js';

const TRACING_DEFAULTS = {
  idleTimeout: 1000,
  finalTimeout: 30000,
  childSpanTimeout: 15000,
};

const FINISH_REASON_HEARTBEAT_FAILED = 'heartbeatFailed';
const FINISH_REASON_IDLE_TIMEOUT = 'idleTimeout';
const FINISH_REASON_FINAL_TIMEOUT = 'finalTimeout';
const FINISH_REASON_EXTERNAL_FINISH = 'externalFinish';

/**
 * An idle span is a span that automatically finishes. It does this by tracking child spans as activities.
 * An idle span is always the active span.
 */
function startIdleSpan(startSpanOptions, options = {}) {
  // Activities store a list of active spans
  const activities = new Map();

  // We should not use heartbeat if we finished a span
  let _finished = false;

  // Timer that tracks idleTimeout
  let _idleTimeoutID;

  // The reason why the span was finished
  let _finishReason = FINISH_REASON_EXTERNAL_FINISH;

  let _autoFinishAllowed = !options.disableAutoFinish;

  const _cleanupHooks = [];

  const {
    idleTimeout = TRACING_DEFAULTS.idleTimeout,
    finalTimeout = TRACING_DEFAULTS.finalTimeout,
    childSpanTimeout = TRACING_DEFAULTS.childSpanTimeout,
    beforeSpanEnd,
    trimIdleSpanEndTimestamp = true,
  } = options;

  const client = getClient();

  if (!client || !hasSpansEnabled()) {
    const span = new SentryNonRecordingSpan();

    const dsc = {
      sample_rate: '0',
      sampled: 'false',
      ...getDynamicSamplingContextFromSpan(span),
    } ;
    freezeDscOnSpan(span, dsc);

    return span;
  }

  const scope = getCurrentScope();
  const previousActiveSpan = getActiveSpan();
  const span = _startIdleSpan(startSpanOptions);

  // We patch span.end to ensure we can run some things before the span is ended
  // eslint-disable-next-line @typescript-eslint/unbound-method
  span.end = new Proxy(span.end, {
    apply(target, thisArg, args) {
      if (beforeSpanEnd) {
        beforeSpanEnd(span);
      }

      // If the span is non-recording, nothing more to do here...
      // This is the case if tracing is enabled but this specific span was not sampled
      if (thisArg instanceof SentryNonRecordingSpan) {
        return;
      }

      // Just ensuring that this keeps working, even if we ever have more arguments here
      const [definedEndTimestamp, ...rest] = args;
      const timestamp = definedEndTimestamp || timestampInSeconds();
      const spanEndTimestamp = spanTimeInputToSeconds(timestamp);

      // Ensure we end with the last span timestamp, if possible
      const spans = getSpanDescendants(span).filter(child => child !== span);

      const spanJson = spanToJSON(span);

      // If we have no spans, we just end, nothing else to do here
      // Likewise, if users explicitly ended the span, we simply end the span without timestamp adjustment
      if (!spans.length || !trimIdleSpanEndTimestamp) {
        onIdleSpanEnded(spanEndTimestamp);
        return Reflect.apply(target, thisArg, [spanEndTimestamp, ...rest]);
      }

      const ignoreSpans = client.getOptions().ignoreSpans;

      const latestSpanEndTimestamp = spans?.reduce((acc, current) => {
        const currentSpanJson = spanToJSON(current);
        if (!currentSpanJson.timestamp) {
          return acc;
        }
        // Ignored spans will get dropped later (in the client) but since we already adjust
        // the idle span end timestamp here, we can already take to-be-ignored spans out of
        // the calculation here.
        if (ignoreSpans && shouldIgnoreSpan(currentSpanJson, ignoreSpans)) {
          return acc;
        }
        return acc ? Math.max(acc, currentSpanJson.timestamp) : currentSpanJson.timestamp;
      }, undefined);

      // In reality this should always exist here, but type-wise it may be undefined...
      const spanStartTimestamp = spanJson.start_timestamp;

      // The final endTimestamp should:
      // * Never be before the span start timestamp
      // * Be the latestSpanEndTimestamp, if there is one, and it is smaller than the passed span end timestamp
      // * Otherwise be the passed end timestamp
      // Final timestamp can never be after finalTimeout
      const endTimestamp = Math.min(
        spanStartTimestamp ? spanStartTimestamp + finalTimeout / 1000 : Infinity,
        Math.max(spanStartTimestamp || -Infinity, Math.min(spanEndTimestamp, latestSpanEndTimestamp || Infinity)),
      );

      onIdleSpanEnded(endTimestamp);
      return Reflect.apply(target, thisArg, [endTimestamp, ...rest]);
    },
  });

  /**
   * Cancels the existing idle timeout, if there is one.
   */
  function _cancelIdleTimeout() {
    if (_idleTimeoutID) {
      clearTimeout(_idleTimeoutID);
      _idleTimeoutID = undefined;
    }
  }

  /**
   * Restarts idle timeout, if there is no running idle timeout it will start one.
   */
  function _restartIdleTimeout(endTimestamp) {
    _cancelIdleTimeout();
    _idleTimeoutID = setTimeout(() => {
      if (!_finished && activities.size === 0 && _autoFinishAllowed) {
        _finishReason = FINISH_REASON_IDLE_TIMEOUT;
        span.end(endTimestamp);
      }
    }, idleTimeout);
  }

  /**
   * Restarts child span timeout, if there is none running it will start one.
   */
  function _restartChildSpanTimeout(endTimestamp) {
    _idleTimeoutID = setTimeout(() => {
      if (!_finished && _autoFinishAllowed) {
        _finishReason = FINISH_REASON_HEARTBEAT_FAILED;
        span.end(endTimestamp);
      }
    }, childSpanTimeout);
  }

  /**
   * Start tracking a specific activity.
   * @param spanId The span id that represents the activity
   */
  function _pushActivity(spanId) {
    _cancelIdleTimeout();
    activities.set(spanId, true);

    const endTimestamp = timestampInSeconds();
    // We need to add the timeout here to have the real endtimestamp of the idle span
    // Remember timestampInSeconds is in seconds, timeout is in ms
    _restartChildSpanTimeout(endTimestamp + childSpanTimeout / 1000);
  }

  /**
   * Remove an activity from usage
   * @param spanId The span id that represents the activity
   */
  function _popActivity(spanId) {
    if (activities.has(spanId)) {
      activities.delete(spanId);
    }

    if (activities.size === 0) {
      const endTimestamp = timestampInSeconds();
      // We need to add the timeout here to have the real endtimestamp of the idle span
      // Remember timestampInSeconds is in seconds, timeout is in ms
      _restartIdleTimeout(endTimestamp + idleTimeout / 1000);
    }
  }

  function onIdleSpanEnded(endTimestamp) {
    _finished = true;
    activities.clear();

    _cleanupHooks.forEach(cleanup => cleanup());

    _setSpanForScope(scope, previousActiveSpan);

    const spanJSON = spanToJSON(span);

    const { start_timestamp: startTimestamp } = spanJSON;
    // This should never happen, but to make TS happy...
    if (!startTimestamp) {
      return;
    }

    const attributes = spanJSON.data;
    if (!attributes[SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON]) {
      span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON, _finishReason);
    }

    // Set span status to 'ok' if it hasn't been explicitly set to an error status
    const currentStatus = spanJSON.status;
    if (!currentStatus || currentStatus === 'unknown') {
      span.setStatus({ code: SPAN_STATUS_OK });
    }

    debug.log(`[Tracing] Idle span "${spanJSON.op}" finished`);

    const childSpans = getSpanDescendants(span).filter(child => child !== span);

    let discardedSpans = 0;
    childSpans.forEach(childSpan => {
      // We cancel all pending spans with status "cancelled" to indicate the idle span was finished early
      if (childSpan.isRecording()) {
        childSpan.setStatus({ code: SPAN_STATUS_ERROR, message: 'cancelled' });
        childSpan.end(endTimestamp);
        DEBUG_BUILD &&
          debug.log('[Tracing] Cancelling span since span ended early', JSON.stringify(childSpan, undefined, 2));
      }

      const childSpanJSON = spanToJSON(childSpan);
      const { timestamp: childEndTimestamp = 0, start_timestamp: childStartTimestamp = 0 } = childSpanJSON;

      const spanStartedBeforeIdleSpanEnd = childStartTimestamp <= endTimestamp;

      // Add a delta with idle timeout so that we prevent false positives
      const timeoutWithMarginOfError = (finalTimeout + idleTimeout) / 1000;
      const spanEndedBeforeFinalTimeout = childEndTimestamp - childStartTimestamp <= timeoutWithMarginOfError;

      if (DEBUG_BUILD) {
        const stringifiedSpan = JSON.stringify(childSpan, undefined, 2);
        if (!spanStartedBeforeIdleSpanEnd) {
          debug.log('[Tracing] Discarding span since it happened after idle span was finished', stringifiedSpan);
        } else if (!spanEndedBeforeFinalTimeout) {
          debug.log('[Tracing] Discarding span since it finished after idle span final timeout', stringifiedSpan);
        }
      }

      if (!spanEndedBeforeFinalTimeout || !spanStartedBeforeIdleSpanEnd) {
        removeChildSpanFromSpan(span, childSpan);
        discardedSpans++;
      }
    });

    if (discardedSpans > 0) {
      span.setAttribute('sentry.idle_span_discarded_spans', discardedSpans);
    }
  }

  _cleanupHooks.push(
    client.on('spanStart', startedSpan => {
      // If we already finished the idle span,
      // or if this is the idle span itself being started,
      // or if the started span has already been closed,
      // we don't care about it for activity
      if (
        _finished ||
        startedSpan === span ||
        !!spanToJSON(startedSpan).timestamp ||
        (startedSpan instanceof SentrySpan && startedSpan.isStandaloneSpan())
      ) {
        return;
      }

      const allSpans = getSpanDescendants(span);

      // If the span that was just started is a child of the idle span, we should track it
      if (allSpans.includes(startedSpan)) {
        _pushActivity(startedSpan.spanContext().spanId);
      }
    }),
  );

  _cleanupHooks.push(
    client.on('spanEnd', endedSpan => {
      if (_finished) {
        return;
      }

      _popActivity(endedSpan.spanContext().spanId);
    }),
  );

  _cleanupHooks.push(
    client.on('idleSpanEnableAutoFinish', spanToAllowAutoFinish => {
      if (spanToAllowAutoFinish === span) {
        _autoFinishAllowed = true;
        _restartIdleTimeout();

        if (activities.size) {
          _restartChildSpanTimeout();
        }
      }
    }),
  );

  // We only start the initial idle timeout if we are not delaying the auto finish
  if (!options.disableAutoFinish) {
    _restartIdleTimeout();
  }

  setTimeout(() => {
    if (!_finished) {
      span.setStatus({ code: SPAN_STATUS_ERROR, message: 'deadline_exceeded' });
      _finishReason = FINISH_REASON_FINAL_TIMEOUT;
      span.end();
    }
  }, finalTimeout);

  return span;
}

function _startIdleSpan(options) {
  const span = startInactiveSpan(options);

  _setSpanForScope(getCurrentScope(), span);

  DEBUG_BUILD && debug.log('[Tracing] Started span is an idle span');

  return span;
}

export { TRACING_DEFAULTS, startIdleSpan };
//# sourceMappingURL=idleSpan.js.map
