import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { trimMessages } from '@langchain/core/messages';
import type { BaseChatMemory } from 'langchain/memory';

import type { ToolCallData } from './types';

/**
 * Loads chat history from memory and optionally trims it to fit within token limits.
 *
 * @param memory - The memory instance to load from
 * @param model - Optional chat model for token counting (required if maxTokens is specified)
 * @param maxTokens - Optional maximum number of tokens to load from memory
 * @returns Array of base messages representing the chat history
 *
 * @example
 * ```typescript
 * // Load all history
 * const messages = await loadMemory(memory);
 *
 * // Load with token limit
 * const messages = await loadMemory(memory, model, 2000);
 * ```
 */
export async function loadMemory(
	memory?: BaseChatMemory,
	model?: BaseChatModel,
	maxTokens?: number,
): Promise<BaseMessage[] | undefined> {
	if (!memory) {
		return undefined;
	}
	const memoryVariables = await memory.loadMemoryVariables({});
	let chatHistory = (memoryVariables['chat_history'] as BaseMessage[]) || [];

	// Trim messages if token limit is specified and model is available
	if (maxTokens && model) {
		chatHistory = await trimMessages(chatHistory, {
			strategy: 'last',
			maxTokens,
			tokenCounter: model,
			includeSystem: true,
			startOn: 'human',
			allowPartial: true,
		});
	}

	return chatHistory;
}

/**
 * Saves a conversation turn (user input + agent output) to memory.
 *
 * @param memory - The memory instance to save to
 * @param input - The user input/prompt
 * @param output - The agent's output/response
 *
 * @example
 * ```typescript
 * await saveToMemory(memory, 'What is 2+2?', 'The answer is 4');
 * ```
 */
export async function saveToMemory(
	input: string,
	output: string,
	memory?: BaseChatMemory,
): Promise<void> {
	if (!output || !memory) {
		return;
	}

	await memory.saveContext({ input }, { output });
}

/**
 * Saves tool call results to memory as formatted messages.
 *
 * This preserves the full conversation including tool interactions,
 * which is important for agents that need to see their tool usage history.
 *
 * @param memory - The memory instance to save to
 * @param input - The user input that triggered the tool calls
 * @param toolResults - Array of tool call results to save
 *
 * @example
 * ```typescript
 * await saveToolResultsToMemory(memory, 'Calculate 2+2', [{
 *   action: {
 *     tool: 'calculator',
 *     toolInput: { expression: '2+2' },
 *     log: 'Using calculator',
 *     toolCallId: 'call_123',
 *     type: 'tool_call'
 *   },
 *   observation: '4'
 * }]);
 * ```
 */
export async function saveToolResultsToMemory(
	input: string,
	toolResults: ToolCallData[],
	memory?: BaseChatMemory,
): Promise<void> {
	if (!memory || !toolResults.length) {
		return;
	}

	// Save each tool call as a formatted message
	for (const result of toolResults) {
		const toolMessage = `Tool: ${result.action.tool}, Input: ${JSON.stringify(result.action.toolInput)}, Result: ${result.observation}`;
		await memory.saveContext({ input }, { output: toolMessage });
	}
}
