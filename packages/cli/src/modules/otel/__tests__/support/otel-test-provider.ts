import type { Context, ContextManager } from '@opentelemetry/api';
import { context, propagation, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Minimal stand-in for `@opentelemetry/context-async-hooks`'
 * `AsyncLocalStorageContextManager` (the one `NodeSDK` registers by default in
 * production) — avoids adding that package as a test-only dependency. Without
 * a real context manager registered, `context.with()` is a no-op (the default
 * `NoopContextManager` ignores the context it's given), so span nesting via
 * ambient context can't be exercised at all.
 */
class AsyncLocalStorageTestContextManager implements ContextManager {
	private readonly storage = new AsyncLocalStorage<Context>();

	active(): Context {
		return this.storage.getStore() ?? ROOT_CONTEXT;
	}

	with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
		ctx: Context,
		fn: F,
		thisArg?: ThisParameterType<F>,
		...args: A
	): ReturnType<F> {
		return this.storage.run(ctx, () => fn.call(thisArg, ...args));
	}

	bind<T>(_context: Context, target: T): T {
		return target;
	}

	enable(): this {
		return this;
	}

	disable(): this {
		return this;
	}
}

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
 *
 * Pass `{ withContextManager: true }` when the code under test relies on
 * ambient active-context propagation (e.g. via `context.with()`), such as
 * nesting a span under whatever span is currently active.
 */
export class OtelTestProvider {
	private constructor(
		private readonly provider: BasicTracerProvider,
		private readonly exporter: InMemorySpanExporter,
		private readonly contextManagerEnabled: boolean,
	) {}

	static create(options: { withContextManager?: boolean } = {}): OtelTestProvider {
		const exporter = new InMemorySpanExporter();
		const provider = new BasicTracerProvider({
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		});
		trace.setGlobalTracerProvider(provider);
		propagation.setGlobalPropagator(new W3CTraceContextPropagator());
		if (options.withContextManager) {
			context.setGlobalContextManager(new AsyncLocalStorageTestContextManager());
		}
		return new OtelTestProvider(provider, exporter, options.withContextManager ?? false);
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
		if (this.contextManagerEnabled) context.disable();
	}
}
