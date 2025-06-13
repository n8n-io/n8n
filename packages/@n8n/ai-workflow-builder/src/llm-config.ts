type LLMConfig = {
	apiKey: string;
	baseUrl?: string;
	headers?: Record<string, string>;
};

export const o4mini = async (config: LLMConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		modelName: 'o4-mini-2025-04-16',
		apiKey: config.apiKey,
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
		},
	});
};

export const gpt41mini = async (config: LLMConfig) => {
	const { ChatOpenAI } = await import('@langchain/openai');
	return new ChatOpenAI({
		modelName: 'gpt-4.1-mini-2025-04-14',
		apiKey: config.apiKey,
		temperature: 0,
		configuration: {
			baseURL: config.baseUrl,
			defaultHeaders: config.headers,
		},
	});
};

export const anthropicClaude37Sonnet = async (config: LLMConfig) => {
	const { ChatAnthropic } = await import('@langchain/anthropic');
	return new ChatAnthropic({
		modelName: 'claude-3-7-sonnet-20250219',
		apiKey: config.apiKey,
		temperature: 0,
		maxTokens: 16000,
		anthropicApiUrl: config.baseUrl,
		clientOptions: {
			defaultHeaders: config.headers,
		},
	});
};
