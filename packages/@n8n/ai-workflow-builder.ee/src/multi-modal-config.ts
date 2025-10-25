import { MAX_OUTPUT_TOKENS } from '@/constants';

interface LLMProviderConfig {
	apiKey: string;
	baseUrl?: string;
	headers?: Record<string, string>;
	provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'cohere';
	model?: string;
	temperature?: number;
	maxTokens?: number;
}

export const createMultiModalLLM = async (config: LLMProviderConfig) => {
	const { provider, model, temperature = 0, maxTokens = MAX_OUTPUT_TOKENS } = config;

	switch (provider) {
		case 'openai': {
			const { ChatOpenAI } = await import('@langchain/openai');
			return new ChatOpenAI({
				model: model || 'gpt-4o',
				apiKey: config.apiKey,
				temperature,
				maxTokens: maxTokens > 0 ? maxTokens : undefined,
				configuration: {
					baseURL: config.baseUrl,
					defaultHeaders: config.headers,
				},
			});
		}

		case 'anthropic': {
			const { ChatAnthropic } = await import('@langchain/anthropic');
			const llm = new ChatAnthropic({
				model: model || 'claude-3-5-sonnet-20241022',
				apiKey: config.apiKey,
				temperature,
				maxTokens,
				anthropicApiUrl: config.baseUrl,
				clientOptions: {
					defaultHeaders: config.headers,
				},
			});
			if (temperature === 0) delete llm.topP;
			return llm;
		}

		case 'google': {
			const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
			return new ChatGoogleGenerativeAI({
				model: model || 'gemini-1.5-pro',
				apiKey: config.apiKey,
				temperature,
				maxOutputTokens: maxTokens,
			});
		}

		case 'groq': {
			const { ChatGroq } = await import('@langchain/groq');
			return new ChatGroq({
				model: model || 'llama-3.1-70b-versatile',
				apiKey: config.apiKey,
				temperature,
				maxTokens,
			});
		}

		case 'cohere': {
			const { ChatCohere } = await import('@langchain/cohere');
			return new ChatCohere({
				model: model || 'command-r-plus',
				apiKey: config.apiKey,
				temperature,
				maxTokens,
			});
		}

		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
};

// Provider-specific model configurations
export const PROVIDER_MODELS = {
	openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
	anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
	google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
	groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
	cohere: ['command-r-plus', 'command-r', 'command', 'command-light'],
} as const;
