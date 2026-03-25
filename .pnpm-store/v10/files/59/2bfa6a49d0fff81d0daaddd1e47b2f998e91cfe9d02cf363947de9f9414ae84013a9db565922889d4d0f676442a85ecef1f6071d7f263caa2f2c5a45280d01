import { generateTraceId, generateSpanId } from '../utils/propagationContext.js';
import { TRACE_FLAG_NONE } from '../utils/spanUtils.js';

/**
 * A Sentry Span that is non-recording, meaning it will not be sent to Sentry.
 */
class SentryNonRecordingSpan  {

   constructor(spanContext = {}) {
    this._traceId = spanContext.traceId || generateTraceId();
    this._spanId = spanContext.spanId || generateSpanId();
  }

  /** @inheritdoc */
   spanContext() {
    return {
      spanId: this._spanId,
      traceId: this._traceId,
      traceFlags: TRACE_FLAG_NONE,
    };
  }

  /** @inheritdoc */
   end(_timestamp) {}

  /** @inheritdoc */
   setAttribute(_key, _value) {
    return this;
  }

  /** @inheritdoc */
   setAttributes(_values) {
    return this;
  }

  /** @inheritdoc */
   setStatus(_status) {
    return this;
  }

  /** @inheritdoc */
   updateName(_name) {
    return this;
  }

  /** @inheritdoc */
   isRecording() {
    return false;
  }

  /** @inheritdoc */
   addEvent(
    _name,
    _attributesOrStartTime,
    _startTime,
  ) {
    return this;
  }

  /** @inheritDoc */
   addLink(_link) {
    return this;
  }

  /** @inheritDoc */
   addLinks(_links) {
    return this;
  }

  /**
   * This should generally not be used,
   * but we need it for being compliant with the OTEL Span interface.
   *
   * @hidden
   * @internal
   */
   recordException(_exception, _time) {
    // noop
  }
}

export { SentryNonRecordingSpan };
//# sourceMappingURL=sentryNonRecordingSpan.js.map
