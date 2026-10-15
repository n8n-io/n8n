import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Attributes, Context, Tracer } from '@opentelemetry/api';
import {
	context,
	createTraceState,
	defaultTextMapGetter,
	defaultTextMapSetter,
	ROOT_CONTEXT,
	SpanKind,
	SpanStatusCode,
	trace,
} from '@opentelemetry/api';
import { parseTraceParent, W3CTraceContextPropagator } from '@opentelemetry/core';
import type { RequestHandler } from 'express';

import { OtelConfig } from '@/modules/otel/otel.config';
import { OtelService } from '@/modules/otel/otel.service';

const propagator = new W3CTraceContextPropagator();
const MAX_TRACEPARENT_LENGTH = 512;
const MAX_TRACESTATE_LENGTH = 512;
const HTTP_METHODS = new Set([
	'GET',
	'HEAD',
	'POST',
	'PUT',
	'DELETE',
	'CONNECT',
	'OPTIONS',
	'TRACE',
	'PATCH',
]);

export function engineTracingEnabled(): boolean {
	return Container.get(EngineConfig).tracingEnabled && Container.get(OtelConfig).enabled;
}

export function getEngineTracer(): Tracer {
	return Container.get(OtelService).getTracer('n8n-engine-v2');
}

export async function runEngineSpan<T>(
	name: string,
	attributes: Attributes,
	run: () => Promise<T>,
	kind: SpanKind = SpanKind.INTERNAL,
): Promise<T> {
	if (!engineTracingEnabled()) return await run();

	return await getEngineTracer().startActiveSpan(name, { attributes, kind }, async (span) => {
		try {
			return await run();
		} catch (error) {
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
}

export function runEngineSpanSync<T>(
	name: string,
	attributes: Attributes,
	run: () => T,
	kind: SpanKind = SpanKind.INTERNAL,
): T {
	if (!engineTracingEnabled()) return run();

	return getEngineTracer().startActiveSpan(name, { attributes, kind }, (span) => {
		try {
			return run();
		} catch (error) {
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	});
}

/** Limit carriers to bounded W3C trace headers. Do not propagate baggage. */
export function filterEngineTraceHeaders(headers: Record<string, unknown>): Record<string, string> {
	const { traceparent, tracestate } = headers;
	if (
		typeof traceparent !== 'string' ||
		traceparent.length > MAX_TRACEPARENT_LENGTH ||
		!/^[\x20-\x7e]+$/.test(traceparent) ||
		!parseTraceParent(traceparent)
	) {
		return {};
	}

	const carrier: Record<string, string> = { traceparent };
	if (
		typeof tracestate === 'string' &&
		tracestate.length <= MAX_TRACESTATE_LENGTH &&
		/^[\x20-\x7e]*$/.test(tracestate)
	) {
		const validated = createTraceState(tracestate).serialize();
		if (validated) carrier.tracestate = validated;
	}
	return carrier;
}

export function injectEngineTraceHeaders(): Record<string, string> {
	if (!engineTracingEnabled()) return {};

	const headers: Record<string, string> = {};
	propagator.inject(context.active(), headers, defaultTextMapSetter);
	return filterEngineTraceHeaders(headers);
}

export function extractEngineTraceContext(headers: Record<string, unknown>): Context {
	if (!engineTracingEnabled()) return ROOT_CONTEXT;

	// A transport message must not inherit the connection's active context.
	return propagator.extract(ROOT_CONTEXT, filterEngineTraceHeaders(headers), defaultTextMapGetter);
}

export function createEngineHttpTracingMiddleware(spanName: string): RequestHandler {
	return (req, res, next) => {
		if (!engineTracingEnabled()) {
			next();
			return;
		}

		const parentContext = extractEngineTraceContext(req.headers);
		const span = getEngineTracer().startSpan(
			spanName,
			{
				kind: SpanKind.SERVER,
				attributes: { 'http.request.method': HTTP_METHODS.has(req.method) ? req.method : '_OTHER' },
			},
			parentContext,
		);
		let ended = false;
		const finish = (failed: boolean) => {
			if (ended) return;
			ended = true;
			res.off('finish', onFinish);
			res.off('close', onClose);
			res.off('error', onError);
			span.setAttribute('http.response.status_code', res.statusCode);
			if (failed || res.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
			span.end();
		};
		const onFinish = () => finish(false);
		const onClose = () => finish(!res.writableFinished);
		const onError = () => finish(true);
		res.once('finish', onFinish);
		res.once('close', onClose);
		res.once('error', onError);

		context.with(trace.setSpan(parentContext, span), () => {
			try {
				next();
			} catch (error) {
				finish(true);
				throw error;
			}
		});
	};
}
