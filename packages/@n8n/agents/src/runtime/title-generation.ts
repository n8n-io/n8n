import { generateText, type LanguageModel } from 'ai';

import type { BuiltMemory, TitleGenerationConfig } from '../types';
import { createFilteredLogger } from './logger';
import { createModel } from './model-factory';
import type { ModelConfig } from '../types/sdk/agent';
import type { AgentDbMessage } from '../types/sdk/message';

const logger = createFilteredLogger();

const DEFAULT_TITLE_INSTRUCTIONS = [
	'- you will generate a short title based on the first message a user begins a conversation with',
	'- the title should describe what the user asked for, not what an assistant might reply',
	'- 1 to 5 words, no more than 80 characters',
	'- use sentence case (e.g. "Conversation title" instead of "Conversation Title")',
	'- do not use quotes, colons, or markdown formatting',
	'- the entire text you return will be used directly as the title, so respond with the title only',
].join('\n');

const TRIVIAL_MESSAGE_MAX_CHARS = 15;
const TRIVIAL_MESSAGE_MAX_WORDS = 3;
const MAX_TITLE_LENGTH = 80;

/**
 * Whether a user message is too trivial to bother sending to an LLM for
 * title generation (e.g. "hey", "hello"). For these, the LLM tends to
 * hallucinate an assistant-voice reply as the title instead of echoing
 * the user intent — it's better to just use the message itself.
 */
function isTrivialMessage(message: string): boolean {
	const normalized = message.trim();
	if (normalized.length <= TRIVIAL_MESSAGE_MAX_CHARS) return true;
	const wordCount = normalized.split(/\s+/).filter(Boolean).length;
	return wordCount <= TRIVIAL_MESSAGE_MAX_WORDS;
}

function sanitizeTitle(raw: string): string {
	// Strip <think>...</think> blocks (e.g. from DeepSeek R1)
	let title = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
	// Strip markdown heading prefixes and inline emphasis markers
	title = title
		.replace(/^#{1,6}\s+/, '')
		.replace(/\*+/g, '')
		.trim();
	// Strip surrounding quotes
	title = title.replace(/^["']|["']$/g, '').trim();
	if (title.length > MAX_TITLE_LENGTH) {
		const truncated = title.slice(0, MAX_TITLE_LENGTH);
		const lastSpace = truncated.lastIndexOf(' ');
		title = (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '\u2026';
	}
	return title;
}

/**
 * Generate a sanitized thread title from a user message using an LLM.
 *
 * Returns `null` on empty input or empty LLM output. For trivial messages
 * (e.g. greetings), returns the sanitized message itself without calling
 * the LLM — this avoids the failure mode where the model responds with
 * an assistant-voice reply as the title.
 */
export async function generateTitleFromMessage(
	model: LanguageModel,
	userMessage: string,
	opts?: { instructions?: string },
): Promise<string | null> {
	const trimmed = userMessage.trim();
	if (!trimmed) return null;

	if (isTrivialMessage(trimmed)) {
		return sanitizeTitle(trimmed) || null;
	}

	const result = await generateText({
		model,
		messages: [
			{ role: 'system', content: opts?.instructions ?? DEFAULT_TITLE_INSTRUCTIONS },
			{ role: 'user', content: trimmed },
		],
	});

	const raw = result.text?.trim();
	if (!raw) return null;

	const title = sanitizeTitle(raw);
	return title || null;
}

/**
 * Generate a title for a thread if it doesn't already have one.
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
		const title = await generateTitleFromMessage(titleModel, userText, {
			instructions: opts.titleConfig.instructions,
		});
		if (!title) return;

		await opts.memory.saveThread({
			id: opts.threadId,
			resourceId: opts.resourceId,
			title,
			metadata: thread?.metadata,
		});
	} catch (error) {
		logger.warn('Failed to generate thread title', { error });
	}
}
