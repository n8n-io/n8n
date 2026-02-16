/**
 * Content Extractor Utilities
 *
 * Utilities for extracting text and thinking content from AI messages.
 */

import type { BaseMessage, MessageContent } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

/**
 * Content block type for text content
 */
interface TextContentBlock {
	type: 'text';
	text: string;
}

/**
 * Content block type for thinking content (Claude's native thinking)
 */
interface ThinkingContentBlock {
	type: 'thinking';
	thinking: string;
}

/**
 * Type guard for text content blocks
 */
function isTextContentBlock(block: unknown): block is TextContentBlock {
	return (
		typeof block === 'object' &&
		block !== null &&
		'type' in block &&
		block.type === 'text' &&
		'text' in block
	);
}

/**
 * Type guard for thinking content blocks
 */
function isThinkingContentBlock(block: unknown): block is ThinkingContentBlock {
	return (
		typeof block === 'object' &&
		block !== null &&
		'type' in block &&
		block.type === 'thinking' &&
		'thinking' in block
	);
}

/**
 * Extract text content from an AI message
 *
 * Handles both string content and array of content blocks.
 *
 * @param message - The AI message to extract text from
 * @returns The extracted text content, or null if no text found
 */
export function extractTextContent(message: AIMessage): string | null {
	// Content can be a string or an array of content blocks
	if (typeof message.content === 'string') {
		return message.content || null;
	}

	if (Array.isArray(message.content)) {
		const textParts = message.content.filter(isTextContentBlock).map((block) => block.text);

		return textParts.length > 0 ? textParts.join('\n') : null;
	}

	return null;
}

/**
 * Extract thinking/planning content from an AI message
 *
 * Looks for <thinking> tags and extended thinking blocks.
 *
 * @param message - The AI message to extract thinking from
 * @returns The extracted thinking content, or null if none found
 */
export function extractThinkingContent(message: AIMessage): string | null {
	const textContent = extractTextContent(message);
	if (!textContent) {
		// Check for extended thinking in content blocks (Claude's native thinking)
		if (Array.isArray(message.content)) {
			const thinkingBlocks = message.content
				.filter(isThinkingContentBlock)
				.map((block) => block.thinking);

			if (thinkingBlocks.length > 0) {
				return thinkingBlocks.join('\n\n');
			}
		}
		return null;
	}

	// Extract <thinking> blocks from text content
	const thinkingMatches = textContent.match(/<thinking>([\s\S]*?)<\/thinking>/g);
	if (thinkingMatches) {
		return thinkingMatches.map((match) => match.replace(/<\/?thinking>/g, '').trim()).join('\n\n');
	}

	// Check for extended thinking in content blocks (Claude's native thinking)
	if (Array.isArray(message.content)) {
		const thinkingBlocks = message.content
			.filter(isThinkingContentBlock)
			.map((block) => block.thinking);

		if (thinkingBlocks.length > 0) {
			return thinkingBlocks.join('\n\n');
		}
	}

	return null;
}

/**
 * Push validation feedback as a synthetic tool call result.
 *
 * Injects a validate_workflow tool call into the last AIMessage and appends
 * a ToolMessage with the result, avoiding consecutive AIMessages.
 *
 * When content is an array (e.g. extended thinking), also injects a tool_use
 * block directly into the content array. LangChain's Anthropic adapter ignores
 * the tool_calls property when content is an array but correctly serializes
 * tool_use content blocks.
 */
export function pushValidationFeedback(messages: BaseMessage[], content: string): void {
	const toolCallId = `auto-validate-${Date.now()}`;
	const lastMessage = messages[messages.length - 1];

	if (lastMessage instanceof AIMessage) {
		// Build content array with existing content + tool_use block.
		// Creating a NEW AIMessage (instead of mutating in-place) ensures
		// LangChain's serialization layer sees the correct internal state.
		type ContentBlockArray = Exclude<MessageContent, string>;
		const existingBlocks: ContentBlockArray =
			typeof lastMessage.content === 'string'
				? lastMessage.content
					? [{ type: 'text' as const, text: lastMessage.content }]
					: []
				: Array.isArray(lastMessage.content)
					? [...lastMessage.content]
					: [];

		const newAiMessage = new AIMessage({
			content: [
				...existingBlocks,
				{ type: 'tool_use', id: toolCallId, name: 'validate_workflow', input: {} },
			] as ContentBlockArray,
			tool_calls: [
				...(lastMessage.tool_calls ?? []),
				{ id: toolCallId, name: 'validate_workflow', args: {} },
			],
			response_metadata: lastMessage.response_metadata,
			id: lastMessage.id,
		});

		messages[messages.length - 1] = newAiMessage;
	}

	messages.push(
		new ToolMessage({
			tool_call_id: toolCallId,
			content,
		}),
	);
}
