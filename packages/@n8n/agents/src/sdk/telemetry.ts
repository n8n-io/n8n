import type { Attributes, Context, Span, SpanOptions, Tracer } from '@opentelemetry/api';
import type { Telemetry as AiSdkTelemetry } from 'ai';

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
 * Wrap an AI SDK telemetry integration so every hook passes event data through
 * the redact callback before forwarding to the original hook.
 */
function wrapIntegrationWithRedaction(
	integration: AiSdkTelemetry,
	redact: RedactFn,
): AiSdkTelemetry {
	const wrapped: AiSdkTelemetry = {};

	if (integration.onStart) {
		const orig = integration.onStart.bind(integration);
		wrapped.onStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onStepStart) {
		const orig = integration.onStepStart.bind(integration);
		wrapped.onStepStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onLanguageModelCallStart) {
		const orig = integration.onLanguageModelCallStart.bind(integration);
		wrapped.onLanguageModelCallStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onLanguageModelCallEnd) {
		const orig = integration.onLanguageModelCallEnd.bind(integration);
		wrapped.onLanguageModelCallEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onToolExecutionStart) {
		const orig = integration.onToolExecutionStart.bind(integration);
		wrapped.onToolExecutionStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onToolExecutionEnd) {
		const orig = integration.onToolExecutionEnd.bind(integration);
		wrapped.onToolExecutionEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onStepEnd) {
		const orig = integration.onStepEnd.bind(integration);
		wrapped.onStepEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onStepFinish) {
		const orig = integration.onStepFinish.bind(integration);
		wrapped.onStepFinish = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onObjectStepStart) {
		const orig = integration.onObjectStepStart.bind(integration);
		wrapped.onObjectStepStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onObjectStepEnd) {
		const orig = integration.onObjectStepEnd.bind(integration);
		wrapped.onObjectStepEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onEmbedStart) {
		const orig = integration.onEmbedStart.bind(integration);
		wrapped.onEmbedStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onEmbedEnd) {
		const orig = integration.onEmbedEnd.bind(integration);
		wrapped.onEmbedEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onRerankStart) {
		const orig = integration.onRerankStart.bind(integration);
		wrapped.onRerankStart = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onRerankEnd) {
		const orig = integration.onRerankEnd.bind(integration);
		wrapped.onRerankEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onEnd) {
		const orig = integration.onEnd.bind(integration);
		wrapped.onEnd = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onAbort) {
		const orig = integration.onAbort.bind(integration);
		wrapped.onAbort = (event) => orig(redactEvent(event, redact));
	}
	if (integration.onError) {
		const orig = integration.onError.bind(integration);
		wrapped.onError = (error) => orig(redactValue(error, redact));
	}
	if (integration.executeLanguageModelCall) {
		const orig = integration.executeLanguageModelCall.bind(integration);
		wrapped.executeLanguageModelCall = (options) => {
			const redacted = redactEvent(options, redact);
			return orig({ ...redacted, callId: options.callId, execute: options.execute });
		};
	}
	if (integration.executeTool) {
		const orig = integration.executeTool.bind(integration);
		wrapped.executeTool = (options) => {
			const redacted = redactEvent(options, redact);
			return orig({
				...redacted,
				callId: options.callId,
				toolCallId: options.toolCallId,
				execute: options.execute,
			});
		};
	}

	return wrapped;
}

function isOpenTelemetryTracer(value: unknown): value is Tracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startSpan') === 'function' &&
		typeof Reflect.get(value, 'startActiveSpan') === 'function'
	);
}

class MetadataEnrichedTracer implements Tracer {
	constructor(
		private readonly delegate: Tracer,
		private readonly attributes: Attributes,
	) {}

	startSpan(name: string, options?: SpanOptions, context?: Context): Span {
		return this.delegate.startSpan(
			name,
			{
				...options,
				attributes: { ...this.attributes, ...options?.attributes },
			},
			context,
		);
	}

	startActiveSpan<F extends (span: Span) => unknown>(name: string, fn: F): ReturnType<F>;
	startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		options: SpanOptions,
		fn: F,
	): ReturnType<F>;
	startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		options: SpanOptions,
		context: Context,
		fn: F,
	): ReturnType<F>;
	startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		optionsOrFn: SpanOptions | F,
		contextOrFn?: Context | F,
		fn?: F,
	): ReturnType<F> {
		if (typeof optionsOrFn === 'function') {
			return this.delegate.startActiveSpan(name, optionsOrFn);
		}

		const options = {
			...optionsOrFn,
			attributes: { ...this.attributes, ...optionsOrFn.attributes },
		};
		if (typeof contextOrFn === 'function') {
			return this.delegate.startActiveSpan(name, options, contextOrFn);
		}
		if (contextOrFn === undefined || fn === undefined) {
			throw new Error('OpenTelemetry active span callback is required.');
		}

		return this.delegate.startActiveSpan(name, options, contextOrFn, fn);
	}
}

function createMetadataEnrichedTracer(
	tracer: Tracer,
	metadata: Record<string, AttributeValue> | undefined,
): Tracer {
	if (!metadata || Object.keys(metadata).length === 0) return tracer;

	const attributes = Object.fromEntries(
		Object.entries(metadata).map(([key, value]) => [`ai.telemetry.metadata.${key}`, value]),
	);
	return new MetadataEnrichedTracer(tracer, attributes);
}

async function createAiSdkOpenTelemetryIntegrationFactory(
	tracer: OpaqueTracer,
): Promise<(metadata: Record<string, AttributeValue> | undefined) => AiSdkTelemetry> {
	if (!isOpenTelemetryTracer(tracer)) {
		throw new Error('Telemetry tracer must implement startSpan() and startActiveSpan().');
	}

	const { LegacyOpenTelemetry } = await import('@ai-sdk/otel');
	return (metadata) =>
		new LegacyOpenTelemetry({ tracer: createMetadataEnrichedTracer(tracer, metadata) });
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
 * collector. Add AI SDK `Telemetry` hooks via `.integration()`.
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

	protected runtimeRootSpanEnabledValue = true;

	protected redactFn?: RedactFn;

	protected integrationsList: AiSdkTelemetry[] = [];

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

	/** Enable or disable the generic AgentRuntime root span around generate/stream loops. */
	runtimeRootSpan(value: boolean): this {
		this.runtimeRootSpanEnabledValue = value;
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
	integration(value: AiSdkTelemetry): this {
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

		const redactFn = this.redactFn;
		const customIntegrations = redactFn
			? this.integrationsList.map((integration) =>
					wrapIntegrationWithRedaction(integration, redactFn),
				)
			: [...this.integrationsList];
		let resolveIntegrations: BuiltTelemetry['resolveIntegrations'];
		let integrations = customIntegrations;
		if (tracer !== undefined) {
			const createOpenTelemetryIntegration =
				await createAiSdkOpenTelemetryIntegrationFactory(tracer);
			resolveIntegrations = (metadata) => {
				const integration = createOpenTelemetryIntegration(metadata);
				return [
					redactFn ? wrapIntegrationWithRedaction(integration, redactFn) : integration,
					...customIntegrations,
				];
			};
			integrations = resolveIntegrations(this.metadataValue);
		}

		return {
			enabled: this.enabledValue,
			functionId: this.functionIdValue,
			metadata: this.metadataValue,
			recordInputs: this.recordInputsValue,
			recordOutputs: this.recordOutputsValue,
			runtimeRootSpanEnabled: this.runtimeRootSpanEnabledValue,
			integrations,
			...(resolveIntegrations && { resolveIntegrations }),
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

	/** Best-effort provider flush. Telemetry export must not affect agent execution. */
	static async forceFlush(telemetry: BuiltTelemetry | undefined): Promise<void> {
		try {
			await telemetry?.provider?.forceFlush();
		} catch {
			// Telemetry flush is best-effort — never block the response or mask the real error.
		}
	}
}
