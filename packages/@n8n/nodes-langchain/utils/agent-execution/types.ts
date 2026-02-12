import type { AIMessage } from '@langchain/core/messages';
import type { IDataObject, GenericValue } from 'n8n-workflow';
import type { ZodType } from 'zod';

/**
 * Represents a tool call request from an LLM.
 * This is a generic format that can be used across different agent types.
 */
export type ToolCallRequest = {
	/** The name of the tool to call */
	tool: string;
	/** The input arguments for the tool */
	toolInput: Record<string, unknown>;
	/** Unique identifier for this tool call */
	toolCallId: string;
	/** Type of the tool call (e.g., 'tool_call', 'function') */
	type?: string;
	/** Log message or description */
	log?: string;
	/** Full message log including LLM response */
	messageLog?: unknown[];
	/** Additional kwargs from the LLM response (for Gemini thought signatures) */
	additionalKwargs?: Record<string, unknown>;
};

/**
 * Represents a tool call action and its observation result.
 * Used for building agent steps and maintaining conversation context.
 */
export type ToolCallData = {
	action: {
		tool: string;
		toolInput: Record<string, unknown>;
		log: string | number | true | object;
		messageLog?: AIMessage[];
		toolCallId: IDataObject | GenericValue | GenericValue[] | IDataObject[];
		type: string | number | true | object;
	};
	observation: string;
};

/**
 * Result from an agent execution, optionally including tool calls and intermediate steps.
 */
export type AgentResult = {
	/** The final output from the agent */
	output: string;
	/** Tool calls that need to be executed */
	toolCalls?: ToolCallRequest[];
	/** Intermediate steps showing the agent's reasoning */
	intermediateSteps?: ToolCallData[];
};

/**
 * Anthropic thinking content block
 */
export type ThinkingContentBlock = {
	type: 'thinking';
	thinking: string;
	signature: string;
};

/**
 * Anthropic redacted thinking content block
 */
export type RedactedThinkingContentBlock = {
	type: 'redacted_thinking';
	data: string;
};

/**
 * Anthropic tool use content block
 */
export type ToolUseContentBlock = {
	type: 'tool_use';
	id: string;
	name: string;
	input: Record<string, unknown>;
};

/**
 * Gemini thought signature content block
 */
export type GeminiThoughtSignatureBlock = {
	thoughtSignature: string;
};

/**
 * Union type for all supported content blocks
 */
export type ContentBlock =
	| ThinkingContentBlock
	| RedactedThinkingContentBlock
	| ToolUseContentBlock
	| GeminiThoughtSignatureBlock;

/**
 * Google/Gemini-specific thinking metadata.
 */
export type GoogleThinkingMetadata = {
	/** Thought signature for Gemini extended thinking */
	thoughtSignature?: string;
};

/**
 * Anthropic-specific thinking metadata.
 */
export type AnthropicThinkingMetadata = {
	/** Thinking content from extended thinking mode */
	thinkingContent?: string;
	/** Type of thinking block (thinking or redacted_thinking) */
	thinkingType?: 'thinking' | 'redacted_thinking';
	/** Cryptographic signature for thinking blocks */
	thinkingSignature?: string;
};

/**
 * HITL (Human-in-the-Loop) metadata - presence indicates this is an HITL tool action.
 */
export type HitlMetadata = {
	/** The gated tool node name that will be executed after approval */
	gatedToolNodeName: string;
	/** The tool name as seen by the LLM */
	toolName: string;
	/** Original input for the gated tool */
	originalInput: IDataObject;
};

/**
 * Thinking metadata extracted from LLM responses (Anthropic/Google extended thinking).
 */
export type ThinkingMetadata = {
	google?: GoogleThinkingMetadata;
	anthropic?: AnthropicThinkingMetadata;
};

/**
 * Metadata for engine requests and responses.
 */
export type RequestResponseMetadata = {
	/** Item index being processed */
	itemIndex?: number;
	/** Custom parent node name for log tree structure (overrides default parent) */
	parentNodeName?: string;
	/** Previous tool call requests (for multi-turn conversations) */
	previousRequests?: ToolCallData[];
	/** Current iteration count (for max iterations enforcement) */
	iterationCount?: number;
	/** Google/Gemini-specific metadata */
	google?: GoogleThinkingMetadata;
	/** Anthropic-specific metadata */
	anthropic?: AnthropicThinkingMetadata;
	/** HITL (Human-in-the-Loop) metadata - presence indicates this is an HITL tool action */
	hitl?: HitlMetadata;
};

/**
 * Metadata attached to LangChain tools for tracking source nodes and HITL gating.
 * Extends Record<string, unknown> for compatibility with LangChain's Tool.metadata type.
 */
export interface ToolMetadata extends Record<string, unknown> {
	/** The n8n node name that provides this tool */
	sourceNodeName?: string;
	/** For HITL tools, the gated tool node that will be executed after approval */
	gatedToolNodeName?: string;
	/** The original schema of the tool */
	originalSchema?: ZodType;
	/** Whether this tool came from a toolkit (vs. a standalone tool node) */
	isFromToolkit?: boolean;
}

/**
 * Type guard to check if a block is a thinking content block
 */
export function isThinkingBlock(block: unknown): block is ThinkingContentBlock {
	return (
		typeof block === 'object' &&
		block !== null &&
		'type' in block &&
		block.type === 'thinking' &&
		'thinking' in block &&
		typeof block.thinking === 'string' &&
		'signature' in block &&
		typeof block.signature === 'string'
	);
}

/**
 * Type guard to check if a block is a redacted thinking content block
 */
export function isRedactedThinkingBlock(block: unknown): block is RedactedThinkingContentBlock {
	return (
		typeof block === 'object' &&
		block !== null &&
		'type' in block &&
		block.type === 'redacted_thinking' &&
		'data' in block &&
		typeof block.data === 'string'
	);
}

/**
 * Type guard to check if a block is a Gemini thought signature block
 */
export function isGeminiThoughtSignatureBlock(
	block: unknown,
): block is GeminiThoughtSignatureBlock {
	return (
		typeof block === 'object' &&
		block !== null &&
		'thoughtSignature' in block &&
		typeof block.thoughtSignature === 'string'
	);
}
