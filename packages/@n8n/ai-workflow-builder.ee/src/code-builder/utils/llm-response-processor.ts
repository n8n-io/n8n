/**
 * LLM Response Processor
 *
 * Extracts and processes data from LLM responses including:
 * - Token usage from metadata
 * - Text content
 * - Thinking/planning content
 * - Tool calls
 */

import type { AIMessage } from '@langchain/core/messages';

import { extractTextContent, extractThinkingContent } from './content-extractors';

/** Type guard for response metadata with usage info */
interface ResponseMetadataWithUsage {
	usage: { input_tokens?: number; output_tokens?: number };
}

function hasUsageMetadata(metadata: unknown): metadata is ResponseMetadataWithUsage {
	return (
		typeof metadata === 'object' &&
		metadata !== null &&
		'usage' in metadata &&
		typeof (metadata as ResponseMetadataWithUsage).usage === 'object'
	);
}

/**
 * Tool call data extracted from LLM response
 */
export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

/**
 * Processed LLM response data
 */
export interface LlmResponseResult {
	/** Number of input tokens used */
	inputTokens: number;
	/** Number of output tokens used */
	outputTokens: number;
	/** Extracted thinking/planning content, if present */
	thinkingContent: string | null;
	/** Extracted text content, if present */
	textContent: string | null;
	/** Whether the response contains tool calls */
	hasToolCalls: boolean;
	/** Array of tool calls from the response */
	toolCalls: ToolCall[];
}

/**
 * Process an LLM response and extract relevant data.
 *
 * Consolidates the response processing logic that was previously inline
 * in the chat() method (lines 403-465).
 *
 * @param response - The AIMessage response from the LLM
 * @returns Processed response data
 */
export function processLlmResponse(response: AIMessage): LlmResponseResult {
	// Extract token usage from response metadata using type guard
	const responseMetadata = response.response_metadata;
	const inputTokens = hasUsageMetadata(responseMetadata)
		? (responseMetadata.usage.input_tokens ?? 0)
		: 0;
	const outputTokens = hasUsageMetadata(responseMetadata)
		? (responseMetadata.usage.output_tokens ?? 0)
		: 0;

	// Extract thinking content
	const thinkingContent = extractThinkingContent(response);

	// Extract text content
	const textContent = extractTextContent(response);

	// Extract tool calls
	const rawToolCalls = response.tool_calls ?? [];
	const toolCalls: ToolCall[] = rawToolCalls
		.filter((tc): tc is typeof tc & { id: string } => tc.id !== undefined)
		.map((tc) => ({
			id: tc.id,
			name: tc.name,
			args: tc.args,
		}));

	return {
		inputTokens,
		outputTokens,
		thinkingContent,
		textContent,
		hasToolCalls: toolCalls.length > 0,
		toolCalls,
	};
}
