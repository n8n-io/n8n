import { setImmediate } from 'node:timers/promises';

import type { ModelConfig } from '../../types/sdk/agent';
import { getModelIdString } from '../../utils/model';

export type TokenCounter = (text: string) => number | Promise<number>;

// Encoding is synchronous; bounded chunks keep a large count from blocking the event loop.
const TOKEN_COUNT_CHUNK_CHARS = 8_000;

function createTokenCounter(encoding: 'cl100k_base' | 'o200k_base'): TokenCounter {
	return async (text) => {
		if (text.length === 0) return 0;
		const { getEncoding } = await import('@n8n/ai-utilities/tokenizer');
		const encoder = await getEncoding(encoding);
		const countChunk = (chunk: string) => encoder.encode(chunk, [], []).length;
		if (text.length <= TOKEN_COUNT_CHUNK_CHARS) return countChunk(text);
		return await countInChunks(text, countChunk);
	};
}

async function countInChunks(text: string, countChunk: (chunk: string) => number) {
	let total = 0;
	let start = 0;
	while (start < text.length) {
		const end = findChunkEnd(text, start);
		total += countChunk(text.slice(start, end));
		start = end;
		if (start < text.length) await setImmediate();
	}
	return total;
}

// Split before whitespace, where BPE pre-tokens begin, so chunk counts add up to the full count.
function findChunkEnd(text: string, start: number): number {
	const limit = start + TOKEN_COUNT_CHUNK_CHARS;
	if (limit >= text.length) return text.length;
	for (let index = limit - 1; index > start; index--) {
		if (/\s/.test(text[index])) return index;
	}
	return limit;
}

export const estimateObservationTokens = createTokenCounter('cl100k_base');

const estimateOpenAiTokens = createTokenCounter('o200k_base');

export function createModelTokenCounter(model: ModelConfig): TokenCounter {
	const modelId = getModelIdString(model);
	return modelId.startsWith('openai/') ? estimateOpenAiTokens : estimateObservationTokens;
}
