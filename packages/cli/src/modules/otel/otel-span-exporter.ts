import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

export function mergeResourceAttributes(
	exporter: SpanExporter,
	attributes: Attributes,
): SpanExporter {
	const overrides = resourceFromAttributes(attributes);
	const mergedResources = new WeakMap<Resource, Resource>();

	const mergedResource = (resource: Resource): Resource => {
		const cached = mergedResources.get(resource);
		if (cached) return cached;

		const merged = resource.merge(overrides);
		mergedResources.set(resource, merged);
		return merged;
	};

	return withExport(exporter, (spans, resultCallback) =>
		exporter.export(
			spans.map((span) => withResource(span, mergedResource(span.resource))),
			resultCallback,
		),
	);
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
