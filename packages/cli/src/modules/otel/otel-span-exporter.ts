import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

export function mergeResourceAttributes(
	exporter: SpanExporter,
	attributes: Attributes,
): SpanExporter {
	const overrides = resourceFromAttributes(attributes);
	const mergedResources = new WeakMap<Resource, Resource>();

	return withMappedResource(exporter, () => ({ resource }) => {
		const cached = mergedResources.get(resource);
		if (cached) return cached;

		const merged = resource.merge(overrides);
		mergedResources.set(resource, merged);
		return merged;
	});
}

export function mapResourceAttributes(
	exporter: SpanExporter,
	mapAttributes: (spanAttributes: Attributes) => Attributes,
): SpanExporter {
	return withMappedResource(exporter, () => {
		const mergedResources = new Map<string, Resource>();

		return ({ resource, attributes }) => {
			const mapped = mapAttributes(attributes);
			const entries = Object.entries(mapped).sort(([a], [b]) => a.localeCompare(b));
			if (entries.length === 0) return resource;

			const key = JSON.stringify(entries);
			const cached = mergedResources.get(key);
			if (cached) return cached;

			const merged = resource.merge(resourceFromAttributes(mapped));
			mergedResources.set(key, merged);
			return merged;
		};
	});
}

function withMappedResource(
	exporter: SpanExporter,
	resolverForBatch: () => (span: ReadableSpan) => Resource,
): SpanExporter {
	return withExport(exporter, (spans, resultCallback) => {
		const resolveResource = resolverForBatch();
		exporter.export(
			spans.map((span) => {
				const resource = resolveResource(span);
				return resource === span.resource ? span : withResource(span, resource);
			}),
			resultCallback,
		);
	});
}

function withExport(exporter: SpanExporter, exportSpans: SpanExporter['export']): SpanExporter {
	return {
		export: exportSpans,
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
