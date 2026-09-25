import type { Tracer } from '@n8n/scheduler';
import type { Tracing } from 'n8n-core';

/**
 * Adapts n8n's Sentry-backed {@link Tracing} to the scheduler package's minimal
 * {@link Tracer} port. The `newTrace` flag routes a span to a fresh trace instead
 * of parenting under whatever span is active on the calling async context (see
 * `SpanOptions.newTrace`); every other span parents normally.
 *
 * Shared by the run side (`DurableScheduler`) and the write side
 * (`DurableJobProvisioner`) so both report through the same adapter.
 */
export function createSchedulerTracer(tracing: Tracing): Tracer {
	return {
		startSpan: async ({ newTrace, ...options }, run) =>
			await (newTrace === true
				? tracing.startNewTraceSpan(options, run)
				: tracing.startSpan(options, run)),
	};
}
