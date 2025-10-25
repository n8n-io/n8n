export interface MultiModalConfig {
	provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'cohere' | 'openrouter';
	model?: string;
	apiKey?: string;
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
}

export interface ProviderModel {
	name: string;
	value: string;
	description?: string;
}

export interface ProviderInfo {
	name: string;
	value: string;
	models: ProviderModel[];
	requiresApiKey: boolean;
	supportsCustomUrl: boolean;
	defaultModel: string;
}

export const PROVIDERS: ProviderInfo[] = [
	{
		name: 'OpenRouter',
		value: 'openrouter',
		models: [
			{ name: 'Claude 3.5 Sonnet (via OpenRouter)', value: 'anthropic/claude-3.5-sonnet' },
			{ name: 'GPT-4o (via OpenRouter)', value: 'openai/gpt-4o' },
			{ name: 'GPT-4o Mini (via OpenRouter)', value: 'openai/gpt-4o-mini' },
			{ name: 'Gemini Pro 1.5 (via OpenRouter)', value: 'google/gemini-pro-1.5' },
			{ name: 'Llama 3.1 405B (via OpenRouter)', value: 'meta-llama/llama-3.1-405b-instruct' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'anthropic/claude-3.5-sonnet',
	},
	{
		name: 'OpenAI',
		value: 'openai',
		models: [
			{ name: 'GPT-4o', value: 'gpt-4o', description: 'Most capable model' },
			{ name: 'GPT-4o Mini', value: 'gpt-4o-mini', description: 'Fast and efficient' },
			{ name: 'GPT-4 Turbo', value: 'gpt-4-turbo', description: 'Previous generation' },
		],
		requiresApiKey: true,
		supportsCustomUrl: true,
		defaultModel: 'gpt-4o',
	},
	{
		name: 'Anthropic',
		value: 'anthropic',
		models: [
			{
				name: 'Claude 3.5 Sonnet',
				value: 'claude-3-5-sonnet-20241022',
				description: 'Best for complex tasks',
			},
			{
				name: 'Claude 3.5 Haiku',
				value: 'claude-3-5-haiku-20241022',
				description: 'Fast and efficient',
			},
			{ name: 'Claude 3 Opus', value: 'claude-3-opus-20240229', description: 'Most capable' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'claude-3-5-sonnet-20241022',
	},
	{
		name: 'Google Gemini',
		value: 'google',
		models: [
			{ name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', description: 'Most capable' },
			{ name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', description: 'Fast and efficient' },
			{ name: 'Gemini Pro', value: 'gemini-pro', description: 'Previous generation' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'gemini-1.5-pro',
	},
	{
		name: 'Groq',
		value: 'groq',
		models: [
			{ name: 'Llama 3.1 70B', value: 'llama-3.1-70b-versatile', description: 'Most capable' },
			{ name: 'Llama 3.1 8B', value: 'llama-3.1-8b-instant', description: 'Fast inference' },
			{ name: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768', description: 'Large context' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'llama-3.1-70b-versatile',
	},
	{
		name: 'Cohere',
		value: 'cohere',
		models: [
			{ name: 'Command R+', value: 'command-r-plus', description: 'Most capable' },
			{ name: 'Command R', value: 'command-r', description: 'Balanced performance' },
			{ name: 'Command', value: 'command', description: 'General purpose' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'command-r-plus',
	},
];

export const getProviderInfo = (provider: string): ProviderInfo | undefined => {
	return PROVIDERS.find((p) => p.value === provider);
};

export const getDefaultConfig = (provider: string): Partial<MultiModalConfig> => {
	const providerInfo = getProviderInfo(provider);
	return {
		provider: provider as MultiModalConfig['provider'],
		model: providerInfo?.defaultModel,
		temperature: 0.7,
		maxTokens: 4000,
	};
};
