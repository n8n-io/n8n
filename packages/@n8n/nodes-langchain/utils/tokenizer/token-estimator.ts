/**
 * Token estimation utilities for handling text without using tiktoken.
 * This is used as a fallback when tiktoken would be too slow (e.g., with repetitive content).
 */

import type { TiktokenModel } from 'js-tiktoken';

import { encodingForModel } from './tiktoken';
import { hasLongSequentialRepeat } from '../helpers';

/**
 * Model-specific average characters per token ratios.
 * These are approximate values based on typical English text.
 */
const MODEL_CHAR_PER_TOKEN_RATIOS: Record<string, number> = {
	'gpt-4o': 3.8,
	'gpt-4': 4.0,
	'gpt-3.5-turbo': 4.0,
	cl100k_base: 4.0,
	o200k_base: 3.5,
	p50k_base: 4.2,
	r50k_base: 4.2,
};

/**
 * Estimates the number of tokens in a text based on character count.
 * This is much faster than tiktoken but less accurate.
 *
 * @param text The text to estimate tokens for
 * @param model The model or encoding name (optional)
 * @returns Estimated number of tokens
 */
export function estimateTokensByCharCount(text: string, model: string = 'cl100k_base'): number {
	try {
		// Validate input
		if (!text || typeof text !== 'string' || text.length === 0) {
			return 0;
		}

		// Get the ratio for the specific model, or use default
		const charsPerToken = MODEL_CHAR_PER_TOKEN_RATIOS[model] || 4.0;

		// Validate ratio
		if (!Number.isFinite(charsPerToken) || charsPerToken <= 0) {
			// Fallback to default ratio
			const estimatedTokens = Math.ceil(text.length / 4.0);
			return estimatedTokens;
		}

		// Calculate estimated tokens
		const estimatedTokens = Math.ceil(text.length / charsPerToken);

		return estimatedTokens;
	} catch (error) {
		// Return conservative estimate on error
		return Math.ceil((text?.length || 0) / 4.0);
	}
}

/**
 * Estimates tokens for text splitting purposes.
 * Returns chunk boundaries based on character positions rather than token positions.
 *
 * @param text The text to split
 * @param chunkSize Target chunk size in tokens
 * @param chunkOverlap Overlap between chunks in tokens
 * @param model The model or encoding name (optional)
 * @returns Array of text chunks
 */
export function estimateTextSplitsByTokens(
	text: string,
	chunkSize: number,
	chunkOverlap: number,
	model: string = 'cl100k_base',
): string[] {
	try {
		// Validate inputs
		if (!text || typeof text !== 'string' || text.length === 0) {
			return [];
		}

		// Validate numeric parameters
		if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
			// Return whole text as single chunk if invalid chunk size
			return [text];
		}

		// Ensure overlap is valid and less than chunk size
		const validOverlap =
			Number.isFinite(chunkOverlap) && chunkOverlap >= 0
				? Math.min(chunkOverlap, chunkSize - 1)
				: 0;

		const charsPerToken = MODEL_CHAR_PER_TOKEN_RATIOS[model] || 4.0;
		const chunkSizeInChars = Math.floor(chunkSize * charsPerToken);
		const overlapInChars = Math.floor(validOverlap * charsPerToken);

		const chunks: string[] = [];
		let start = 0;

		while (start < text.length) {
			const end = Math.min(start + chunkSizeInChars, text.length);
			chunks.push(text.slice(start, end));

			if (end >= text.length) {
				break;
			}

			// Move to next chunk with overlap
			start = Math.max(end - overlapInChars, start + 1);
		}

		return chunks;
	} catch (error) {
		// Return text as single chunk on error
		return text ? [text] : [];
	}
}

/**
 * Estimates the total number of tokens for a list of strings.
 * Uses tiktoken for normal text but falls back to character-based estimation
 * for repetitive content or on errors.
 *
 * @param list Array of strings to estimate tokens for
 * @param model The model or encoding name to use for estimation
 * @returns Total estimated number of tokens across all strings
 */
export async function estimateTokensFromStringList(
	list: string[],
	model: TiktokenModel,
): Promise<number> {
	try {
		// Validate input
		if (!Array.isArray(list)) {
			return 0;
		}

		const encoder = encodingForModel(model);
		const encodedListLength = await Promise.all(
			list.map(async (text) => {
				try {
					// Handle null/undefined text
					if (!text || typeof text !== 'string') {
						return 0;
					}

					// Check for repetitive content
					if (hasLongSequentialRepeat(text)) {
						const estimatedTokens = estimateTokensByCharCount(text, model);
						return estimatedTokens;
					}

					// Use tiktoken for normal text
					try {
						const tokens = encoder.encode(text);
						return tokens.length;
					} catch (encodingError) {
						// Fall back to estimation if tiktoken fails
						return estimateTokensByCharCount(text, model);
					}
				} catch (itemError) {
					// Return 0 for individual item errors
					return 0;
				}
			}),
		);

		const totalTokens = encodedListLength.reduce((acc, curr) => acc + curr, 0);

		return totalTokens;
	} catch (error) {
		// Return 0 on complete failure
		return 0;
	}
}
