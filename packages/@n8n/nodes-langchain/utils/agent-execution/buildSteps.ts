import { AIMessage } from '@langchain/core/messages';
import { nodeNameToToolName } from 'n8n-workflow';
import type { EngineResponse, EngineResult, IDataObject } from 'n8n-workflow';

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
	return `Calling ${toolName} with input: ${JSON.stringify(toolInput)}`;
}

function resolveToolName(tool: EngineResult<RequestResponseMetadata>): string {
	return tool.action.metadata?.hitl?.toolName ?? nodeNameToToolName(tool.action.nodeName);
}

/**
 * Processed tool response data used during step building.
 */
interface ProcessedToolResponse {
	tool: NonNullable<EngineResponse<RequestResponseMetadata>['actionResponses']>[number];
	toolInput: IDataObject;
	toolId: string;
	toolName: string;
	nodeName: string;
	providerMetadata: ProviderMetadata;
}

/**
 * Builds the additional_kwargs needed for Gemini thought signatures.
 *
 * The structure matches what @langchain/google-common expects:
 * - `__gemini_function_call_thought_signatures__`: maps the first tool call ID to the signature
 * - `tool_calls`: array of tool call descriptors
 * - `signatures`: array aligned to parts [textPart, functionCall_1, ...], with the signature
 *   only on the first function call (per Google's docs)
 *
 * @param toolCalls - Tool calls to include
 * @param thoughtSignature - The Gemini thought signature
 * @returns additional_kwargs object for AIMessage
 */
function buildGeminiAdditionalKwargs(
	toolCalls: Array<{ id: string; name: string; args: IDataObject }>,
	thoughtSignature: string,
): Record<string, unknown> {
	const signatures: string[] = ['', thoughtSignature];
	for (let i = 2; i <= toolCalls.length; i++) {
		signatures.push('');
	}

	return {
		__gemini_function_call_thought_signatures__: {
			[toolCalls[0].id]: thoughtSignature,
		},
		tool_calls: toolCalls.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args })),
		signatures,
	};
}

/**
 * Builds an AIMessage for a single tool call, handling provider-specific formats.
 *
 * For Anthropic thinking mode, content is an array of blocks (thinking + tool_use).
 * For Gemini with thought signatures, additional_kwargs carries the signature.
 * For other providers, content is a simple string with tool_calls set.
 */
function buildIndividualAIMessage(
	toolId: string,
	toolName: string,
	toolInput: IDataObject,
	providerMetadata: ProviderMetadata,
): AIMessage {
	const toolCall = {
		id: toolId,
		name: toolName,
		args: toolInput,
		type: 'tool_call' as const,
	};

	const content = buildMessageContent(providerMetadata, toolInput, toolId, toolName);

	return new AIMessage({
		content,
		// When content is an array (Anthropic thinking), LangChain ignores tool_calls
		...(typeof content === 'string' && { tool_calls: [toolCall] }),
		...(providerMetadata.thoughtSignature && {
			additional_kwargs: buildGeminiAdditionalKwargs(
				[{ id: toolId, name: toolName, args: toolInput }],
				providerMetadata.thoughtSignature,
			),
		}),
	});
}

/**
 * Builds a shared AIMessage for parallel tool calls with Gemini thought signatures.
 *
 * For parallel function calls, Gemini requires ALL function calls in a single "model" turn
 * with the thought_signature only on the first function call part. This matches the original
 * model response structure and ensures the cryptographic signature validates correctly.
 *
 * LangChain's formatToToolMessages creates one ToolMessage per step. The @langchain/google-common
 * package automatically merges consecutive "function" role messages, so the function responses
 * will be correctly grouped.
 *
 * @param processedTools - Array of processed tool responses to include
 * @param thoughtSignature - The shared thought signature from Gemini
 * @returns AIMessage with all tool calls and proper signature format
 */
function buildSharedGeminiAIMessage(
	processedTools: ProcessedToolResponse[],
	thoughtSignature: string,
): AIMessage {
	const allToolCalls = processedTools.map((pt) => ({
		id: pt.toolId,
		name: pt.toolName,
		args: pt.toolInput,
		type: 'tool_call' as const,
	}));

	const toolNames = processedTools.map((pt) => pt.nodeName).join(', ');

	return new AIMessage({
		content: `Calling tools: ${toolNames}`,
		tool_calls: allToolCalls,
		additional_kwargs: buildGeminiAdditionalKwargs(allToolCalls, thoughtSignature),
	});
}

/**
 * Builds the observation string from tool result data.
 */
function buildObservation(toolData: {
	data?: { ai_tool?: Array<Array<{ json?: unknown }>> };
	error?: { message?: string; name?: string };
}): string {
	const aiToolData = toolData?.data?.ai_tool?.[0]?.map((item) => item?.json);
	if (aiToolData && aiToolData.length > 0) {
		return JSON.stringify(aiToolData);
	}
	if (toolData?.error) {
		const errorInfo = {
			error: toolData.error.message ?? 'Unknown error',
			...(toolData.error.name && { errorType: toolData.error.name }),
		};
		return JSON.stringify(errorInfo);
	}
	return JSON.stringify('');
}

/**
 * Rebuilds the agent steps from previous tool call responses.
 * This is used to continue agent execution after tool calls have been made.
 *
 * For parallel tool calls with Gemini thought signatures, all function calls are grouped
 * into a single AIMessage to match the original model response structure. This is required
 * because the thought_signature is cryptographically tied to the combined parallel call turn.
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

	if (!response) return steps;

	const responses = response.actionResponses ?? [];

	if (response.metadata?.previousRequests) {
		steps.push(...response.metadata.previousRequests);
	}

	// First pass: collect all valid tool responses for this batch
	const batchTools: ProcessedToolResponse[] = [];
	for (const tool of responses) {
		if (tool.action?.metadata?.itemIndex !== itemIndex) continue;

		const toolInput: IDataObject = {
			...tool.action.input,
			id: tool.action.id,
		};
		if (!tool.data) continue;

		const existingStep = steps.find((s) => s.action.toolCallId === toolInput.id);
		if (existingStep) continue;

		const providerMetadata = extractProviderMetadata(tool.action.metadata);
		const toolId = typeof toolInput?.id === 'string' ? toolInput.id : 'reconstructed_call';
		const toolName = resolveToolName(tool);

		batchTools.push({
			tool,
			toolInput,
			toolId,
			toolName,
			nodeName: tool.action.nodeName,
			providerMetadata,
		});
	}

	// Check if this batch has Gemini thought signatures and multiple parallel tool calls.
	// If so, we must group them into a single AIMessage because:
	// 1. The thought_signature is cryptographically tied to the combined parallel call turn
	// 2. Splitting into separate model turns invalidates the signature
	// 3. Google's API requires matching function response parts per function call turn
	const sharedThoughtSignature = batchTools.find((bt) => bt.providerMetadata.thoughtSignature)
		?.providerMetadata.thoughtSignature;

	const sharedAIMessage =
		sharedThoughtSignature && batchTools.length > 1
			? buildSharedGeminiAIMessage(batchTools, sharedThoughtSignature)
			: undefined;

	// Second pass: build steps
	for (let i = 0; i < batchTools.length; i++) {
		const { tool, toolInput, toolId, toolName, nodeName, providerMetadata } = batchTools[i];

		const observation = buildObservation(tool.data);

		// Exclude metadata fields (id, log, type) from the tool input forwarded to the result
		const { id, log, type, ...toolInputForResult } = toolInput;

		// Parallel Gemini tool calls: first step gets the shared AIMessage,
		// subsequent steps get empty messageLog. LangChain's formatToToolMessages
		// will produce: [SharedAIMessage, ToolMsg_1, ToolMsg_2, ...]
		const messageLog = sharedAIMessage
			? i === 0
				? [sharedAIMessage]
				: []
			: [buildIndividualAIMessage(toolId, toolName, toolInput, providerMetadata)];

		steps.push({
			action: {
				tool: toolName,
				toolInput: toolInputForResult,
				log: toolInput.log || (messageLog[0]?.content ?? `Calling ${nodeName}`),
				messageLog,
				toolCallId: toolInput?.id,
				type: toolInput.type || 'tool_call',
			},
			observation,
		});
	}

	return steps;
}
