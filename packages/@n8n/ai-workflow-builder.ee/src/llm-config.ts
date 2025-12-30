// Different LLMConfig type for this file - specific to LLM providers
import { MAX_OUTPUT_TOKENS } from '@/constants';

import { getProxyAgent } from './utils/http-proxy-agent';

interface LLMProviderConfig {
	apiKey: string;
	baseUrl?: string;
	headers?: Record<string, string>;
}

export const o4mini = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'o4-mini-2025-04-16',
		apiKey: config.apiKey,
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};

export const gpt41mini = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'gpt-4.1-mini-2025-04-14',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: -1,
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};

export const gpt41 = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'gpt-4.1-2025-04-14',
		apiKey: config.apiKey,
		temperature: 0.3,
		maxTokens: -1,
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};

export const gpt52ReasoningOff = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'gpt-5.2-2025-12-11',
		apiKey: config.apiKey,
		// temperature: 0.3,
		maxTokens: -1,
		reasoning: { effort: 'none' },
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};

export const gpt52ReasoningLow = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'gpt-5.2-2025-12-11',
		apiKey: config.apiKey,
		// temperature: 0.3,
		maxTokens: -1,
		reasoning: { effort: 'low' },
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};
export const gpt52ReasoningHigh = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'gpt-5.2-2025-12-11',
		apiKey: config.apiKey,
		// temperature: 0.3,
		maxTokens: -1,
		reasoning: { effort: 'high' },
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.openai.com/v1'),
			},
		},
	});
};
export const gemini3Flash = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'google/gemini-3-flash-preview',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};

export const gemini3Pro = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'google/gemini-3-pro-preview',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};
export const glm47 = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'z-ai/glm-4.7',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};
export const miniMax21 = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'minimax/minimax-m2.1',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};

export const grokCodeFast1 = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'x-ai/grok-code-fast-1',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};
export const gptOss20b = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'openai/gpt-oss-safeguard-20b',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};
export const gptOss120b = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'openai/gpt-oss-120b',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://openrouter.ai/api/v1'),
			},
		},
	});
};
export const groqKimiK2 = async (config: LLMProviderConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		model: 'moonshotai/kimi-k2-instruct-0905',
		apiKey: config.apiKey,
		configuration: {
			baseURL: 'https://api.groq.com/openai/v1',
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl ?? 'https://api.groq.com/openai/v1'),
			},
		},
	});
};

export const anthropicClaudeSonnet45 = async (config: LLMProviderConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	const model = new ChatAnthropic({
		model: 'claude-sonnet-4-5',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: MAX_OUTPUT_TOKENS,
		anthropicApiUrl: config.baseUrl,
		clientOptions: {
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl),
			},
		},
	});

	// Remove Langchain default topP parameter since Sonnet 4.5 doesn't allow setting both temperature and topP
	delete model.topP;

	return model;
};

export const anthropicHaiku45 = async (config: LLMProviderConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	const model = new ChatAnthropic({
		model: 'claude-haiku-4-5-20251001',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: MAX_OUTPUT_TOKENS,
		anthropicApiUrl: config.baseUrl,
		clientOptions: {
			defaultHeaders: config.headers,
			fetchOptions: {
				dispatcher: getProxyAgent(config.baseUrl),
			},
		},
	});

	// Remove Langchain default topP parameter since Sonnet 4.5 doesn't allow setting both temperature and topP
	delete model.topP;

	return model;
};
