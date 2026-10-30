import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import { withResource } from '@/observability/span-resource';

export type SpanAttributeMapper = (spanAttributes: Attributes) => Record<string, string>;

export function withResourceAttributes(
	exporter: SpanExporter,
	overrides: Attributes,
	mapAttributes: SpanAttributeMapper,
): SpanExporter {
	const baseResources = new WeakMap<Resource, Resource>();
	const baseFor = (resource: Resource): Resource => {
		const cached = baseResources.get(resource);
		if (cached) return cached;

		const merged = resource.merge(resourceFromAttributes(overrides));
		baseResources.set(resource, merged);
		return merged;
	};

	return {
		export: (spans, resultCallback) => {
			const mappedResources = new Map<string, Resource>();
			const resourceFor = ({ resource, attributes }: ReadableSpan): Resource => {
				const mapped = mapAttributes(attributes);
				const keys = Object.keys(mapped).sort();
				if (keys.length === 0) return baseFor(resource);

				const key = keys.map((name) => `${name}\0${mapped[name]}`).join('\0');
				const cached = mappedResources.get(key);
				if (cached) return cached;

				const merged = resource.merge(resourceFromAttributes({ ...mapped, ...overrides }));
				mappedResources.set(key, merged);
				return merged;
			};
			exporter.export(
				spans.map((span) => withResource(span, resourceFor(span))),
				resultCallback,
			);
		},
		shutdown: async () => await exporter.shutdown(),
		forceFlush: async () => await exporter.forceFlush?.(),
	};
}
