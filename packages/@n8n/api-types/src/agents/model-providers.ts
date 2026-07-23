export const AGENT_MODEL_PROVIDERS = [
	'openai',
	'anthropic',
	'google',
	'azure-openai',
	'aws-bedrock',
	'xai',
	'groq',
	'openrouter',
	'deepseek',
	'cohere',
	'mistral',
	'vercel',
	'nvidia',
] as const;

export type AgentModelProvider = (typeof AGENT_MODEL_PROVIDERS)[number];

const AGENT_MODEL_PROVIDER_SET = new Set<string>(AGENT_MODEL_PROVIDERS);

export function isAgentModelProvider(provider: string): provider is AgentModelProvider {
	return AGENT_MODEL_PROVIDER_SET.has(provider);
}

/** A model offered in the agent model picker. Mirrors the catalog's `ModelInfo` shape. */
export interface AgentCatalogModel {
	id: string;
	name: string;
	releaseDate?: string;
	reasoning: boolean;
	toolCall: boolean;
	cost?: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
	limits?: { context?: number; output?: number };
}

/** Response of `GET /agents/v2/catalog/models/:provider`. */
export interface AgentProviderModelsResponse {
	provider: string;
	/**
	 * True when the list was confirmed against the provider's own model API
	 * (only models the credential can actually call). False means the static
	 * catalog fallback, which may include models the provider has retired.
	 */
	verified: boolean;
	models: AgentCatalogModel[];
}
