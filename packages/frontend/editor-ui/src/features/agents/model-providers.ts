import type { AgentModelProvider } from '@n8n/api-types';

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
	error?: string;
}

export type AgentModelsByProvider = Partial<Record<AgentModelProvider, AgentModelsForProvider>>;
export type AgentCredentialsByProvider = Partial<Record<AgentModelProvider, string | null>>;

export interface AgentModelSelection {
	provider: AgentModelProvider;
	model: string;
}

export const AGENT_MODEL_PROVIDER_DEFINITIONS = {
	openai: {
		displayName: 'OpenAI',
		credentialTypes: ['openAiApi'],
	},
	anthropic: {
		displayName: 'Anthropic',
		credentialTypes: ['anthropicApi'],
	},
	google: {
		displayName: 'Google',
		credentialTypes: ['googlePalmApi'],
	},
	'azure-openai': {
		displayName: 'Azure OpenAI',
		credentialTypes: ['azureOpenAiApi', 'azureEntraCognitiveServicesOAuth2Api'],
	},
	'aws-bedrock': {
		displayName: 'AWS Bedrock',
		credentialTypes: ['aws'],
		isAggregator: true,
	},
	xai: {
		displayName: 'xAI',
		credentialTypes: ['xAiApi'],
	},
	groq: {
		displayName: 'Groq',
		credentialTypes: ['groqApi'],
	},
	openrouter: {
		displayName: 'OpenRouter',
		credentialTypes: ['openRouterApi'],
		isAggregator: true,
	},
	deepseek: {
		displayName: 'DeepSeek',
		credentialTypes: ['deepSeekApi'],
	},
	cohere: {
		displayName: 'Cohere',
		credentialTypes: ['cohereApi'],
	},
	mistral: {
		displayName: 'Mistral',
		credentialTypes: ['mistralCloudApi'],
	},
	vercel: {
		displayName: 'Vercel AI Gateway',
		credentialTypes: ['vercelAiGatewayApi'],
		isAggregator: true,
	},
	nvidia: {
		displayName: 'NVIDIA',
		credentialTypes: ['nvidiaApi'],
	},
} satisfies Record<
	AgentModelProvider,
	{
		displayName: string;
		credentialTypes: readonly [string, ...string[]];
		isAggregator?: boolean;
	}
>;
