import { Span, SpanContext, Tracer } from '@opentelemetry/api';

/**
 * Tracer implementation that does nothing (null object).
 */
export const noopTracer: Tracer = {
  startSpan(): Span {
    return noopSpan;
  },

  startActiveSpan<F extends (span: Span) => unknown>(
    name: unknown,
    arg1: unknown,
    arg2?: unknown,
    arg3?: F,
  ): ReturnType<any> {
    if (typeof arg1 === 'function') {
      return arg1(noopSpan);
    }
    if (typeof arg2 === 'function') {
      return arg2(noopSpan);
    }
    if (typeof arg3 === 'function') {
      return arg3(noopSpan);
    }
  },
};

const noopSpan: Span = {
  spanContext() {
    return noopSpanContext;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  },
};

const noopSpanContext: SpanContext = {
  traceId: '',
  spanId: '',
  traceFlags: 0,
};
