export type TokenCounter = (text: string) => number | Promise<number>;

function createTokenCounter(encoding: 'cl100k_base' | 'o200k_base'): TokenCounter {
	return async (text) => {
		if (text.length === 0) return 0;
		const { getEncoding } = await import('@n8n/ai-utilities/tokenizer');
		const encoder = await getEncoding(encoding);
		return encoder.encode(text, [], []).length;
	};
}

export const estimateObservationTokens = createTokenCounter('cl100k_base');

const estimateOpenAiTokens = createTokenCounter('o200k_base');

function isLegacyOpenAiModel(modelId: string): boolean {
	if (modelId.startsWith('openai/gpt-3.5')) return true;
	if (!modelId.startsWith('openai/gpt-4')) return false;

	return !['openai/gpt-4o', 'openai/gpt-4.1', 'openai/gpt-4.5'].some((prefix) =>
		modelId.startsWith(prefix),
	);
}

export function createModelTokenCounter(modelId: string): TokenCounter {
	return modelId.startsWith('openai/') && !isLegacyOpenAiModel(modelId)
		? estimateOpenAiTokens
		: estimateObservationTokens;
}
