import type { ModelConfig } from '../../types/sdk/agent';
import { getModelIdString } from '../../utils/model';

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

export function createModelTokenCounter(model: ModelConfig): TokenCounter {
	const modelId = getModelIdString(model);
	return modelId.startsWith('openai/') ? estimateOpenAiTokens : estimateObservationTokens;
}
