import type { SpanJSON, TracesSamplerSamplingContext, TransactionEvent } from '@sentry/core';

import { buildBeforeSendTransaction, buildTracesSampler } from '../span-sampling';

const THRESHOLD_MS = 1000;

/** Builds a minimal child SpanJSON with a duration of `durationMs`. */
function span(overrides: Partial<SpanJSON> & { op?: string; durationMs?: number }): SpanJSON {
	const { durationMs = 0, ...rest } = overrides;
	const startTimestamp = 1000;
	return {
		span_id: 'span-id',
		trace_id: 'trace-id',
		start_timestamp: startTimestamp,
		timestamp: startTimestamp + durationMs / 1000,
		data: {},
		...rest,
	};
}

/** Runs the filter and returns the surviving child spans. */
function filterSpans(spans: SpanJSON[]): SpanJSON[] {
	const event = { type: 'transaction', spans } as TransactionEvent;
	return buildBeforeSendTransaction(THRESHOLD_MS)(event).spans ?? [];
}

describe('buildBeforeSendTransaction', () => {
	it.each(['middleware.express', 'router.express', 'request_handler.express'])(
		'drops %s spans wholesale',
		(op) => {
			expect(filterSpans([span({ op, durationMs: 5000 })])).toEqual([]);
		},
	);

	it.each(['db', 'http.client'])('drops fast, non-errored %s spans', (op) => {
		expect(filterSpans([span({ op, durationMs: THRESHOLD_MS - 1, status: 'ok' })])).toEqual([]);
	});

	it.each(['db', 'http.client'])('keeps slow %s spans', (op) => {
		const slow = span({ op, durationMs: THRESHOLD_MS, status: 'ok' });
		expect(filterSpans([slow])).toEqual([slow]);
	});

	it.each(['db', 'http.client'])('keeps errored fast %s spans', (op) => {
		const errored = span({ op, durationMs: 1, status: 'internal_error' });
		expect(filterSpans([errored])).toEqual([errored]);
	});

	it('keeps http.server, custom n8n, and op-less spans', () => {
		const kept = [
			span({ op: 'http.server', durationMs: 1, status: 'ok' }),
			span({ op: 'trigger.poll', durationMs: 1 }),
			span({ durationMs: 1 }),
		];
		expect(filterSpans(kept)).toEqual(kept);
	});

	it('keeps unfinished spans (no end timestamp)', () => {
		const unfinished = span({ op: 'db', timestamp: undefined });
		expect(filterSpans([unfinished])).toEqual([unfinished]);
	});

	it('filters a mixed span tree, keeping only signal-bearing spans', () => {
		const slowDb = span({ op: 'db', durationMs: 2000, status: 'ok' });
		const httpServer = span({ op: 'http.server', durationMs: 50, status: 'ok' });
		const result = filterSpans([
			span({ op: 'middleware.express', durationMs: 40 }),
			span({ op: 'db', durationMs: 2, status: 'ok' }),
			slowDb,
			httpServer,
		]);
		expect(result).toEqual([slowDb, httpServer]);
	});

	it('reparents surviving children of dropped spans', () => {
		const slowDb = span({
			span_id: 'db-span',
			parent_span_id: 'express-span',
			op: 'db',
			durationMs: 2000,
			status: 'ok',
		});

		const result = filterSpans([
			span({
				span_id: 'express-span',
				parent_span_id: 'root-span',
				op: 'middleware.express',
				durationMs: 40,
			}),
			slowDb,
		]);

		expect(result).toEqual([{ ...slowDb, parent_span_id: 'root-span' }]);
	});

	it('returns the event unchanged when it has no spans', () => {
		const event = { type: 'transaction' } as TransactionEvent;
		expect(buildBeforeSendTransaction(THRESHOLD_MS)(event)).toBe(event);
	});
});

describe('buildTracesSampler', () => {
	const BASE_RATE = 0.05;
	const tracesSampler = buildTracesSampler(BASE_RATE);

	function ctx(
		attributes?: TracesSamplerSamplingContext['attributes'],
		inheritedRate?: number,
	): TracesSamplerSamplingContext {
		return {
			name: 'tx',
			attributes,
			inheritOrSampleWith: (fallbackRate) => inheritedRate ?? fallbackRate,
		};
	}

	it('returns a near-zero rate for poll-trigger transactions', () => {
		expect(tracesSampler(ctx({ 'sentry.op': 'trigger.poll' }))).toBeLessThan(BASE_RATE);
	});

	it('does not raise poll-trigger transactions above the base rate', () => {
		const lowBaseRateSampler = buildTracesSampler(0.0005);
		expect(lowBaseRateSampler(ctx({ 'sentry.op': 'trigger.poll' }))).toBe(0.0005);
	});

	it('does not raise poll-trigger transactions above an inherited rate', () => {
		expect(tracesSampler(ctx({ 'sentry.op': 'trigger.poll' }, 0.0005))).toBe(0.0005);
	});

	it('returns the base rate for other transactions', () => {
		expect(tracesSampler(ctx({ 'sentry.op': 'http.server' }))).toBe(BASE_RATE);
	});

	it('inherits upstream sampling decisions for other transactions', () => {
		expect(tracesSampler(ctx({ 'sentry.op': 'http.server' }, 1))).toBe(1);
	});

	it('returns the base rate when attributes are missing', () => {
		expect(tracesSampler(ctx())).toBe(BASE_RATE);
	});
});
