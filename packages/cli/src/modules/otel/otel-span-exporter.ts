import type { Attributes } from '@opentelemetry/api';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import { withResource } from '@/observability/span-resource';

import type { OtelConfigureHook } from './otel-configure-hook';

type AttributeHook = Pick<
	OtelConfigureHook,
	'mapResourceAttributes' | 'overrideResourceAttributes' | 'overrideSpanAttributes'
>;

export function withHookAttributes(
	exporter: SpanExporter,
	n8nResourceAttributes: Attributes,
	hook: AttributeHook,
): SpanExporter {
	const baseResources = new WeakMap<Resource, Resource>();
	const baseFor = (resource: Resource): Resource => {
		const cached = baseResources.get(resource);
		if (cached) return cached;

		const merged = resource.merge(resourceFromAttributes(n8nResourceAttributes));
		baseResources.set(resource, merged);
		return merged;
	};

	return {
		export: (spans, resultCallback) => {
			const mappedResources = new Map<string, Resource>();
			const resourceFor = ({ resource, attributes }: ReadableSpan): Resource => {
				const mapped = hook.mapResourceAttributes(attributes);
				const overridden = hook.overrideResourceAttributes(attributes);
				const key = `${entriesKey(mapped)}\0\0${entriesKey(overridden)}`;
				if (key === '\0\0') return baseFor(resource);

				const cached = mappedResources.get(key);
				if (cached) return cached;

				const merged = resource.merge(
					resourceFromAttributes({ ...mapped, ...n8nResourceAttributes, ...overridden }),
				);
				mappedResources.set(key, merged);
				return merged;
			};
			exporter.export(
				spans.map((span) =>
					withResource(withSpanAttributeOverrides(span, hook), resourceFor(span)),
				),
				resultCallback,
			);
		},
		shutdown: async () => await exporter.shutdown(),
		forceFlush: async () => await exporter.forceFlush?.(),
	};
}

function entriesKey(entries: Record<string, string>): string {
	return Object.keys(entries)
		.sort()
		.map((name) => `${name}\0${entries[name]}`)
		.join('\0');
}

function withSpanAttributeOverrides(span: ReadableSpan, hook: AttributeHook): ReadableSpan {
	const overridden = hook.overrideSpanAttributes(span.attributes);
	if (Object.keys(overridden).length === 0) return span;

	const attributes = { ...span.attributes, ...overridden };
	return new Proxy(span, {
		get: (target, property, receiver) =>
			property === 'attributes' ? attributes : Reflect.get(target, property, receiver),
	});
}
