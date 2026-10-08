import type { ExportResult } from '@opentelemetry/core';
import type { Resource } from '@opentelemetry/resources';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import type { OtelResourceAttributeMapper } from '@/external-hooks';

export class MappedResourceSpanExporter implements SpanExporter {
	private readonly resourcesByMappedAttributes = new Map<string, Resource>();

	constructor(
		private readonly inner: SpanExporter,
		private readonly mapResourceAttributes: OtelResourceAttributeMapper,
	) {}

	export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
		this.inner.export(
			spans.map((span) => this.withMappedResource(span)),
			resultCallback,
		);
	}

	async shutdown(): Promise<void> {
		await this.inner.shutdown();
	}

	async forceFlush(): Promise<void> {
		await this.inner.forceFlush?.();
	}

	private withMappedResource(span: ReadableSpan): ReadableSpan {
		const mapped = this.mapResourceAttributes(span.attributes);
		const entries = Object.entries(mapped).sort(([a], [b]) => a.localeCompare(b));
		if (entries.length === 0) return span;

		const key = JSON.stringify(entries);
		let resource = this.resourcesByMappedAttributes.get(key);
		if (!resource) {
			resource = span.resource.merge(resourceFromAttributes(mapped));
			this.resourcesByMappedAttributes.set(key, resource);
		}

		const view: ReadableSpan = Object.create(span, {
			resource: { value: resource, enumerable: true },
		});
		return view;
	}
}
