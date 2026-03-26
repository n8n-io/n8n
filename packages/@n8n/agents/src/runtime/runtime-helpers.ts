/**
 * Pure utility functions used by AgentRuntime that require no class context.
 * These are extracted here to keep agent-runtime.ts focused on orchestration logic.
 */
import { toDbMessage } from '../sdk/message';
import type { GenerateResult, StreamChunk, TokenUsage } from '../types';
import { toTokenUsage } from './stream';
import type { AgentDbMessage, AgentMessage, ContentToolResult } from '../types/sdk/message';
import type { JSONValue } from '../types/utils/json';

/** Normalize a string input to an AgentDbMessage array, assigning ids where missing. */
export function normalizeInput(input: AgentMessage[] | string): AgentDbMessage[] {
	if (typeof input === 'string') {
		return [toDbMessage({ role: 'user', content: [{ type: 'text', text: input }] })];
	}
	return input.map(toDbMessage);
}

/** Build an AI SDK tool ModelMessage for a tool execution result. */
export function makeToolResultMessage(
	toolCallId: string,
	toolName: string,
	result: unknown,
): AgentDbMessage {
	return toDbMessage({
		role: 'tool',
		content: [
			{
				type: 'tool-result',
				toolCallId,
				toolName,
				result: result as JSONValue,
			},
		],
	});
}

/**
 * Build an AI SDK tool ModelMessage for a tool execution error.
 * The LLM receives this as a tool result so it can self-correct on the next iteration.
 * The error is surfaced via the output json value so the LLM can read and reason about it.
 */
export function makeErrorToolResultMessage(
	toolCallId: string,
	toolName: string,
	error: unknown,
): AgentDbMessage {
	const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	return toDbMessage({
		role: 'tool',
		content: [
			{
				type: 'tool-result',
				toolCallId,
				toolName,
				result: { error: message } as JSONValue,
				isError: true,
			},
		],
	});
}

/** Extract all tool-result content parts from a flat list of agent messages. */
export function extractToolResults(messages: AgentDbMessage[]): ContentToolResult[] {
	return messages
		.flatMap((m) => ('content' in m ? m.content : []))
		.filter((c): c is ContentToolResult => c.type === 'tool-result');
}

/**
 * Return a ReadableStream that immediately yields an error chunk followed by
 * a finish chunk. Used when setup errors prevent the normal stream loop from
 * starting, so callers always receive a well-formed stream.
 */
export function makeErrorStream(error: unknown): ReadableStream<StreamChunk> {
	const { readable, writable } = new TransformStream<StreamChunk, StreamChunk>();
	const writer = writable.getWriter();
	writer.write({ type: 'error', error }).catch(() => {});
	writer.write({ type: 'finish', finishReason: 'error' }).catch(() => {});
	writer.close().catch(() => {});
	return readable;
}

/** Accumulate token usage across two values, returning undefined if both are absent. */
export function mergeUsage(
	current: TokenUsage | undefined,
	next: TokenUsage | undefined,
): TokenUsage | undefined {
	if (!next) return current;
	if (!current) return next;
	const merged: TokenUsage = {
		promptTokens: current.promptTokens + next.promptTokens,
		completionTokens: current.completionTokens + next.completionTokens,
		totalTokens: current.totalTokens + next.totalTokens,
	};

	const cacheRead =
		(current.inputTokenDetails?.cacheRead ?? 0) + (next.inputTokenDetails?.cacheRead ?? 0);
	const cacheWrite =
		(current.inputTokenDetails?.cacheWrite ?? 0) + (next.inputTokenDetails?.cacheWrite ?? 0);
	if (cacheRead > 0 || cacheWrite > 0) {
		merged.inputTokenDetails = {
			...(cacheRead > 0 && { cacheRead }),
			...(cacheWrite > 0 && { cacheWrite }),
		};
	}

	const reasoning =
		(current.outputTokenDetails?.reasoning ?? 0) + (next.outputTokenDetails?.reasoning ?? 0);
	if (reasoning > 0) {
		merged.outputTokenDetails = { reasoning };
	}

	return merged;
}

/**
 * Accumulate token usage across loop iterations.
 * Wraps mergeUsage + toTokenUsage to keep call sites concise.
 */
export function accumulateUsage(
	current: TokenUsage | undefined,
	raw:
		| {
				inputTokens?: number | undefined;
				outputTokens?: number | undefined;
				totalTokens?: number | undefined;
				inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number };
				outputTokenDetails?: { reasoningTokens?: number };
		  }
		| undefined,
): TokenUsage | undefined {
	if (!raw) return current;
	return mergeUsage(current, toTokenUsage(raw));
}

/** Compute totalCost from sub-agent usage already present on the result. */
export function applySubAgentUsage(result: GenerateResult): GenerateResult {
	if (!result.subAgentUsage || result.subAgentUsage.length === 0) return result;

	const parentCost = result.usage?.cost ?? 0;
	const subCost = result.subAgentUsage.reduce((sum, s) => sum + (s.usage.cost ?? 0), 0);

	return { ...result, totalCost: parentCost + subCost };
}
