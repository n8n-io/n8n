import type { Span, Tracer } from '@opentelemetry/api';

import type { AttributeValue, BuiltTelemetry } from '../../types/telemetry';

function isTracer(value: unknown): value is Tracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startSpan') === 'function'
	);
}

/** Record headers-time per HTTP attempt. Generation spans alone own token usage. */
export function traceModelRequests(
	delegate: typeof globalThis.fetch,
	telemetry: BuiltTelemetry | undefined,
	provider: string,
	model: string,
): typeof globalThis.fetch {
	if (!telemetry?.enabled || !telemetry.traceModelRequests || !isTracer(telemetry.tracer))
		return delegate;
	const tracer = telemetry.tracer;
	return async (input, init) => {
		let span: Span | undefined;
		try {
			const attributes: Record<string, AttributeValue> = {
				'gen_ai.system': provider,
				'gen_ai.request.model': model,
			};
			if (telemetry.isLangSmith) {
				attributes['langsmith.traceable'] = 'true';
				attributes['langsmith.span.kind'] = 'chain';
				for (const [key, value] of Object.entries(telemetry.metadata ?? {})) {
					attributes[key.startsWith('langsmith.metadata.') ? key : `langsmith.metadata.${key}`] =
						value;
				}
			}
			span = tracer.startSpan('model.provider.request', { attributes });
		} catch {
			/* Telemetry must not prevent a provider request. */
		}
		try {
			const response = await delegate(input, init);
			try {
				span?.setAttributes({ 'http.response.status_code': response.status });
				span?.setStatus({ code: response.ok ? 1 : 2 });
			} catch {
				/* Preserve the provider response. */
			}
			return response;
		} catch (error) {
			try {
				span?.setStatus({ code: 2 });
			} catch {
				/* No error bodies in spans. */
			}
			throw error;
		} finally {
			try {
				span?.end();
			} catch {
				/* Export errors do not change model results. */
			}
		}
	};
}
