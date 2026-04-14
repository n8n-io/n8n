import { generateText } from 'ai';

import type { BuiltMemory, TitleGenerationConfig } from '../types';
import { createFilteredLogger } from './logger';
import { createModel } from './model-factory';
import type { ModelConfig } from '../types/sdk/agent';
import type { AgentDbMessage } from '../types/sdk/message';

const logger = createFilteredLogger();

const DEFAULT_TITLE_INSTRUCTIONS = [
	'Generate a short title and a single emoji for a conversation based on the user message.',
	'Respond with ONLY a JSON object: {"title": "...", "emoji": "..."}',
	'Rules:',
	'- Title: 2 to 6 words, max 50 characters, sentence case',
	'- Title must not contain emoji, quotes, colons, or markdown formatting',
	'- Emoji: exactly one emoji that represents the topic',
	'- Respond with the JSON object only, no other text',
].join('\n');

/**
 * Generate a title and emoji for a thread if it doesn't already have one.
 *
 * Designed to run fire-and-forget after the agent response is complete.
 * All errors are caught and logged — title generation failures never
 * block or break the agent response.
 */
export async function generateThreadTitle(opts: {
	memory: BuiltMemory;
	threadId: string;
	resourceId: string;
	titleConfig: TitleGenerationConfig;
	/** The agent's own model, used as fallback when titleConfig.model is not set. */
	agentModel: ModelConfig;
	/** Messages from the current turn, used to find the first user message. */
	turnDelta: AgentDbMessage[];
}): Promise<void> {
	try {
		const thread = await opts.memory.getThread(opts.threadId);
		if (thread?.title) return;

		const userMessage = opts.turnDelta.find((m) => 'role' in m && m.role === 'user');
		if (!userMessage || !('content' in userMessage)) return;

		const userText = (userMessage.content as Array<{ type: string; text?: string }>)
			.filter((c) => c.type === 'text' && c.text)
			.map((c) => c.text!)
			.join(' ');
		if (!userText) return;

		const titleModelId = opts.titleConfig.model ?? opts.agentModel;
		const titleModel = createModel(titleModelId);
		const instructions = opts.titleConfig.instructions ?? DEFAULT_TITLE_INSTRUCTIONS;

		const result = await generateText({
			model: titleModel,
			messages: [
				{ role: 'system', content: instructions },
				{ role: 'user', content: userText },
			],
		});

		let text = result.text?.trim();
		if (!text) return;

		// Strip <think>...</think> blocks (e.g. from DeepSeek R1)
		text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
		if (!text) return;

		let title: string;
		let emoji: string | undefined;

		// Try to parse as JSON (new format with emoji)
		const jsonMatch = /\{[\s\S]*\}/.exec(text);
		if (jsonMatch) {
			try {
				const parsed = JSON.parse(jsonMatch[0]) as { title?: string; emoji?: string };
				title = parsed.title?.trim() ?? '';
				emoji = parsed.emoji?.trim();
			} catch {
				// Fallback: treat entire response as title (legacy plain-text format)
				title = text;
			}
		} else {
			title = text;
		}

		// Clean up title
		title = title
			.replace(/^#{1,6}\s+/, '')
			.replace(/\*+/g, '')
			.replace(/^["']|["']$/g, '')
			.trim();
		if (!title) return;

		// Store emoji in thread metadata
		const metadata = { ...(thread?.metadata ?? {}), ...(emoji && { emoji }) };

		await opts.memory.saveThread({
			id: opts.threadId,
			resourceId: opts.resourceId,
			title,
			metadata,
		});
	} catch (error) {
		logger.warn('Failed to generate thread title', { error });
	}
}
