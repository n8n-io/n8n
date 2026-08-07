import type { ModelConfig } from '../../types/sdk/agent';

export type TokenCounter = (text: string) => number | Promise<number>;

/** Resolve a model config to its canonical `provider/model` id string. */
export function getModelIdString(model: ModelConfig): string {
	if (typeof model === 'string') return model;
	if ('id' in model && typeof model.id === 'string') return model.id;
	if ('modelId' in model && typeof model.modelId === 'string') {
		const rawProvider = 'provider' in model ? String(model.provider) : 'unknown';
		const provider = rawProvider.split('.')[0];
		return `${provider}/${model.modelId}`;
	}
	return 'unknown';
}

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

export function createModelTokenCounter(model: ModelConfig): TokenCounter {
	const modelId = getModelIdString(model);
	return modelId.startsWith('openai/') ? estimateOpenAiTokens : estimateObservationTokens;
}
