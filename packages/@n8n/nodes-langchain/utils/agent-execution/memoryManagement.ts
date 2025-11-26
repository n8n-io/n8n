import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { trimMessages } from '@langchain/core/messages';
import type { BaseChatMemory } from 'langchain/memory';

import type { ToolCallData } from './types';

/**
 * Builds a formatted string representation of tool calls for memory storage.
 * This creates a consistent format that can be used across both streaming and non-streaming modes.
 *
 * @param steps - Array of tool call data with actions and observations
 * @returns Formatted string of tool calls separated by semicolons
 *
 * @example
 * ```typescript
 * const context = buildToolContext([{
 *   action: { tool: 'calculator', toolInput: { expression: '2+2' }, ... },
 *   observation: '4'
 * }]);
 * // Returns: "Tool: calculator, Input: {"expression":"2+2"}, Result: 4"
 * ```
 */
export function buildToolContext(steps: ToolCallData[]): string {
	return steps
		.map(
			(step) =>
				`Tool: ${step.action.tool}, Input: ${JSON.stringify(step.action.toolInput)}, Result: ${step.observation}`,
		)
		.join('; ');
}

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
	steps?: ToolCallData[],
): Promise<void> {
	if (!output || !memory) {
		return;
	}
	let fullOutput = output;
	if (steps && steps.length > 0) {
		const toolContext = buildToolContext(steps);
		fullOutput = `[Used tools: ${toolContext}] ${fullOutput}`;
	}

	await memory.saveContext({ input }, { output: fullOutput });
}
