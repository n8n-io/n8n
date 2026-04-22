import { Telemetry } from '../sdk/telemetry';
import type { BuiltTelemetry, OpaqueTracer, OpaqueTracerProvider } from '../types/telemetry';

export interface LangSmithTelemetryConfig {
	/** LangSmith API key. If omitted, resolved via `.credential()` or LANGSMITH_API_KEY env var. */
	apiKey?: string;
	/** LangSmith project name. Falls back to LANGSMITH_PROJECT env var, then 'default'. */
	project?: string;
	/** LangSmith API base URL. Falls back to LANGSMITH_ENDPOINT env var. */
	endpoint?: string;
	/**
	 * Override the full OTLP traces URL. Normally derived from `endpoint`
	 * as `${endpoint}/otel/v1/traces`. Use this for custom collectors or testing.
	 */
	url?: string;
}

/**
 * Create the LangSmith OTel tracer + provider from config.
 * Dynamically imports langsmith and OTel packages so they remain
 * optional peer dependencies.
 */
async function createLangSmithTracer(
	config?: LangSmithTelemetryConfig,
	resolvedApiKey?: string,
): Promise<{ tracer: OpaqueTracer; provider: OpaqueTracerProvider }> {
	const { NodeTracerProvider } = (await import('@opentelemetry/sdk-trace-node')) as {
		NodeTracerProvider: new (cfg?: {
			spanProcessors?: unknown[];
		}) => OpaqueTracerProvider & {
			getTracer(name: string): OpaqueTracer;
		};
	};

	const { LangSmithOTLPTraceExporter } = (await import('langsmith/experimental/otel/exporter')) as {
		LangSmithOTLPTraceExporter: new (cfg?: {
			apiKey?: string;
			projectName?: string;
			endpoint?: string;
		}) => unknown;
	};

	const { LangSmithOTLPSpanProcessor } = (await import(
		'langsmith/experimental/otel/processor'
	)) as {
		LangSmithOTLPSpanProcessor: new (exporter: unknown) => unknown;
	};

	// SECURITY: When the engine-resolved credential is the active key (i.e. no
	// explicit config.apiKey overrides it), ignore user-provided url/endpoint to
	// prevent redirecting the injected API key to an arbitrary host.
	const apiKey = config?.apiKey ?? resolvedApiKey;
	const usingResolvedKey = !config?.apiKey && resolvedApiKey !== undefined;
	const url = usingResolvedKey
		? undefined
		: (config?.url ??
			(config?.endpoint ? `${config.endpoint.replace(/\/$/, '')}/otel/v1/traces` : undefined));

	const exporter = new LangSmithOTLPTraceExporter({
		apiKey,
		projectName: config?.project,
		...(url ? { url } : {}),
	});

	const processor = new LangSmithOTLPSpanProcessor(exporter);

	const provider = new NodeTracerProvider({
		spanProcessors: [processor],
	});
	// Do NOT call provider.register() — avoid polluting the global tracer provider.

	return { tracer: provider.getTracer('@n8n/agents'), provider };
}

/**
 * Pre-built telemetry for LangSmith. Extends `Telemetry` so all builder
 * methods (`.credential()`, `.functionId()`, `.recordOutputs()`, `.redact()`,
 * etc.) are available.
 *
 * Requires `langsmith` and `@opentelemetry/sdk-trace-node` as peer dependencies.
 *
 * @example
 * ```typescript
 * import { Agent, LangSmithTelemetry } from '@n8n/agents';
 *
 * const telemetry = new LangSmithTelemetry({ project: 'my-project' })
 *   .credential('langsmith')
 *   .recordOutputs(false);
 *
 * const agent = new Agent('assistant')
 *   .model('anthropic/claude-sonnet-4-5')
 *   .telemetry(telemetry)
 *   .instructions('...');
 * ```
 */
export class LangSmithTelemetry extends Telemetry {
	private langsmithConfig?: LangSmithTelemetryConfig;

	constructor(config?: LangSmithTelemetryConfig) {
		super();
		this.langsmithConfig = config;
	}

	/** @override Build telemetry config, creating the LangSmith tracer. */
	override async build(): Promise<BuiltTelemetry> {
		if (this.otlpEndpointValue !== undefined) {
			throw new Error('LangSmithTelemetry creates its own tracer — do not use .otlpEndpoint().');
		}

		// Clear any tracer from a previous build() so the parent's
		// .tracer()/.otlpEndpoint() mutual-exclusion check passes cleanly.
		this.tracerValue = undefined;

		// The LangSmith exporter silently drops all spans unless this is set.
		// Auto-enable it so users don't have to remember a magic env var.
		process.env.LANGCHAIN_TRACING_V2 ??= 'true';

		const { tracer, provider } = await createLangSmithTracer(
			this.langsmithConfig,
			this.resolvedKey,
		);
		this.tracerValue = tracer;

		// Call parent build() which handles integrations, redaction, etc.
		const built = await super.build();

		// Attach the provider for flush/shutdown (parent build sets it from
		// otlpEndpoint but not from .tracer(), so we add it here).
		return { ...built, provider };
	}
}
