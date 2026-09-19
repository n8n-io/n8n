import { AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES, type AgentModelProvider } from '@n8n/api-types';

export {
	AGENT_MODEL_PROVIDERS,
	isAgentModelProvider,
	type AgentModelProvider,
} from '@n8n/api-types';

export interface AgentModelOption {
	provider: AgentModelProvider;
	model: string;
	name: string;
	description?: string | null;
	createdAt?: string | null;
	metadata: {
		functionCalling: boolean;
		available: boolean;
	};
}

export interface AgentModelsForProvider {
	models: AgentModelOption[];
	/** The list could not be retrieved, as opposed to being genuinely empty. */
	unavailable?: boolean;
}

export type AgentModelsByProvider = Partial<Record<AgentModelProvider, AgentModelsForProvider>>;
export type AgentCredentialsByProvider = Partial<Record<AgentModelProvider, string | null>>;

export interface AgentModelSelection {
	provider: AgentModelProvider;
	model: string;
}

/**
 * Presentation only. The provider's credential types live in
 * `AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES` (`@n8n/api-types`) so the backend's
 * n8n Connect gate and this picker cannot drift apart.
 */
export const AGENT_MODEL_PROVIDER_DEFINITIONS = {
	openai: { displayName: 'OpenAI' },
	anthropic: { displayName: 'Anthropic' },
	google: { displayName: 'Google' },
	'azure-openai': { displayName: 'Azure OpenAI' },
	'aws-bedrock': { displayName: 'AWS Bedrock', isAggregator: true },
	xai: { displayName: 'xAI' },
	groq: { displayName: 'Groq' },
	openrouter: { displayName: 'OpenRouter', isAggregator: true },
	deepseek: { displayName: 'DeepSeek' },
	cohere: { displayName: 'Cohere' },
	mistral: { displayName: 'Mistral' },
	vercel: { displayName: 'Vercel AI Gateway', isAggregator: true },
	nvidia: { displayName: 'NVIDIA' },
	moonshotai: { displayName: 'Moonshot' },
	alibaba: { displayName: 'Qwen Cloud' },
	minimax: { displayName: 'MiniMax' },
	volcengine: { displayName: 'Volcengine Ark' },
} satisfies Record<
	AgentModelProvider,
	{
		displayName: string;
		isAggregator?: boolean;
	}
>;

export function getProviderCredentialTypes(
	provider: AgentModelProvider,
): readonly [string, ...string[]] {
	return AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES[provider];
}
