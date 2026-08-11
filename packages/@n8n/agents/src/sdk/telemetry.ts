import { isRecord } from '@n8n/utils/is-record';
import type { Tracer } from '@opentelemetry/api';
import type { Telemetry as AiSdkTelemetry } from 'ai';

import { createMetadataEnrichedTracer } from './metadata-enriched-tracer';
import type {
	AttributeValue,
	BuiltTelemetry,
	OpaqueTracer,
	OpaqueTracerProvider,
} from '../types/telemetry';

type RedactFn = (data: Record<string, unknown>) => Record<string, unknown>;
type ExecuteHookKey = 'executeLanguageModelCall' | 'executeTool';
// Future on* hooks are wrapped automatically; other SDK members must be classified explicitly.
type RedactableTelemetry = AiSdkTelemetry &
	Record<Exclude<keyof AiSdkTelemetry, `on${string}` | ExecuteHookKey>, never>;
type UnknownMethod = (this: unknown, ...args: unknown[]) => unknown;

const EXECUTION_CONTROL_FIELDS: Record<ExecuteHookKey, string[]> = {
	executeLanguageModelCall: ['callId', 'execute'],
	executeTool: ['callId', 'toolCallId', 'execute'],
};

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
		const redacted = { ...redact(value as Record<string, unknown>) };
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
	const redacted = { ...redact(cloned as unknown as Record<string, unknown>) };
	// Then recurse into each value to handle arrays and nested objects.
	for (const key of Object.keys(redacted)) {
		const value = redacted[key];
		redacted[key] = redactValue(value, redact);
	}
	return redacted as T;
}

function isExecuteHookKey(property: PropertyKey): property is ExecuteHookKey {
	return property === 'executeLanguageModelCall' || property === 'executeTool';
}

function isTelemetryHook(property: PropertyKey): boolean {
	return (typeof property === 'string' && property.startsWith('on')) || isExecuteHookKey(property);
}

function isMethod(value: unknown): value is UnknownMethod {
	return typeof value === 'function';
}

function redactHookArgument(property: PropertyKey, argument: unknown, redact: RedactFn): unknown {
	if (property === 'onError' || !isRecord(argument)) return redactValue(argument, redact);

	const redacted = redactEvent(argument, redact);
	if (isExecuteHookKey(property)) {
		const controlFields = Object.fromEntries(
			EXECUTION_CONTROL_FIELDS[property].map((field) => [field, argument[field]]),
		);
		return { ...redacted, ...controlFields };
	}
	return redacted;
}

/**
 * Wrap an AI SDK telemetry integration so every hook passes event data through
 * the redact callback before forwarding to the original hook.
 */
function wrapIntegrationWithRedaction(
	integration: RedactableTelemetry,
	redact: RedactFn,
): AiSdkTelemetry {
	const methodCache = new Map<PropertyKey, { original: UnknownMethod; wrapped: UnknownMethod }>();
	const facade: AiSdkTelemetry = {};

	return new Proxy(facade, {
		get(_target, property) {
			const original: unknown = Reflect.get(integration, property, integration);
			if (!isTelemetryHook(property) || !isMethod(original)) return original;

			const cached = methodCache.get(property);
			if (cached?.original === original) return cached.wrapped;

			const wrapped: UnknownMethod = function (...args) {
				const [argument, ...rest] = args;
				return Reflect.apply(original, integration, [
					redactHookArgument(property, argument, redact),
					...rest,
				]);
			};
			methodCache.set(property, { original, wrapped });
			return wrapped;
		},
	});
}

function isOpenTelemetryTracer(value: unknown): value is Tracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startSpan') === 'function' &&
		typeof Reflect.get(value, 'startActiveSpan') === 'function'
	);
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
