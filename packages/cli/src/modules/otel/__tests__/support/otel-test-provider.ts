import type { Context, ContextManager } from '@opentelemetry/api';
import { context, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import {
	InMemorySpanExporter,
	NodeTracerProvider,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mock } from 'vitest-mock-extended';

import type { OtelService } from '../../otel.service';

/**
 * Minimal stand-in for `@opentelemetry/context-async-hooks`'
 * `AsyncLocalStorageContextManager` (the one `NodeTracerProvider.register()`
 * installs in production) — avoids adding that package as a test-only dependency. Without
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
 * Disposable OTel test harness. Sets up an in-memory tracer provider that
 * captures spans for assertion, registers it as the global tracer provider
 * (so the module under test sees the slot taken, like it does next to
 * Sentry), and tears down cleanly.
 *
 * Usage:
 *   const otel = OtelTestProvider.create();
 *   const tracer = new ExecutionLevelTracer(otel.asOtelService(), ...);
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
		readonly provider: NodeTracerProvider,
		private readonly exporter: InMemorySpanExporter,
		private readonly contextManagerEnabled: boolean,
	) {}

	static create(options: { withContextManager?: boolean } = {}): OtelTestProvider {
		const exporter = new InMemorySpanExporter();
		const provider = new NodeTracerProvider({
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		});
		trace.setGlobalTracerProvider(provider);
		if (options.withContextManager) {
			context.setGlobalContextManager(new AsyncLocalStorageTestContextManager());
		}
		return new OtelTestProvider(provider, exporter, options.withContextManager ?? false);
	}

	/** An `OtelService` stand-in that hands out this provider's tracers. */
	asOtelService(): OtelService {
		return mock<OtelService>({ getTracer: (name: string) => this.provider.getTracer(name) });
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
		if (this.contextManagerEnabled) context.disable();
	}
}
