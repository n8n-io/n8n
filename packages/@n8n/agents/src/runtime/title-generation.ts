import { generateText } from 'ai';

import type { BuiltMemory, TitleGenerationConfig } from '../types';
import { createFilteredLogger } from './logger';
import { createModel } from './model-factory';
import type { ModelConfig } from '../types/sdk/agent';
import type { AgentDbMessage } from '../types/sdk/message';

const logger = createFilteredLogger();

const DEFAULT_TITLE_INSTRUCTIONS = [
	'- you will generate a short title based on the first message a user begins a conversation with',
	'- ensure it is not more than 80 characters long',
	"- the title should be a summary of the user's message",
	'- do not use quotes or colons',
	'- the entire text you return will be used as the title',
].join('\n');

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
		const instructions = opts.titleConfig.instructions ?? DEFAULT_TITLE_INSTRUCTIONS;

		const result = await generateText({
			model: titleModel,
			messages: [
				{ role: 'system', content: instructions },
				{ role: 'user', content: userText },
			],
		});

		let title = result.text?.trim();
		if (!title) return;

		// Strip <think>...</think> blocks (e.g. from DeepSeek R1)
		title = title.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
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
