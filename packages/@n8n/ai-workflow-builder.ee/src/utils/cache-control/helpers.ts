import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * Type guard to check if a content block is a text block that can have cache_control.
 * This allows us to safely add Anthropic's cache control markers to message content blocks.
 */
function isTextBlock(
	block: unknown,
): block is { text: string; cache_control?: { type: 'ephemeral' } } {
	return (
		typeof block === 'object' &&
		block !== null &&
		'text' in block &&
		typeof (block as { text: unknown }).text === 'string'
	);
}

/**
 * Type guard to check if a block has cache_control property.
 */
function hasCacheControl(block: unknown): block is { cache_control?: { type: 'ephemeral' } } {
	return typeof block === 'object' && block !== null && 'cache_control' in block;
}

/**
 * Finds the indices of all HumanMessage and ToolMessage instances in the messages array.
 * These indices are used to identify cache breakpoints for Anthropic's prompt caching.
 *
 * @param messages - Array of LangChain messages
 * @returns Array of indices where user or tool messages appear
 */
export function findUserToolMessageIndices(messages: BaseMessage[]): number[] {
	const userToolIndices: number[] = [];
	for (let i = 0; i < messages.length; i++) {
		if (messages[i] instanceof HumanMessage || messages[i] instanceof ToolMessage) {
			userToolIndices.push(i);
		}
	}

	return userToolIndices;
}

/**
 * Removes stale workflow context from all messages except the last one.
 * This prevents Anthropic from caching outdated workflow state.
 *
 * The workflow context includes:
 * - <current_workflow_json>...</current_workflow_json>
 * - <current_simplified_execution_data>...</current_simplified_execution_data>
 * - <current_execution_nodes_schemas>...</current_execution_nodes_schemas>
 *
 * Also removes any existing cache_control markers from old messages to ensure
 * only the most recent messages are cached.
 *
 * @param messages - Array of LangChain messages to clean
 * @param userToolIndices - Indices of user/tool messages (from findUserToolMessageIndices)
 */
export function cleanStaleWorkflowContext(
	messages: BaseMessage[],
	userToolIndices: number[],
): void {
	if (userToolIndices.length === 0) {
		return;
	}

	// Clean all messages except the last one
	for (let i = 0; i < userToolIndices.length - 1; i++) {
		const idx = userToolIndices[i];
		const message = messages[idx];

		// Remove workflow context from string content
		if (typeof message.content === 'string') {
			message.content = message.content.replace(
				/\n*<current_workflow_json>[\s\S]*?<\/current_execution_nodes_schemas>/,
				'',
			);
		}

		// Remove cache_control markers from array content blocks
		if (Array.isArray(message.content)) {
			for (const block of message.content) {
				if (hasCacheControl(block)) {
					delete block.cache_control;
				}
			}
		}
	}
}

/**
 * Applies Anthropic's prompt caching optimization by:
 * 1. Adding the current workflow context to the last user/tool message
 * 2. Marking the last two user/tool messages with cache_control markers
 *
 * This strategy leverages Anthropic's prompt caching by caching:
 * - The conversation history (second-to-last message)
 * - The current workflow state (last message)
 *
 * Anthropic caches content blocks marked with { cache_control: { type: 'ephemeral' } },
 * allowing subsequent API calls to reuse cached prompts and reduce token costs.
 *
 * @param messages - Array of LangChain messages to modify
 * @param userToolIndices - Indices of user/tool messages (from findUserToolMessageIndices)
 * @param workflowContext - Current workflow JSON and execution data to append
 */
export function applyCacheControlMarkers(
	messages: BaseMessage[],
	userToolIndices: number[],
	workflowContext: string,
): void {
	if (userToolIndices.length === 0) {
		return;
	}

	// Add current workflow context to the last user/tool message
	const lastIdx = userToolIndices[userToolIndices.length - 1];
	const lastMessage = messages[lastIdx];
	if (typeof lastMessage.content === 'string') {
		lastMessage.content = lastMessage.content + workflowContext;
	}

	// Mark second-to-last message for caching (conversation history)
	if (userToolIndices.length > 1) {
		const secondToLastIdx = userToolIndices[userToolIndices.length - 2];
		const secondToLastMessage = messages[secondToLastIdx];

		if (typeof secondToLastMessage.content === 'string') {
			secondToLastMessage.content = [
				{
					type: 'text',
					text: secondToLastMessage.content,
					cache_control: { type: 'ephemeral' },
				},
			];
		} else if (Array.isArray(secondToLastMessage.content)) {
			const lastBlock = secondToLastMessage.content[secondToLastMessage.content.length - 1];
			if (isTextBlock(lastBlock)) {
				lastBlock.cache_control = { type: 'ephemeral' };
			}
		}
	}

	// Mark last message for caching (current workflow state)
	const lastUserToolIdx = userToolIndices[userToolIndices.length - 1];
	const lastUserToolMessage = messages[lastUserToolIdx];

	if (typeof lastUserToolMessage.content === 'string') {
		lastUserToolMessage.content = [
			{
				type: 'text',
				text: lastUserToolMessage.content,
				cache_control: { type: 'ephemeral' },
			},
		];
	} else if (Array.isArray(lastUserToolMessage.content)) {
		const lastBlock = lastUserToolMessage.content[lastUserToolMessage.content.length - 1];
		if (isTextBlock(lastBlock)) {
			lastBlock.cache_control = { type: 'ephemeral' };
		}
	}
}
