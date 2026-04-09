import {
  Attributes,
  Span,
  Tracer,
  SpanStatusCode,
  context,
} from '@opentelemetry/api';

export async function recordSpan<T>({
  name,
  tracer,
  attributes,
  fn,
  endWhenDone = true,
}: {
  name: string;
  tracer: Tracer;
  attributes: Attributes | PromiseLike<Attributes>;
  fn: (span: Span) => Promise<T>;
  endWhenDone?: boolean;
}) {
  return tracer.startActiveSpan(
    name,
    { attributes: await attributes },
    async span => {
      // Capture the current context to maintain it across async generator yields
      const ctx = context.active();

      try {
        // Execute within the captured context to ensure async generators
        // don't lose the active span when they yield
        const result = await context.with(ctx, () => fn(span));

        if (endWhenDone) {
          span.end();
        }

        return result;
      } catch (error) {
        try {
          recordErrorOnSpan(span, error);
        } finally {
          // always stop the span when there is an error:
          span.end();
        }

        throw error;
      }
    },
  );
}

/**
 * Record an error on a span. Sets the span status to error. If the error is
 * an instance of Error, an exception event with name, message, and stack
 * will also be recorded.
 *
 * @param span - The span to record the error on.
 * @param error - The error to record on the span.
 */
export function recordErrorOnSpan(span: Span, error: unknown) {
  if (error instanceof Error) {
    span.recordException({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  } else {
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
}
