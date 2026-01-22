import { AIMessage } from '@langchain/core/messages';
import { nodeNameToToolName } from 'n8n-workflow';
import type { EngineResponse, IDataObject } from 'n8n-workflow';

import type {
	RequestResponseMetadata,
	ToolCallData,
	ThinkingContentBlock,
	RedactedThinkingContentBlock,
	ToolUseContentBlock,
} from './types';

/**
 * Provider-specific metadata extracted from tool action metadata
 */
interface ProviderMetadata {
	/** Gemini thought_signature for extended thinking */
	thoughtSignature?: string;
	/** Anthropic thinking content */
	thinkingContent?: string;
	/** Anthropic thinking type (thinking or redacted_thinking) */
	thinkingType?: 'thinking' | 'redacted_thinking';
	/** Anthropic thinking signature */
	thinkingSignature?: string;
}

/**
 * Extracts provider-specific metadata from tool action metadata.
 * Validates and normalizes metadata from different LLM providers.
 *
 * @param metadata - The request/response metadata from tool action
 * @returns Extracted and validated provider metadata
 */
function extractProviderMetadata(metadata?: RequestResponseMetadata): ProviderMetadata {
	if (!metadata) return {};

	// Extract Google/Gemini metadata
	const thoughtSignature =
		typeof metadata.google?.thoughtSignature === 'string'
			? metadata.google.thoughtSignature
			: undefined;

	// Extract Anthropic metadata
	const thinkingContent =
		typeof metadata.anthropic?.thinkingContent === 'string'
			? metadata.anthropic.thinkingContent
			: undefined;

	const thinkingType =
		metadata.anthropic?.thinkingType === 'thinking' ||
		metadata.anthropic?.thinkingType === 'redacted_thinking'
			? metadata.anthropic.thinkingType
			: undefined;

	const thinkingSignature =
		typeof metadata.anthropic?.thinkingSignature === 'string'
			? metadata.anthropic.thinkingSignature
			: undefined;

	return {
		thoughtSignature,
		thinkingContent,
		thinkingType,
		thinkingSignature,
	};
}

/**
 * Builds Anthropic-specific content blocks for thinking mode.
 * Creates an array with thinking block followed by tool_use block.
 *
 * IMPORTANT: The thinking block must come before tool_use in the message.
 * When content is an array, LangChain ignores tool_calls field for Anthropic,
 * so tool_use blocks must be in the content array.
 *
 * @param thinkingContent - The thinking content from Anthropic
 * @param thinkingType - Type of thinking block (thinking or redacted_thinking)
 * @param thinkingSignature - Optional signature for thinking block
 * @param toolInput - The tool input data
 * @param toolId - The tool call ID
 * @param toolName - The tool name
 * @returns Array of content blocks with thinking and tool_use
 */
function buildAnthropicContentBlocks(
	thinkingContent: string,
	thinkingType: 'thinking' | 'redacted_thinking',
	thinkingSignature: string | undefined,
	toolInput: IDataObject,
	toolId: string,
	toolName: string,
): Array<ThinkingContentBlock | RedactedThinkingContentBlock | ToolUseContentBlock> {
	// Create thinking block with correct field names for Anthropic API
	const thinkingBlock: ThinkingContentBlock | RedactedThinkingContentBlock =
		thinkingType === 'thinking'
			? {
					type: 'thinking',
					thinking: thinkingContent,
					signature: thinkingSignature ?? '', // Use original signature if available
				}
			: {
					type: 'redacted_thinking',
					data: thinkingContent,
				};

	// Create tool_use block (required for Anthropic when using structured content)
	const toolInputData = toolInput.input;
	const toolUseBlock: ToolUseContentBlock = {
		type: 'tool_use',
		id: toolId,
		name: toolName,
		input:
			toolInputData && typeof toolInputData === 'object'
				? (toolInputData as Record<string, unknown>)
				: {},
	};

	return [thinkingBlock, toolUseBlock];
}

/**
 * Builds message content for AI message, handling provider-specific formats.
 * For Anthropic thinking mode, creates content blocks with thinking and tool_use.
 * For other providers, creates simple string content.
 *
 * @param providerMetadata - Provider-specific metadata
 * @param toolInput - The tool input data
 * @param toolId - The tool call ID
 * @param toolName - The tool name
 * @param nodeName - The node name for fallback string content
 * @returns Message content (string or content blocks array)
 */
function buildMessageContent(
	providerMetadata: ProviderMetadata,
	toolInput: IDataObject,
	toolId: string,
	toolName: string,
	nodeName: string,
): string | Array<ThinkingContentBlock | RedactedThinkingContentBlock | ToolUseContentBlock> {
	const { thinkingContent, thinkingType, thinkingSignature } = providerMetadata;

	// Anthropic thinking mode: build content blocks
	if (thinkingContent && thinkingType) {
		return buildAnthropicContentBlocks(
			thinkingContent,
			thinkingType,
			thinkingSignature,
			toolInput,
			toolId,
			toolName,
		);
	}

	// Default: simple string content
	return `Calling ${nodeName} with input: ${JSON.stringify(toolInput)}`;
}

/**
 * Rebuilds the agent steps from previous tool call responses.
 * This is used to continue agent execution after tool calls have been made.
 *
 * This is a generalized version that can be used across different agent types
 * (Tools Agent, OpenAI Functions Agent, etc.).
 *
 * @param response - The engine response containing tool call results
 * @param itemIndex - The current item index being processed
 * @returns Array of tool call data representing the agent steps
 */
export function buildSteps(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): ToolCallData[] {
	const steps: ToolCallData[] = [];

	if (response) {
		const responses = response?.actionResponses ?? [];

		if (response.metadata?.previousRequests) {
			steps.push.apply(steps, response.metadata.previousRequests);
		}

		for (const tool of responses) {
			if (tool.action?.metadata?.itemIndex !== itemIndex) continue;

			const toolInput: IDataObject = {
				...tool.action.input,
				id: tool.action.id,
			};
			if (!toolInput || !tool.data) {
				continue;
			}

			const step = steps.find((step) => step.action.toolCallId === toolInput.id);
			if (step) {
				continue;
			}

			// Extract provider-specific metadata (Gemini, Anthropic, etc.)
			const providerMetadata = extractProviderMetadata(tool.action.metadata);

			// Build tool ID and name for reuse
			const toolId = typeof toolInput?.id === 'string' ? toolInput.id : 'reconstructed_call';
			const toolName = nodeNameToToolName(tool.action.nodeName);

			// Build the tool call object
			const toolCall = {
				id: toolId,
				name: toolName,
				args: toolInput,
				type: 'tool_call' as const,
			};

			// Build message content using provider-specific logic
			const messageContent = buildMessageContent(
				providerMetadata,
				toolInput,
				toolId,
				toolName,
				tool.action.nodeName,
			);

			// Build AIMessage options, handling provider-specific requirements
			// Note: tool_calls is only used when content is a string
			// When content is an array (thinking mode), tool_use blocks are in the content array
			const aiMessageOptions: {
				content: typeof messageContent;
				tool_calls?: Array<typeof toolCall>;
				additional_kwargs?: Record<string, unknown>;
			} = {
				content: messageContent,
			};

			if (typeof messageContent === 'string') {
				aiMessageOptions.tool_calls = [toolCall];
			}

			// Include additional_kwargs with Gemini thought signatures for LangChain to pass back
			if (providerMetadata.thoughtSignature) {
				aiMessageOptions.additional_kwargs = {
					__gemini_function_call_thought_signatures__: {
						[toolId]: providerMetadata.thoughtSignature,
					},
					tool_calls: [{ id: toolId, name: toolName, args: toolInput }],
					signatures: ['', providerMetadata.thoughtSignature],
				};
			}

			const syntheticAIMessage = new AIMessage(aiMessageOptions);

			// Extract tool input arguments for the result
			// Exclude metadata fields: id, log, type - always keep as object for type consistency
			const { id, log, type, ...toolInputForResult } = toolInput;

			// Build observation from tool result data or error information
			// When tool execution fails, ai_tool may be missing but error info should be preserved
			const aiToolData = tool.data?.data?.ai_tool?.[0]?.map((item) => item?.json);
			let observation: string;
			if (aiToolData && aiToolData.length > 0) {
				observation = JSON.stringify(aiToolData);
			} else if (tool.data?.error) {
				// Include error information in observation so the agent can see what went wrong
				// tool.data is ITaskData which has error?: ExecutionError
				const errorInfo = {
					error: tool.data.error.message ?? 'Unknown error',
					...(tool.data.error.name && { errorType: tool.data.error.name }),
				};
				observation = JSON.stringify(errorInfo);
			} else {
				observation = JSON.stringify('');
			}

			const toolResult = {
				action: {
					tool: nodeNameToToolName(tool.action.nodeName),
					toolInput: toolInputForResult,
					log: toolInput.log || syntheticAIMessage.content,
					messageLog: [syntheticAIMessage],
					toolCallId: toolInput?.id,
					type: toolInput.type || 'tool_call',
				},
				observation,
			};

			steps.push(toolResult);
		}
	}
	return steps;
}
