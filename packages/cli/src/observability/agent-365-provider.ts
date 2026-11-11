import type * as MicrosoftOpenTelemetry from '@microsoft/opentelemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { resourceFromAttributes, type Resource } from '@opentelemetry/resources';
import {
	AlwaysOnSampler,
	BasicTracerProvider,
	BatchSpanProcessor,
	type BufferConfig,
	type ReadableSpan,
	type SpanExporter,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import { withResource } from './span-resource';

const MICROSOFT_RESOURCE = resourceFromAttributes({
	[ATTR_SERVICE_NAME]: 'n8n-microsoft-agent-365',
});

// Microsoft's exporter defaults, set here so the customer's OTEL_BSP_* env vars do not change them.
const MICROSOFT_BUFFER_CONFIG: BufferConfig = {
	maxQueueSize: 2048,
	scheduledDelayMillis: 5000,
	maxExportBatchSize: 512,
	exportTimeoutMillis: 90_000,
};

export function createAgent365TracerProvider(
	resource: Resource,
	customerSpanProcessors: SpanProcessor[],
): BasicTracerProvider {
	return new BasicTracerProvider({
		resource,
		sampler: new AlwaysOnSampler(),
		spanProcessors: [
			new BatchSpanProcessor(new LazyAgent365Exporter(), MICROSOFT_BUFFER_CONFIG),
			...customerSpanProcessors,
		],
	});
}

class LazyAgent365Exporter implements SpanExporter {
	private exporter?: SpanExporter;

	export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
		try {
			this.load().export(
				spans.map((span) => withResource(span, MICROSOFT_RESOURCE)),
				resultCallback,
			);
		} catch (error) {
			resultCallback({ code: ExportResultCode.FAILED, error: ensureError(error) });
		}
	}

	async forceFlush(): Promise<void> {
		await this.exporter?.forceFlush?.();
	}

	async shutdown(): Promise<void> {
		await this.exporter?.shutdown();
	}

	private load(): SpanExporter {
		if (!this.exporter) {
			// The node fills the token cache of the CommonJS copy, and import() would load the ESM copy.
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const microsoft: typeof MicrosoftOpenTelemetry = require('@microsoft/opentelemetry');
			this.exporter = new microsoft.Agent365Exporter({
				tokenResolver: (agentId, tenantId) =>
					microsoft.AgenticTokenCacheInstance.getObservabilityToken(agentId, tenantId),
				durableDelivery: { enabled: false },
			});
		}

		return this.exporter;
	}
}
