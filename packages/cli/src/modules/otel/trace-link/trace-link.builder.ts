import type { ExecutionTraceLink } from '@n8n/api-types';
import {
	defaultTextMapGetter,
	isSpanContextValid,
	ROOT_CONTEXT,
	trace,
	TraceFlags,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import type { ExecutionTracingContext } from 'n8n-workflow';

import type { TraceLinkBackend } from '../otel.constants';

const propagator = new W3CTraceContextPropagator();

/** Widens the time range of a backend query, so clock skew between n8n and the backend does not hide the trace. */
const TIME_RANGE_PADDING_MS = 5 * 60 * 1000;

export type TraceLinkSettings = {
	backend: TraceLinkBackend;
	baseUrl: string;
	datasourceUid: string;
};

export type TraceLinkTiming = {
	startedAt?: Date | null;
	stoppedAt?: Date | null;
};

/**
 * Returns the trace id of a saved trace context when the trace was sampled.
 * An unsampled trace never reached the exporter, so no backend has it.
 */
export function getSampledTraceId(
	tracingContext: ExecutionTracingContext | null | undefined,
): string | undefined {
	const traceparent = tracingContext?.traceparent;
	if (typeof traceparent !== 'string' || traceparent.length === 0) return undefined;

	const extracted = propagator.extract(ROOT_CONTEXT, { traceparent }, defaultTextMapGetter);
	const spanContext = trace.getSpanContext(extracted);
	if (!spanContext || !isSpanContextValid(spanContext)) return undefined;
	if ((spanContext.traceFlags & TraceFlags.SAMPLED) === 0) return undefined;

	return spanContext.traceId;
}

export function buildTraceUrl(
	settings: TraceLinkSettings,
	traceId: string,
	timing: TraceLinkTiming = {},
): string | undefined {
	const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '');
	if (!/^https?:\/\//i.test(baseUrl)) return undefined;

	const id = encodeURIComponent(traceId);

	switch (settings.backend) {
		case 'jaeger':
			return `${baseUrl}/trace/${id}`;
		case 'zipkin':
			return `${baseUrl}/traces/${id}`;
		case 'datadog':
			return `${baseUrl}/apm/trace/${toDatadogTraceId(traceId)}`;
		case 'honeycomb':
			return buildHoneycombUrl(baseUrl, id, timing);
		case 'tempo':
			return buildTempoUrl(baseUrl, settings.datasourceUid.trim(), traceId, timing);
		case 'none':
			return undefined;
	}
}

export function buildTraceLink(
	settings: TraceLinkSettings,
	tracingContext: ExecutionTracingContext | null | undefined,
	timing: TraceLinkTiming = {},
): ExecutionTraceLink | undefined {
	if (settings.backend === 'none') return undefined;

	const traceId = getSampledTraceId(tracingContext);
	if (!traceId) return undefined;

	const url = buildTraceUrl(settings, traceId, timing);
	return url ? { traceId, url } : undefined;
}

/** Datadog shows OpenTelemetry traces under the lower 64 bits of the trace id, in decimal. */
function toDatadogTraceId(traceId: string): string {
	return BigInt(`0x${traceId.slice(-16)}`).toString(10);
}

function paddedRange({ startedAt, stoppedAt }: TraceLinkTiming) {
	if (!startedAt) return undefined;
	const from = startedAt.getTime() - TIME_RANGE_PADDING_MS;
	const to = (stoppedAt ?? startedAt).getTime() + TIME_RANGE_PADDING_MS;
	return { from, to };
}

function buildHoneycombUrl(baseUrl: string, id: string, timing: TraceLinkTiming): string {
	const range = paddedRange(timing);
	if (!range) return `${baseUrl}/trace?trace_id=${id}`;

	const startSec = Math.floor(range.from / 1000);
	const endSec = Math.ceil(range.to / 1000);
	return `${baseUrl}/trace?trace_id=${id}&trace_start_ts=${startSec}&trace_end_ts=${endSec}`;
}

function buildTempoUrl(
	baseUrl: string,
	datasourceUid: string,
	traceId: string,
	timing: TraceLinkTiming,
): string | undefined {
	if (!datasourceUid) return undefined;

	const range = paddedRange(timing);
	const panes = {
		a: {
			datasource: datasourceUid,
			queries: [
				{
					refId: 'A',
					datasource: { type: 'tempo', uid: datasourceUid },
					queryType: 'traceql',
					query: traceId,
				},
			],
			range: range
				? { from: String(range.from), to: String(range.to) }
				: { from: 'now-24h', to: 'now' },
		},
	};
	return `${baseUrl}/explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(panes))}`;
}
