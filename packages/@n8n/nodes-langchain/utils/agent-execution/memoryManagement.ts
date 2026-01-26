import type { BaseChatMemory } from '@langchain/classic/memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage, trimMessages } from '@langchain/core/messages';
import type { IDataObject, GenericValue } from 'n8n-workflow';

import type { ToolCallData } from './types';

/**
 * Extracts a string tool_call_id from various possible formats.
 * Handles the complex type: IDataObject | GenericValue | GenericValue[] | IDataObject[]
 *
 * @param toolCallId - The tool call ID in various possible formats
 * @param toolName - The tool name, used for generating synthetic IDs
 * @returns A valid string tool_call_id
 *
 * @example
 * ```typescript
 * extractToolCallId('call-123', 'calculator') // Returns: 'call-123'
 * extractToolCallId({ id: 'call-456' }, 'search') // Returns: 'call-456'
 * extractToolCallId(['call-789'], 'weather') // Returns: 'call-789'
 * extractToolCallId(null, 'unknown') // Returns: 'synthetic_unknown_1234567890'
 * ```
 */
export function extractToolCallId(
	toolCallId: IDataObject | GenericValue | GenericValue[] | IDataObject[],
	toolName: string,
): string {
	// Case 1: Already a string
	if (typeof toolCallId === 'string' && toolCallId.length > 0) {
		return toolCallId;
	}

	// Case 2: Object with 'id' property
	if (
		typeof toolCallId === 'object' &&
		toolCallId !== null &&
		!Array.isArray(toolCallId) &&
		'id' in toolCallId
	) {
		const id = toolCallId.id;
		if (typeof id === 'string' && id.length > 0) {
			return id;
		}
	}

	// Case 3: Array - recursively extract from first element
	if (Array.isArray(toolCallId) && toolCallId.length > 0) {
		return extractToolCallId(toolCallId[0], toolName);
	}

	// Fallback: Generate synthetic ID
	return `synthetic_${toolName}_${Date.now()}`;
}

/**
 * Converts ToolCallData array into LangChain message sequence.
 * Creates alternating AIMessage (with tool_calls) and ToolMessage pairs.
 *
 * @param steps - Array of tool call data with actions and observations
 * @returns Array of BaseMessage objects (AIMessage and ToolMessage pairs)
 *
 * @example
 * ```typescript
 * const messages = buildMessagesFromSteps([{
 *   action: {
 *     tool: 'calculator',
 *     toolInput: { expression: '2+2' },
 *     messageLog: [aiMessageWithToolCalls],
 *     toolCallId: 'call-123'
 *   },
 *   observation: '4'
 * }]);
 * // Returns: [AIMessage with tool_calls, ToolMessage with result]
 * ```
 */
export function buildMessagesFromSteps(steps: ToolCallData[]): BaseMessage[] {
	const messages: BaseMessage[] = [];

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];

		// Try to extract existing AIMessage and its tool_call ID
		const existingAIMessage = step.action.messageLog?.[0];
		const existingToolCallId = existingAIMessage?.tool_calls?.[0]?.id;

		// Use existing ID if available, otherwise extract from step data
		const toolCallId =
			existingToolCallId ?? extractToolCallId(step.action.toolCallId, step.action.tool);

		// Use existing AIMessage or create a synthetic one
		const aiMessage =
			existingAIMessage ??
			new AIMessage({
				content: `Calling ${step.action.tool} with input: ${JSON.stringify(step.action.toolInput)}`,
				tool_calls: [
					{
						id: toolCallId,
						name: step.action.tool,
						args: step.action.toolInput,
						type: 'tool_call',
					},
				],
			});

		// Create ToolMessage with the observation result
		const toolMessage = new ToolMessage({
			content: step.observation,
			tool_call_id: toolCallId,
			name: step.action.tool,
		});

		// Add both messages
		messages.push(aiMessage);
		messages.push(toolMessage);
	}

	return messages;
}

/**
 * Builds a formatted string representation of tool calls for memory storage.
 * This creates a consistent format that can be used across both streaming and non-streaming modes.
 *
 * @deprecated Used only as fallback for custom memory implementations that don't support addMessages
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
 * Removes orphaned ToolMessages and AIMessages with tool_calls from the start of chat history.
 * This happens when memory trimming cuts messages mid-turn, leaving incomplete tool call sequences.
 *
 * @param chatHistory - Array of messages to clean up
 * @returns Cleaned array with orphaned messages removed from the start
 */
function cleanupOrphanedMessages(chatHistory: BaseMessage[]): BaseMessage[] {
	// Remove orphaned ToolMessages at the start
	while (chatHistory.length > 0 && chatHistory[0] instanceof ToolMessage) {
		chatHistory.shift();
	}

	// Remove AIMessages with tool_calls if they don't have following ToolMessages
	const firstMessage = chatHistory[0];
	const hasOrphanedAIMessage =
		firstMessage instanceof AIMessage &&
		(firstMessage.tool_calls?.length ?? 0) > 0 &&
		!(chatHistory[1] instanceof ToolMessage);

	if (hasOrphanedAIMessage) {
		chatHistory.shift();
	}

	return chatHistory;
}

/**
 * Loads chat history from memory and optionally trims it to fit within token limits.
 * Automatically cleans up orphaned tool messages that may result from memory trimming.
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

	// Clean up any orphaned messages from previous trimming operations
	chatHistory = cleanupOrphanedMessages(chatHistory);

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

		// Clean up again after trimming, as it may create new orphans
		chatHistory = cleanupOrphanedMessages(chatHistory);
	}

	return chatHistory;
}

/**
 * Saves a conversation turn (user input + agent output) to memory.
 * Uses LangChain-native message types (AIMessage with tool_calls, ToolMessage)
 * when tools are involved, preserving semantic structure for LLMs.
 *
 * @param input - The user input/prompt
 * @param output - The agent's output/response
 * @param memory - The memory instance to save to
 * @param steps - Optional tool call data to save as proper message sequence
 * @param previousStepsCount - Number of steps from previous turns (to filter out duplicates)
 *
 * @example
 * ```typescript
 * // Simple conversation (no tools)
 * await saveToMemory('What is 2+2?', 'The answer is 4', memory);
 *
 * // With tool calls (saves full message sequence)
 * await saveToMemory('Calculate 2+2', 'The answer is 4', memory, steps, 0);
 * ```
 */
export async function saveToMemory(
	input: string,
	output: string,
	memory?: BaseChatMemory,
	steps?: ToolCallData[],
	previousStepsCount?: number,
): Promise<void> {
	if (!output || !memory) {
		return;
	}

	// No tool calls: use simple saveContext (backwards compatible)
	if (!steps || steps.length === 0) {
		await memory.saveContext({ input }, { output });
		return;
	}

	// Filter out previous steps to avoid duplicates (they're already in memory)
	const newSteps = previousStepsCount ? steps.slice(previousStepsCount) : steps;

	if (newSteps.length === 0) {
		await memory.saveContext({ input }, { output });
		return;
	}

	// Check if memory supports addMessages (feature detection)
	if (
		!('addMessages' in memory.chatHistory) ||
		typeof memory.chatHistory.addMessages !== 'function'
	) {
		// Fallback: use old string format (only with new steps to avoid duplicates)
		const toolContext = buildToolContext(newSteps);
		const fullOutput = `[Used tools: ${toolContext}] ${output}`;
		await memory.saveContext({ input }, { output: fullOutput });
		return;
	}

	// Build full conversation sequence using LangChain-native message types
	const messages: BaseMessage[] = [];

	// 1. User input
	messages.push(new HumanMessage(input));

	// 2. Tool call sequence (AIMessage with tool_calls → ToolMessage for each)
	const toolMessages = buildMessagesFromSteps(newSteps);
	messages.push.apply(messages, toolMessages);

	// 3. Final AI response (no tool_calls)
	messages.push(new AIMessage(output));

	// 4. Save all messages in bulk
	await memory.chatHistory.addMessages(messages);
}
