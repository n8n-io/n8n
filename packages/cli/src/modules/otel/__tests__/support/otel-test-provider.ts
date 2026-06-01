import { propagation, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';

/**
 * Disposable OTel test harness. Sets up an in-memory tracer
 * that captures spans for assertion, and tears down cleanly.
 *
 * Usage:
 *   const otel = OtelTestProvider.create();
 *   // ... run code that creates spans ...
 *   expect(otel.getFinishedSpans()).toHaveLength(1);
 *   otel.reset(); // between tests
 *   await otel.shutdown(); // cleanup
 */
export class OtelTestProvider {
	private constructor(
		private readonly provider: BasicTracerProvider,
		private readonly exporter: InMemorySpanExporter,
	) {}

	static create(): OtelTestProvider {
		const exporter = new InMemorySpanExporter();
		const provider = new BasicTracerProvider({
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		});
		trace.setGlobalTracerProvider(provider);
		propagation.setGlobalPropagator(new W3CTraceContextPropagator());
		return new OtelTestProvider(provider, exporter);
	}

	getFinishedSpans() {
		return this.exporter.getFinishedSpans();
	}

	reset() {
		this.exporter.reset();
	}

	async shutdown() {
		this.exporter.reset();
		await this.provider.shutdown();
		trace.disable();
		propagation.disable();
	}
}
