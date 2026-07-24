import { context, trace } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';

/**
 * Disposable OTel test harness. Sets up an in-memory tracer that captures
 * spans for assertion, plus a real async-hooks context manager so parent/child
 * span nesting is preserved across `await` boundaries (without it, every span
 * looks like a root regardless of `startActiveSpan` nesting, since the default
 * no-op context manager never tracks an "active" context).
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
		private readonly contextManager: AsyncHooksContextManager,
	) {}

	static create(): OtelTestProvider {
		const exporter = new InMemorySpanExporter();
		const provider = new BasicTracerProvider({
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		});
		trace.setGlobalTracerProvider(provider);
		const contextManager = new AsyncHooksContextManager().enable();
		context.setGlobalContextManager(contextManager);
		return new OtelTestProvider(provider, exporter, contextManager);
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
		this.contextManager.disable();
		trace.disable();
		context.disable();
	}
}
