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

/** Canonical `provider/model-name` validation shared by API schemas and editor parsing. */
export const AGENT_MODEL_STRING_REGEX = /^[a-z0-9-]+\/(?:[a-z0-9._:-]+\/)*[a-z0-9._:-]+$/i;

export type AgentModelProvider = (typeof AGENT_MODEL_PROVIDERS)[number];

const AGENT_MODEL_PROVIDER_SET = new Set<string>(AGENT_MODEL_PROVIDERS);

export function isAgentModelProvider(provider: string): provider is AgentModelProvider {
	return AGENT_MODEL_PROVIDER_SET.has(provider);
}

/**
 * The n8n credential types that can drive each model provider, in preference
 * order. Single source of truth: the model picker, the n8n Connect support gate
 * and the model catalog all answer "which credential type serves this provider?"
 * from here. Deriving it separately (e.g. by parsing a gateway URL path) makes
 * the answer depend on unrelated naming schemes agreeing by coincidence.
 */
export const AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES = {
	openai: ['openAiApi'],
	anthropic: ['anthropicApi'],
	google: ['googlePalmApi'],
	'azure-openai': ['azureOpenAiApi', 'azureEntraCognitiveServicesOAuth2Api'],
	'aws-bedrock': ['aws'],
	xai: ['xAiApi'],
	groq: ['groqApi'],
	openrouter: ['openRouterApi'],
	deepseek: ['deepSeekApi'],
	cohere: ['cohereApi'],
	mistral: ['mistralCloudApi'],
	vercel: ['vercelAiGatewayApi'],
	nvidia: ['nvidiaApi'],
} as const satisfies Record<AgentModelProvider, readonly [string, ...string[]]>;

/** Credential types for a provider prefix, or `[]` when it is not a model provider. */
export function getAgentModelProviderCredentialTypes(provider: string): readonly string[] {
	return isAgentModelProvider(provider) ? AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES[provider] : [];
}

/** A model offered in the agent model picker. Mirrors the catalog's `ModelInfo` shape. */
export interface AgentCatalogModel {
	id: string;
	name: string;
	releaseDate?: string;
	reasoning?: boolean;
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
	/**
	 * True when the provider's model list could not be retrieved at all (e.g. the
	 * n8n Connect gateway was unreachable), as opposed to a list that is genuinely
	 * empty. Lets the picker say "couldn't load" instead of "no models available".
	 */
	unavailable?: boolean;
	models: AgentCatalogModel[];
}
