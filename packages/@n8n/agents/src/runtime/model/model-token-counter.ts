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
		return await countInChunks(text, (chunk) => encoder.encode(chunk, [], []).length);
	};
}

// Yielding after every small chunk would wait a full event-loop turn each time,
// so yield only after this much synchronous encoding work.
const YIELD_INTERVAL_MS = 10;

async function countInChunks(text: string, countChunk: (chunk: string) => number) {
	let total = 0;
	let start = 0;
	let lastYield = performance.now();
	while (start < text.length) {
		const end = findChunkEnd(text, start);
		total += countChunk(text.slice(start, end));
		start = end;
		if (start < text.length && performance.now() - lastYield >= YIELD_INTERVAL_MS) {
			await setImmediate();
			lastYield = performance.now();
		}
	}
	return total;
}

// Encoding time grows quadratically for long whitespace and non-whitespace pre-tokens.
// Bound both kinds of runs in each chunk.
const MAX_UNBROKEN_RUN_CHARS = 200;

// Both encodings have a token for 128 spaces. Split space runs at this token boundary.
const SPACE_TOKEN_CHUNK = ' '.repeat(128);

// Split before whitespace, where BPE pre-tokens begin, so chunk counts stay close to the full count.
// Cut long runs into bounded pieces, but never split a surrogate pair.
function findChunkEnd(text: string, start: number): number {
	const limit = Math.min(start + TOKEN_COUNT_CHUNK_CHARS, text.length);
	const runStart = findLongRunStart(text, start, limit);
	if (runStart === -1) return splitBeforeLastWhitespace(text, start, limit);
	if (runStart > start) {
		const boundary = /\s/.test(text[runStart]) ? runStart : runStart - 1;
		if (boundary > start) return boundary;
	}
	const chunkChars = text.startsWith(SPACE_TOKEN_CHUNK, start)
		? SPACE_TOKEN_CHUNK.length
		: MAX_UNBROKEN_RUN_CHARS;
	return keepSurrogatePairWhole(text, start + chunkChars);
}

function findLongRunStart(text: string, start: number, limit: number): number {
	let runStart = start;
	let runIsWhitespace = /\s/.test(text[start]);
	for (let index = start; index < limit; index++) {
		const isWhitespace = /\s/.test(text[index]);
		if (isWhitespace !== runIsWhitespace) {
			runStart = index;
			runIsWhitespace = isWhitespace;
		}
		if (index + 1 - runStart >= MAX_UNBROKEN_RUN_CHARS) return runStart;
	}
	return -1;
}

// Without a long run, a full window always has whitespace within its last MAX_UNBROKEN_RUN_CHARS.
function splitBeforeLastWhitespace(text: string, start: number, limit: number): number {
	if (limit === text.length) return limit;
	for (let index = limit - 1; index > start; index--) {
		if (/\s/.test(text[index])) return index;
	}
	return limit;
}

function keepSurrogatePairWhole(text: string, end: number): number {
	const lastCode = text.charCodeAt(end - 1);
	if (lastCode >= 0xd800 && lastCode <= 0xdbff) return end - 1;
	return end;
}

export const estimateObservationTokens = createTokenCounter('cl100k_base');

const estimateOpenAiTokens = createTokenCounter('o200k_base');

export function createModelTokenCounter(model: ModelConfig): TokenCounter {
	const modelId = getModelIdString(model);
	return modelId.startsWith('openai/') ? estimateOpenAiTokens : estimateObservationTokens;
}
