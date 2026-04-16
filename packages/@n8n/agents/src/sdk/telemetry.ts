import type { TelemetryIntegration } from 'ai';

import type {
	AttributeValue,
	BuiltTelemetry,
	OpaqueTracer,
	OpaqueTracerProvider,
} from '../types/telemetry';

type RedactFn = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Recursively apply the redact function to plain objects found anywhere
 * in the value tree (including inside arrays and at the top level).
 */
function redactValue(value: unknown, redact: RedactFn): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item, redact));
	}
	if (
		typeof value === 'object' &&
		value !== null &&
		Object.getPrototypeOf(value) === Object.prototype
	) {
		const redacted = redact(value as Record<string, unknown>);
		// Recurse into the redacted result so deeply nested objects are also processed.
		for (const key of Object.keys(redacted)) {
			redacted[key] = redactValue(redacted[key], redact);
		}
		return redacted;
	}
	return value;
}

/**
 * Clone the event object, applying the redact function to every value
 * that is a plain object (Record-like) — including top-level scalars
 * wrapped in a single-key record, arrays containing objects, and nested
 * objects at any depth.
 */
function redactEvent<T extends object>(event: T, redact: RedactFn): T {
	const cloned = { ...event };
	// Redact the cloned event itself (it is a plain object).
	const redacted = redact(cloned as unknown as Record<string, unknown>);
	// Then recurse into each value to handle arrays and nested objects.
	for (const key of Object.keys(redacted)) {
		const value = redacted[key];
		redacted[key] = redactValue(value, redact);
	}
	return redacted as T;
}

/**
 * Wrap a TelemetryIntegration so every hook passes event data through
 * the redact callback before forwarding to the original hook.
 */
function wrapIntegrationWithRedaction(
	integration: TelemetryIntegration,
	redact: RedactFn,
): TelemetryIntegration {
	const wrapped: TelemetryIntegration = {};

	if (integration.onStart) {
		const orig = integration.onStart;
		wrapped.onStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onStepStart) {
		const orig = integration.onStepStart;
		wrapped.onStepStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onToolCallStart) {
		const orig = integration.onToolCallStart;
		wrapped.onToolCallStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onToolCallFinish) {
		const orig = integration.onToolCallFinish;
		wrapped.onToolCallFinish = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onStepFinish) {
		const orig = integration.onStepFinish;
		wrapped.onStepFinish = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onFinish) {
		const orig = integration.onFinish;
		wrapped.onFinish = (event) => orig(redactEvent(event, redact));
	}

	return wrapped;
}

/**
 * Create an OTel tracer + provider by dynamically importing OTel packages.
 * This keeps OTel as a true optional peer dependency — the packages are only
 * loaded when .otlpEndpoint() is actually called.
 */
async function createOtlpTracer(endpoint: string): Promise<{
	tracer: OpaqueTracer;
	provider: OpaqueTracerProvider;
}> {
	const { NodeTracerProvider } = (await import('@opentelemetry/sdk-trace-node')) as {
		NodeTracerProvider: new (config?: {
			spanProcessors?: unknown[];
		}) => OpaqueTracerProvider & {
			getTracer(name: string): OpaqueTracer;
		};
	};
	const { OTLPTraceExporter } = (await import('@opentelemetry/exporter-trace-otlp-http')) as {
		OTLPTraceExporter: new (config: { url: string }) => unknown;
	};
	const { SimpleSpanProcessor } = (await import('@opentelemetry/sdk-trace-base')) as {
		SimpleSpanProcessor: new (exporter: unknown) => unknown;
	};

	const exporter = new OTLPTraceExporter({ url: endpoint });
	const provider = new NodeTracerProvider({
		spanProcessors: [new SimpleSpanProcessor(exporter)],
	});
	// Intentionally NOT calling provider.register() — we only use
	// the tracer directly, without replacing the global tracer provider.

	const tracer = provider.getTracer('@n8n/agents');

	return { tracer, provider };
}

/**
 * Fluent builder for telemetry configuration.
 *
 * Use `.tracer()` with a pre-built integration (e.g. `LangSmithTelemetry`,
 * `integrations.langsmith()`) or `.otlpEndpoint()` for a generic OTLP
 * collector. Add AI SDK `TelemetryIntegration` hooks via `.integration()`.
 *
 * @example
 * ```typescript
 * import { Telemetry, LangSmithTelemetry } from '@n8n/agents';
 *
 * const ls = new LangSmithTelemetry({ project: 'my-project' });
 * const telemetry = new Telemetry()
 *   .functionId('my-agent')
 *   .tracer(ls.tracer)
 *   .recordOutputs(false)
 *   .build();
 * ```
 */
export class Telemetry {
	protected enabledValue = true;

	protected functionIdValue?: string;

	protected metadataValue?: Record<string, AttributeValue>;

	protected recordInputsValue = true;

	protected recordOutputsValue = true;

	protected redactFn?: RedactFn;

	protected integrationsList: TelemetryIntegration[] = [];

	protected tracerValue?: OpaqueTracer;

	protected otlpEndpointValue?: string;

	protected credentialNameValue?: string;

	/**
	 * Declare a credential this telemetry config requires. The execution
	 * engine resolves the credential name to an API key at build time —
	 * user code never handles raw keys.
	 *
	 * @example
	 * ```typescript
	 * const telemetry = new Telemetry()
	 *   .credential('langsmith')
	 *   .tracer(ls.tracer);
	 * ```
	 */
	credential(name: string): this {
		this.credentialNameValue = name;
		return this;
	}

	/** @internal Read the declared credential name (used by the execution engine). */
	get declaredCredential(): string | undefined {
		return this.credentialNameValue;
	}

	/** @internal Resolved API key, set by the execution engine before build(). */
	protected resolvedKey?: string;

	/** @internal Set the resolved API key (called by the execution engine before build()). */
	set resolvedApiKey(key: string) {
		this.resolvedKey = key;
	}

	/** Enable or disable telemetry. Defaults to true. */
	enabled(value: boolean): this {
		this.enabledValue = value;
		return this;
	}

	/** Set a function ID for grouping telemetry data. */
	functionId(value: string): this {
		this.functionIdValue = value;
		return this;
	}

	/** Set metadata attributes included in telemetry spans. */
	metadata(value: Record<string, AttributeValue>): this {
		this.metadataValue = value;
		return this;
	}

	/** Enable or disable recording of inputs. Defaults to true. */
	recordInputs(value: boolean): this {
		this.recordInputsValue = value;
		return this;
	}

	/** Enable or disable recording of outputs. Defaults to true. */
	recordOutputs(value: boolean): this {
		this.recordOutputsValue = value;
		return this;
	}

	/**
	 * Set a redaction callback. When set, all integration hooks will
	 * have their event data passed through this function before the
	 * original hook receives it.
	 */
	redact(fn: RedactFn): this {
		this.redactFn = fn;
		return this;
	}

	/** Add a telemetry integration (e.g. for observability platforms). */
	integration(value: TelemetryIntegration): this {
		this.integrationsList.push(value);
		return this;
	}

	/**
	 * Set a pre-built OTel tracer. Use with pre-built telemetry providers
	 * like `LangSmithTelemetry` or `integrations.langsmith()`.
	 *
	 * Mutually exclusive with `.otlpEndpoint()`.
	 */
	tracer(value: OpaqueTracer): this {
		this.tracerValue = value;
		return this;
	}

	/**
	 * Set an OTLP endpoint to auto-create a tracer + provider.
	 * Requires `@opentelemetry/sdk-trace-node`, `@opentelemetry/exporter-trace-otlp-http`,
	 * and `@opentelemetry/sdk-trace-base` as peer dependencies.
	 *
	 * Mutually exclusive with `.tracer()`.
	 */
	otlpEndpoint(value: string): this {
		this.otlpEndpointValue = value;
		return this;
	}

	/** Build the telemetry configuration. */
	async build(): Promise<BuiltTelemetry> {
		if (this.tracerValue !== undefined && this.otlpEndpointValue !== undefined) {
			throw new Error('Cannot set both .tracer() and .otlpEndpoint() — use one or the other.');
		}

		let tracer: OpaqueTracer = this.tracerValue;
		let provider: OpaqueTracerProvider | undefined;

		if (this.otlpEndpointValue !== undefined) {
			const otlp = await createOtlpTracer(this.otlpEndpointValue);
			tracer = otlp.tracer;
			provider = otlp.provider;
		}

		const integrations = this.redactFn
			? this.integrationsList.map((i) => wrapIntegrationWithRedaction(i, this.redactFn!))
			: [...this.integrationsList];

		return {
			enabled: this.enabledValue,
			functionId: this.functionIdValue,
			metadata: this.metadataValue,
			recordInputs: this.recordInputsValue,
			recordOutputs: this.recordOutputsValue,
			integrations,
			tracer,
			provider,
			credentialName: this.credentialNameValue,
		};
	}

	/** Shut down the tracer provider if one was created via .otlpEndpoint(). */
	static async shutdown(telemetry: BuiltTelemetry): Promise<void> {
		if (telemetry.provider) {
			await telemetry.provider.shutdown();
		}
	}
}
