import type { SpanJSON, TracesSamplerSamplingContext, TransactionEvent } from '@sentry/core';

/**
 * Express auto-instrumentation span ops whose duration only mirrors the
 * handler, so they carry no independent signal. Dropped wholesale.
 */
const DROPPED_EXPRESS_OPS = new Set([
	'middleware.express',
	'router.express',
	'request_handler.express',
]);

/** High-volume auto-instrumentation ops kept only when slow or errored. */
const DURATION_FILTERED_OPS = new Set(['db', 'http.client']);

/** Near-zero sample rate for high-frequency, low-value poll-trigger transactions. */
const POLL_TRIGGER_SAMPLE_RATE = 0.001;

/** Fallback slow-span threshold (ms) when a caller doesn't configure one. */
export const DEFAULT_SLOW_SPAN_THRESHOLD_MS = 1000;

/** A span errored unless Sentry explicitly marked it ok. */
function isErrored(status: SpanJSON['status']): boolean {
	return status !== undefined && status !== 'ok';
}

/** Whether a child span should survive filtering. */
function shouldKeepSpan(span: SpanJSON, slowSpanThresholdMs: number): boolean {
	const { op, timestamp, start_timestamp: startTimestamp } = span;

	if (op && DROPPED_EXPRESS_OPS.has(op)) return false;

	if (op && DURATION_FILTERED_OPS.has(op) && timestamp !== undefined) {
		const durationMs = (timestamp - startTimestamp) * 1000;
		if (durationMs < slowSpanThresholdMs && !isErrored(span.status)) return false;
	}

	return true;
}

function reparentChildSpans(
	spans: SpanJSON[],
	droppedSpan: SpanJSON,
	fallbackParentSpanId?: string,
): void {
	const parentSpanId = droppedSpan.parent_span_id ?? fallbackParentSpanId;
	if (!parentSpanId) return;

	for (const span of spans) {
		if (span.parent_span_id === droppedSpan.span_id) {
			span.parent_span_id = parentSpanId;
		}
	}
}

/**
 * Filters noise before Sentry sends a transaction:
 * - Drops transactions rooted on a `db` operation wholesale (DB queries/pool connects
 *   that became roots outside any request/job span — high volume, no signal).
 * - Express middleware/router/handler child spans wholesale.
 * - Fast, non-errored `db`/`http.client` child spans (below `slowSpanThresholdMs`).
 *
 * Kept descendants of dropped child spans are reparented.
 */
export function buildBeforeSendTransaction(slowSpanThresholdMs: number) {
	return (event: TransactionEvent): TransactionEvent | null => {
		// DB operations (queries, pool connects) get op `db`. A `db`-rooted transaction
		// ran outside any request/job span — high volume, no signal. Child db spans under
		// real transactions keep a non-`db` root op, so they are untouched.
		if (event.contexts?.trace?.op === 'db') return null;

		if (event.spans) {
			const spans = event.spans;
			event.spans = spans.filter((span) => {
				const keep = shouldKeepSpan(span, slowSpanThresholdMs);
				if (!keep) reparentChildSpans(spans, span, event.contexts?.trace?.span_id);
				return keep;
			});
		}
		return event;
	};
}

/**
 * Builds a Sentry `tracesSampler` that head-samples by transaction type:
 * `baseRate` for meaningful transactions, near-zero for high-frequency
 * poll-trigger transactions.
 */
export function buildTracesSampler(baseRate: number) {
	return (samplingContext: TracesSamplerSamplingContext): number => {
		const effectiveBaseRate = samplingContext.inheritOrSampleWith(baseRate);
		if (samplingContext.attributes?.['sentry.op'] === 'trigger.poll') {
			return Math.min(effectiveBaseRate, POLL_TRIGGER_SAMPLE_RATE);
		}
		return effectiveBaseRate;
	};
}
