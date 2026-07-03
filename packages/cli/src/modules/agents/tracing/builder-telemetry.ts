import type { ModelConfig, LangSmithTelemetry as RuntimeLangSmithTelemetry } from '@n8n/agents';

const DEFAULT_PROJECT_NAME = 'agent-builder';
const UNKNOWN_MODEL_ID = 'unknown';

export interface BuilderTelemetryProxyConfig {
	apiUrl: string;
	getAuthHeaders: () => Promise<Record<string, string>>;
}

function readBooleanEnvFlag(value: string | undefined): boolean | undefined {
	const normalized = value?.toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return undefined;
}

/**
 * Tracing is on when an API key is present and the tracing flag is not
 * explicitly disabled. In Cloud, the AI assistant service proxy manages
 * LangSmith auth, so proxy availability is the only no-local-key path.
 */
export function isLangSmithEnabled(
	env: NodeJS.ProcessEnv = process.env,
	proxyAvailable = false,
): boolean {
	if (readBooleanEnvFlag(env.N8N_DIAGNOSTICS_ENABLED) === false) return false;

	const tracingFlag = readBooleanEnvFlag(env.LANGCHAIN_TRACING_V2 ?? env.LANGSMITH_TRACING);
	if (tracingFlag === false) return false;
	if (proxyAvailable) return true;

	return Boolean(env.LANGSMITH_API_KEY ?? env.LANGCHAIN_API_KEY);
}

/**
 * Flatten the `ModelConfig` union into a stable `provider/model` string for
 * trace metadata. Handles plain ids, typed configs with an `id` field, and
 * AI SDK `LanguageModel` instances that expose `modelId` (+ optional `provider`).
 */
export function resolveModelIdForTelemetry(modelConfig: ModelConfig): string {
	if (typeof modelConfig === 'string') return modelConfig;

	if (typeof modelConfig === 'object' && modelConfig !== null) {
		const record = modelConfig as Record<string, unknown>;
		if (typeof record.id === 'string') return record.id;
		if (typeof record.modelId === 'string') {
			return typeof record.provider === 'string'
				? `${record.provider}/${record.modelId}`
				: record.modelId;
		}
	}

	return UNKNOWN_MODEL_ID;
}

export interface BuilderTelemetryOptions {
	agentId: string;
	projectId: string;
	userId: string;
	threadId: string;
	model: ModelConfig;
	tracingProxyConfig?: BuilderTelemetryProxyConfig;
}

/**
 * Build a `LangSmithTelemetry` for the agent builder. Returns `undefined` when
 * tracing is not enabled so callers can attach unconditionally with a guard.
 *
 * The agents SDK auto-wires AI SDK spans (generate/stream/tool calls) into the
 * tracer, so we only need to seed identifying metadata here — no manual
 * `RunTree` plumbing.
 */
export async function buildBuilderTelemetry(
	options: BuilderTelemetryOptions,
	env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimeLangSmithTelemetry | undefined> {
	const { tracingProxyConfig } = options;
	if (!isLangSmithEnabled(env, !!tracingProxyConfig)) return undefined;

	const project = env.LANGSMITH_PROJECT ?? env.LANGCHAIN_PROJECT ?? DEFAULT_PROJECT_NAME;
	const endpoint = env.LANGSMITH_ENDPOINT ?? env.LANGCHAIN_ENDPOINT;
	const { LangSmithTelemetry } = await import('@n8n/agents');
	return new LangSmithTelemetry({
		project,
		...(tracingProxyConfig
			? {
					apiKey: '-',
					endpoint: tracingProxyConfig.apiUrl,
					headers: tracingProxyConfig.getAuthHeaders,
				}
			: endpoint
				? { endpoint }
				: {}),
	})
		.functionId('agent-builder')
		.metadata({
			agent_id: options.agentId,
			project_id: options.projectId,
			user_id: options.userId,
			thread_id: options.threadId,
			model_id: resolveModelIdForTelemetry(options.model),
		});
}
