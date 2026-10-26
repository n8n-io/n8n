import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

export function mapResourceAttributes(
	exporter: SpanExporter,
	mapAttributes: (spanAttributes: Attributes) => Attributes,
): SpanExporter {
	return {
		export: (spans, resultCallback) => {
			const mergedResources = new Map<string, Resource>();

			const mergedResource = (resource: Resource, mapped: Attributes, key: string) => {
				const cached = mergedResources.get(key);
				if (cached) return cached;

				const merged = resourceFromAttributes(mapped).merge(resource);
				mergedResources.set(key, merged);
				return merged;
			};

			exporter.export(
				spans.map((span) => {
					const mapped = mapAttributes(span.attributes);
					const entries = Object.entries(mapped).sort(([a], [b]) => a.localeCompare(b));
					if (entries.length === 0) return span;

					return withResource(span, mergedResource(span.resource, mapped, JSON.stringify(entries)));
				}),
				resultCallback,
			);
		},
		shutdown: async () => await exporter.shutdown(),
		forceFlush: async () => await exporter.forceFlush?.(),
	};
}

function withResource(span: ReadableSpan, resource: Resource): ReadableSpan {
	return new Proxy(span, {
		get: (target, property, receiver) =>
			property === 'resource' ? resource : Reflect.get(target, property, receiver),
	});
}
