import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';

import { withResource } from '@/observability/span-resource';

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
