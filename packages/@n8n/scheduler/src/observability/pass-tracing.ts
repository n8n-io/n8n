import { SpanStatus, type Span, type SpanOptions, type Tracer } from './tracer';
import { PASS_TIMED_OUT } from '../core/lifecycle';

/**
 * Wraps one scheduler pass (materialize, claim, reap, retention) in a tracing
 * span, so the pass code itself contains no tracing calls.
 *
 * If the pass throws (e.g. the materializer when it is aborted), the error
 * propagates and the tracer marks the span as errored.
 *
 * @param tracer - The host's tracer (or a no-op when the host traces nothing).
 * @param options - Name, operation and fixed attributes of the span.
 * @param run - The pass to run on every tick.
 * @param attributesFrom - Picks which fields of the pass result to record on the span.
 * @returns The pass wrapped in the span, with the same signature as `run`.
 */
export function tracePass<T>(
	tracer: Tracer,
	options: SpanOptions,
	run: (signal?: AbortSignal) => Promise<T>,
	attributesFrom: (result: T) => Record<string, string | number | boolean>,
): (signal?: AbortSignal) => Promise<T> {
	return async (signal?: AbortSignal) =>
		await tracer.startSpan(options, async (span) => {
			const result = await run(signal);
			for (const [key, value] of Object.entries(attributesFrom(result))) {
				span.setAttribute(key, value);
			}
			settlePassSpan(span, signal);
			return result;
		});
}

/**
 * Chooses the final status of a pass span.
 *
 * A pass that runs past its timeout is aborted with PASS_TIMED_OUT and
 * returns early instead of throwing, so without this check its span would
 * close as ok while the loop reports a timeout. So: a timed-out pass records
 * an error; a normal completion or a graceful shutdown records ok.
 */
function settlePassSpan(span: Span, signal?: AbortSignal): void {
	if (signal?.aborted === true && signal.reason === PASS_TIMED_OUT) {
		span.setStatus({ code: SpanStatus.error, message: 'Scheduler pass timed out' });
	} else {
		span.setStatus({ code: SpanStatus.ok });
	}
}
