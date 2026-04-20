import { createModel, generateTitleFromMessage } from '@n8n/agents';

import type { ModelConfig } from '../types';

const MAX_TITLE_LENGTH = 60;

/** Truncate a user message to a concise thread title (max 60 chars, word-boundary). */
export function truncateToTitle(message: string): string {
	const text = message.trim().replace(/\s+/g, ' ');
	if (text.length <= MAX_TITLE_LENGTH) return text;
	const truncated = text.slice(0, MAX_TITLE_LENGTH);
	const lastSpace = truncated.lastIndexOf(' ');
	return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '\u2026';
}

/**
 * Generate a polished thread title via a lightweight LLM call.
 * Returns the cleaned title string or null on failure.
 *
 * Wraps @n8n/agents' title generation so callers don't have to build a
 * LanguageModel themselves. Fails soft — any error returns null.
 */
export async function generateTitleForRun(
	modelId: ModelConfig,
	userMessage: string,
): Promise<string | null> {
	try {
		const model = createModel(modelId);
		return await generateTitleFromMessage(model, userMessage);
	} catch {
		return null;
	}
}
