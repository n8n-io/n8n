import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { trimMessages } from '@langchain/core/messages';
import type { BaseChatMemory } from 'langchain/memory';

/**
 * Loads chat history from memory and trims it to fit within token limits.
 *
 * @param memory - The memory instance containing chat history
 * @param model - The chat model used for token counting
 * @param maxTokensFromMemory - Optional maximum tokens to keep from memory
 * @returns Array of base messages representing the chat history
 */
export async function loadChatHistory(
	memory: BaseChatMemory,
	model: BaseChatModel,
	maxTokensFromMemory?: number,
): Promise<BaseMessage[]> {
	const memoryVariables = await memory.loadMemoryVariables({});
	let chatHistory = memoryVariables['chat_history'] as BaseMessage[];

	if (maxTokensFromMemory) {
		chatHistory = await trimMessages(chatHistory, {
			strategy: 'last',
			maxTokens: maxTokensFromMemory,
			tokenCounter: model,
			includeSystem: true,
			startOn: 'human',
			allowPartial: true,
		});
	}

	return chatHistory;
}
