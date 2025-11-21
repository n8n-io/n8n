import type { AIMessage } from '@langchain/core/messages';
import type { IDataObject, GenericValue } from 'n8n-workflow';

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
 * Metadata for engine requests and responses.
 */
export type RequestResponseMetadata = {
	/** Item index being processed */
	itemIndex?: number;
	/** Previous tool call requests (for multi-turn conversations) */
	previousRequests?: ToolCallData[];
	/** Current iteration count (for max iterations enforcement) */
	iterationCount?: number;
};
