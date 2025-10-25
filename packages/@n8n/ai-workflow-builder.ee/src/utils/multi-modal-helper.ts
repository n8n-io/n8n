import type { MultiModalConfig } from '@/types/multi-modal';

/**
 * Validates multi-modal configuration
 */
export function validateMultiModalConfig(config: MultiModalConfig): string[] {
	const errors: string[] = [];

	if (!config.provider) {
		errors.push('Provider is required');
	}

	if (config.provider !== 'ollama' && !config.apiKey) {
		errors.push('API key is required for this provider');
	}

	if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
		errors.push('Temperature must be between 0 and 2');
	}

	if (config.maxTokens !== undefined && config.maxTokens < 1) {
		errors.push('Max tokens must be greater than 0');
	}

	return errors;
}

/**
 * Gets environment variable API key for a provider
 */
export function getProviderApiKey(provider: string): string | undefined {
	const envKeys = {
		openai: 'N8N_AI_OPENAI_KEY',
		anthropic: 'N8N_AI_ANTHROPIC_KEY',
		google: 'N8N_AI_GOOGLE_KEY',
		groq: 'N8N_AI_GROQ_KEY',
		cohere: 'N8N_AI_COHERE_KEY',
	};

	const envKey = envKeys[provider as keyof typeof envKeys];
	return envKey ? process.env[envKey] : undefined;
}

/**
 * Merges user config with environment variables and defaults
 */
export function mergeMultiModalConfig(userConfig: Partial<MultiModalConfig>): MultiModalConfig {
	const provider = userConfig.provider || 'anthropic';
	const envApiKey = getProviderApiKey(provider);

	return {
		provider,
		model: userConfig.model,
		apiKey: userConfig.apiKey || envApiKey || '',
		baseUrl: userConfig.baseUrl,
		temperature: userConfig.temperature ?? 0.7,
		maxTokens: userConfig.maxTokens ?? 4000,
	};
}
