import type { Attributes, Context, Span, SpanOptions, Tracer } from '@opentelemetry/api';

import type { AttributeValue } from '../types/telemetry';

class MetadataEnrichedTracer implements Tracer {
	constructor(
		private readonly delegate: Tracer,
		private readonly attributes: Attributes,
	) {}

	startSpan(name: string, options?: SpanOptions, context?: Context): Span {
		return this.delegate.startSpan(
			name,
			{
				...options,
				attributes: { ...this.attributes, ...options?.attributes },
			},
			context,
		);
	}

	startActiveSpan<F extends (span: Span) => unknown>(name: string, fn: F): ReturnType<F>;
	startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		options: SpanOptions,
		fn: F,
	): ReturnType<F>;
	startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		options: SpanOptions,
		context: Context,
		fn: F,
	): ReturnType<F>;
	startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		optionsOrFn: SpanOptions | F,
		contextOrFn?: Context | F,
		fn?: F,
	): ReturnType<F> {
		if (typeof optionsOrFn === 'function') {
			return this.delegate.startActiveSpan(name, optionsOrFn);
		}

		const options = {
			...optionsOrFn,
			attributes: { ...this.attributes, ...optionsOrFn.attributes },
		};
		if (typeof contextOrFn === 'function') {
			return this.delegate.startActiveSpan(name, options, contextOrFn);
		}
		if (contextOrFn === undefined || fn === undefined) {
			throw new Error('OpenTelemetry active span callback is required.');
		}

		return this.delegate.startActiveSpan(name, options, contextOrFn, fn);
	}
}

export function createMetadataEnrichedTracer(
	tracer: Tracer,
	metadata: Record<string, AttributeValue> | undefined,
): Tracer {
	if (!metadata || Object.keys(metadata).length === 0) return tracer;

	const attributes = Object.fromEntries(
		Object.entries(metadata).map(([key, value]) => [`ai.telemetry.metadata.${key}`, value]),
	);
	return new MetadataEnrichedTracer(tracer, attributes);
}
