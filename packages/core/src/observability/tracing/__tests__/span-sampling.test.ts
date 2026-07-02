import type { SpanJSON, TracesSamplerSamplingContext, TransactionEvent } from '@sentry/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	buildBeforeSendTransaction,
	buildTracesSampler,
	shouldIgnoreIncomingRequest,
	shouldIgnoreOutgoingRequest,
} from '../span-sampling';

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

/** Builds a transaction event with an optional root op and child spans. */
function transaction(overrides: {
	op?: string;
	name?: string;
	spans?: SpanJSON[];
}): TransactionEvent {
	const { op, name, spans } = overrides;
	return {
		type: 'transaction',
		transaction: name,
		spans,
		contexts: op ? { trace: { op, span_id: 'root-span', trace_id: 'trace-id' } } : undefined,
	} as TransactionEvent;
}

/** Runs the filter and returns the surviving child spans. */
function filterSpans(spans: SpanJSON[]): SpanJSON[] {
	const event = { type: 'transaction', spans } as TransactionEvent;
	return buildBeforeSendTransaction(THRESHOLD_MS)(event)?.spans ?? [];
}

describe('buildBeforeSendTransaction', () => {
	it.each([
		'SELECT "WorkflowStatistics" WHERE ...',
		'pg-pool.connect',
		'UPDATE execution_entity SET "deletedAt" ...',
		'INSERT INTO execution_metadata ...',
	])('drops db-rooted transactions (%s)', (name) => {
		const event = transaction({ op: 'db', name, spans: [span({ op: 'db', durationMs: 5 })] });
		expect(buildBeforeSendTransaction(THRESHOLD_MS)(event)).toBeNull();
	});

	it('keeps a real request transaction that contains fast db child spans', () => {
		const slowDb = span({ op: 'db', durationMs: THRESHOLD_MS, status: 'ok' });
		const event = transaction({
			op: 'http.server',
			name: 'GET /rest/workflows',
			spans: [span({ op: 'db', durationMs: 2, status: 'ok' }), slowDb],
		});
		const result = buildBeforeSendTransaction(THRESHOLD_MS)(event);
		expect(result).not.toBeNull();
		expect(result?.spans).toEqual([slowDb]);
	});

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

	describe('webhook trace sampling', () => {
		const WEBHOOK = { endpoint: 'webhook', sampleRate: 0.05 };
		const beforeSend = buildBeforeSendTransaction(THRESHOLD_MS, WEBHOOK);

		/** Builds a webhook transaction with the given name and root status. */
		function webhookTx(name: string, status?: SpanJSON['status']): TransactionEvent {
			return {
				type: 'transaction',
				transaction: name,
				contexts: { trace: { op: 'http.server', span_id: 'root', trace_id: 't', status } },
			} as TransactionEvent;
		}

		afterEach(() => vi.restoreAllMocks());

		it('drops a successful webhook transaction when the dice roll exceeds the rate', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.5);
			expect(beforeSend(webhookTx('POST /webhook/*path', 'ok'))).toBeNull();
		});

		it('keeps a successful webhook transaction when the dice roll is below the rate', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.01);
			expect(beforeSend(webhookTx('POST /webhook/*path', 'ok'))).not.toBeNull();
		});

		it('keeps errored webhook transactions regardless of the dice roll', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.99);
			expect(beforeSend(webhookTx('POST /webhook/*path', 'internal_error'))).not.toBeNull();
		});

		it('does not sample /rest transactions', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.99);
			expect(beforeSend(webhookTx('POST /rest/executions/:id/stop', 'ok'))).not.toBeNull();
		});

		it('does not sample test/waiting webhooks (production only)', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.99);
			expect(beforeSend(webhookTx('POST /webhook-test/*path', 'ok'))).not.toBeNull();
			expect(beforeSend(webhookTx('POST /webhook-waiting/:path', 'ok'))).not.toBeNull();
		});

		it('does not sample webhooks when no webhook config is provided', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.99);
			expect(
				buildBeforeSendTransaction(THRESHOLD_MS)(webhookTx('POST /webhook/*path', 'ok')),
			).not.toBeNull();
		});

		it('does not sample webhooks when the rate is 1', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.99);
			const keepAll = buildBeforeSendTransaction(THRESHOLD_MS, {
				endpoint: 'webhook',
				sampleRate: 1,
			});
			expect(keepAll(webhookTx('POST /webhook/*path', 'ok'))).not.toBeNull();
		});
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

describe('shouldIgnoreIncomingRequest', () => {
	it.each([
		'/assets/index-abc.js',
		'/assets/index-abc.js.map',
		'/styles.css.map',
		'/rest/ph',
		'/rest/ph/decide',
		'/rest/telemetry/proxy/v1/track',
		'/rest/telemetry/proxy/v1/page',
		'/assets/index-abc.js?v=1',
		'/rest/telemetry/proxy/v1/track?foo=bar',
		'/healthz',
		'/healthz/readiness',
	])('ignores noise path %s', (path) => {
		expect(shouldIgnoreIncomingRequest(path)).toBe(true);
	});

	it.each(['/rest/workflows', '/rest/phony', '/', '/healthcheck'])(
		'keeps signal-bearing path %s',
		(path) => {
			expect(shouldIgnoreIncomingRequest(path)).toBe(false);
		},
	);
});

describe('shouldIgnoreOutgoingRequest', () => {
	it.each(['https://telemetry.n8n.io/v1/batch', 'https://telemetry.n8n.io:443/v1/track?foo=bar'])(
		'ignores outbound telemetry call %s',
		(url) => {
			expect(shouldIgnoreOutgoingRequest(url)).toBe(true);
		},
	);

	it.each([
		'https://ph.n8n.io/decide',
		'https://api.n8n.io/x',
		'https://api.example.com/redirect?to=https://telemetry.n8n.io/v1/batch',
		'https://telemetry.n8n.io.example.com/v1/batch',
		'telemetry.n8n.io/v1/batch',
	])('keeps non-telemetry outbound call %s', (url) => {
		expect(shouldIgnoreOutgoingRequest(url)).toBe(false);
	});
});
