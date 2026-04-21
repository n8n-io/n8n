import type { ChatHubLLMProvider } from '@n8n/api-types';

/**
 * Maps ChatHub provider IDs (camelCase, e.g. 'xAiGrok') to Agent SDK catalog
 * IDs (lowercase, e.g. 'xai') used by the models.dev catalog and the agent
 * code's `.model('provider', 'model-name')` call.
 */
export const CHATHUB_TO_CATALOG: Record<string, string> = {
	openai: 'openai',
	anthropic: 'anthropic',
	google: 'google',
	ollama: 'ollama',
	azureOpenAi: 'azure-openai',
	azureEntraId: 'azure-openai',
	awsBedrock: 'aws-bedrock',
	vercelAiGateway: 'vercel',
	xAiGrok: 'xai',
	groq: 'groq',
	openRouter: 'openrouter',
	deepSeek: 'deepseek',
	cohere: 'cohere',
	mistralCloud: 'mistral',
};

/**
 * Reverse mapping: catalog ID → ChatHub provider ID.
 * When multiple ChatHub IDs map to the same catalog ID (e.g. azureOpenAi and
 * azureEntraId both map to 'azure-openai'), the first one wins.
 */
export const CATALOG_TO_CHATHUB: Record<string, ChatHubLLMProvider> = {};
for (const [chatHub, catalog] of Object.entries(CHATHUB_TO_CATALOG)) {
	if (!(catalog in CATALOG_TO_CHATHUB)) {
		CATALOG_TO_CHATHUB[catalog] = chatHub as ChatHubLLMProvider;
	}
}

/**
 * ChatHub provider IDs that the @n8n/agents runtime does not support.
 * These are filtered out in the Agents UI so users cannot select them.
 */
export const AGENT_UNSUPPORTED_PROVIDERS = new Set<string>(['ollama']);

/**
 * Normalise a model id picked from the ChatHub model catalog into the form
 * the agents runtime expects after the `<provider>/` prefix.
 *
 * Currently strips the `models/` prefix from Gemini ids
 * (e.g. `models/gemini-2.5-flash` → `gemini-2.5-flash`) — the catalog
 * returns these prefixed but the AI SDK's Google provider rejects them.
 *
 * The `provider` argument is the catalog (lowercase) provider id, i.e. a
 * value of {@link CHATHUB_TO_CATALOG}.
 */
export function sanitizeModelId(provider: string, modelId: string): string {
	if (provider === 'google') return modelId.replace(/^models\//, '');
	return modelId;
}
