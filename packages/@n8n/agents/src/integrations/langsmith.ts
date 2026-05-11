import { Telemetry } from '../sdk/telemetry';
import type { BuiltTelemetry, OpaqueTracer, OpaqueTracerProvider } from '../types/telemetry';

let registeredOtelContext = false;

const LANGSMITH_TRACEABLE = 'langsmith.traceable';
const LANGSMITH_IS_ROOT = 'langsmith.is_root';
const LANGSMITH_PARENT_RUN_ID = 'langsmith.span.parent_id';
const LANGSMITH_TRACEABLE_PARENT_OTEL_SPAN_ID = 'langsmith.traceable_parent_otel_span_id';
const AI_OPERATION_ID = 'ai.operationId';
const TRACEABLE_AI_SDK_OPERATIONS = new Set([
	'ai.generateText.doGenerate',
	'ai.streamText.doStream',
	'ai.generateObject.doGenerate',
	'ai.streamObject.doStream',
	'ai.toolCall',
]);

interface OtelSpanLike {
	attributes: Record<string, unknown>;
	spanContext(): {
		traceId: string;
		spanId: string;
	};
	parentSpanId?: string;
	parentSpanContext?: {
		spanId?: string;
	};
}

interface SpanProcessorLike {
	forceFlush(): Promise<void>;
	onStart(span: unknown, parentContext: unknown): void;
	onEnd(span: unknown): void;
	shutdown(): Promise<void>;
}

interface BatchSpanProcessorConstructor {
	new (exporter: unknown): SpanProcessorLike;
}

interface LangSmithRunTree {
	getSharedClient(): {
		awaitPendingTraceBatches(): Promise<void>;
	};
}

function isOtelSpanLike(value: unknown): value is OtelSpanLike {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'spanContext') === 'function' &&
		typeof Reflect.get(value, 'attributes') === 'object'
	);
}

function getParentSpanId(span: OtelSpanLike): string | undefined {
	return span.parentSpanId ?? span.parentSpanContext?.spanId;
}

function getUuidFromOtelSpanId(spanId: string): string {
	const paddedHex = spanId.padStart(16, '0');
	return `00000000-0000-0000-${paddedHex.substring(0, 4)}-${paddedHex.substring(4, 16)}`;
}

function isTraceableSpan(span: OtelSpanLike): boolean {
	const operationId = span.attributes[AI_OPERATION_ID];
	return (
		span.attributes[LANGSMITH_TRACEABLE] === 'true' ||
		(typeof operationId === 'string' && TRACEABLE_AI_SDK_OPERATIONS.has(operationId))
	);
}

function createLangSmithSpanProcessor(options: {
	exporter: unknown;
	BatchSpanProcessor: BatchSpanProcessorConstructor;
	RunTree: LangSmithRunTree;
}): SpanProcessorLike {
	const delegate = new options.BatchSpanProcessor(options.exporter);
	const traceMap: Record<
		string,
		{
			spanCount: number;
			spanInfo: Record<string, { isTraceable: boolean; parentSpanId?: string }>;
		}
	> = {};

	return {
		async forceFlush() {
			await delegate.forceFlush();
		},

		onStart(span, parentContext) {
			if (!isOtelSpanLike(span)) {
				delegate.onStart(span, parentContext);
				return;
			}

			const spanContext = span.spanContext();
			traceMap[spanContext.traceId] ??= {
				spanCount: 0,
				spanInfo: {},
			};

			const traceInfo = traceMap[spanContext.traceId];
			traceInfo.spanCount++;
			const traceable = isTraceableSpan(span);
			const parentSpanId = getParentSpanId(span);
			traceInfo.spanInfo[spanContext.spanId] = {
				isTraceable: traceable,
				...(parentSpanId ? { parentSpanId } : {}),
			};

			let currentCandidateParentSpanId = parentSpanId;
			let traceableParentSpanId: string | undefined;
			while (currentCandidateParentSpanId) {
				const currentSpanInfo = traceInfo.spanInfo[currentCandidateParentSpanId];
				if (currentSpanInfo?.isTraceable) {
					traceableParentSpanId = currentCandidateParentSpanId;
					break;
				}
				currentCandidateParentSpanId = currentSpanInfo?.parentSpanId;
			}

			if (!traceableParentSpanId) {
				span.attributes[LANGSMITH_IS_ROOT] = true;
			} else {
				span.attributes[LANGSMITH_PARENT_RUN_ID] = getUuidFromOtelSpanId(traceableParentSpanId);
				span.attributes[LANGSMITH_TRACEABLE_PARENT_OTEL_SPAN_ID] = traceableParentSpanId;
			}

			if (traceable) {
				delegate.onStart(span, parentContext);
			}
		},

		onEnd(span) {
			if (!isOtelSpanLike(span)) {
				delegate.onEnd(span);
				return;
			}

			const spanContext = span.spanContext();
			const traceInfo = traceMap[spanContext.traceId];
			const spanInfo = traceInfo?.spanInfo[spanContext.spanId];
			if (!traceInfo || !spanInfo) return;

			traceInfo.spanCount--;
			if (traceInfo.spanCount <= 0) {
				delete traceMap[spanContext.traceId];
			}

			if (spanInfo.isTraceable) {
				delegate.onEnd(span);
			}
		},

		async shutdown() {
			await options.RunTree.getSharedClient().awaitPendingTraceBatches();
			await delegate.shutdown();
		},
	};
}

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
	/** Default headers to send with LangSmith OTLP export requests. */
	headers?: Record<string, string> | (() => Promise<Record<string, string>>);
	/** Optional hook for redacting or annotating spans before LangSmith export. */
	transformExportedSpan?: (span: unknown) => unknown;
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
			register(config?: { propagator?: null }): void;
		};
	};

	const { LangSmithOTLPTraceExporter } = (await import('langsmith/experimental/otel/exporter')) as {
		LangSmithOTLPTraceExporter: new (cfg?: {
			apiKey?: string;
			projectName?: string;
			url?: string;
			headers?: Record<string, string>;
			transformExportedSpan?: (span: unknown) => unknown;
		}) => unknown;
	};
	const { BatchSpanProcessor } = (await import('@opentelemetry/sdk-trace-base')) as {
		BatchSpanProcessor: BatchSpanProcessorConstructor;
	};
	const { RunTree } = (await import('langsmith')) as {
		RunTree: LangSmithRunTree;
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
	const headers = typeof config?.headers === 'function' ? await config.headers() : config?.headers;

	const exporter = new LangSmithOTLPTraceExporter({
		apiKey,
		projectName: config?.project,
		...(headers ? { headers } : {}),
		...(config?.transformExportedSpan
			? { transformExportedSpan: config.transformExportedSpan }
			: {}),
		...(url ? { url } : {}),
	});

	const processor = createLangSmithSpanProcessor({
		exporter,
		BatchSpanProcessor,
		RunTree,
	});

	const provider = new NodeTracerProvider({
		spanProcessors: [processor],
	});
	if (!registeredOtelContext) {
		// AI SDK creates nested operation/provider/tool spans through the active
		// OpenTelemetry context. Without the Node context manager these spans are
		// exported as separate root traces even when an explicit tracer is passed.
		provider.register({ propagator: null });
		registeredOtelContext = true;
	}

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
