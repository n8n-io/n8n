import { Agent } from '@mastra/core/agent';

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

const TITLE_SYSTEM_PROMPT = [
	'Generate a concise title (max 60 chars) summarizing what the user wants.',
	'Return ONLY the title text. No quotes, colons, or explanation.',
	'Focus on the user intent, not what the assistant might reply.',
	'Examples: "Build Gmail to Slack workflow", "Debug failed execution", "Show project files"',
].join('\n');

/**
 * Generate a polished thread title via a lightweight LLM call.
 * Returns the cleaned title string or null on failure.
 */
export async function generateThreadTitle(
	modelId: ModelConfig,
	userMessage: string,
): Promise<string | null> {
	try {
		const agent = new Agent({
			id: 'thread-title-generator',
			name: 'Thread Title Generator',
			instructions: {
				role: 'system' as const,
				content: TITLE_SYSTEM_PROMPT,
			},
			model: modelId,
		});

		const result = await agent.generate(userMessage, { maxSteps: 1 });
		const title = result.text.trim().replace(/^["']|["']$/g, '');
		if (!title) return null;
		return title.length > MAX_TITLE_LENGTH ? truncateToTitle(title) : title;
	} catch {
		return null;
	}
}
