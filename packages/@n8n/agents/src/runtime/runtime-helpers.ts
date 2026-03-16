/**
 * Pure utility functions used by AgentRuntime that require no class context.
 * These are extracted here to keep agent-runtime.ts focused on orchestration logic.
 */
import type { ModelMessage } from 'ai';

import type { JSONValue } from '../json';
import type { AgentDbMessage, AgentMessage, ContentToolResult } from '../message';
import { toDbMessage } from '../message';
import type { GenerateResult, StreamChunk, StreamResult, TokenUsage } from '../types';
import { toTokenUsage } from './stream';

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
): ModelMessage {
	return {
		role: 'tool',
		content: [
			{
				type: 'tool-result',
				toolCallId,
				toolName,
				output: { type: 'json', value: result as JSONValue },
			},
		],
	};
}

/**
 * Find the tool name for a given toolCallId by scanning the message history.
 * Skips custom messages.
 */
export function findToolName(toolCallId: string, messages: AgentDbMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.type === 'custom') continue;
		if (msg.role === 'assistant') {
			for (const part of msg.content) {
				if (part.type === 'tool-call' && part.toolCallId === toolCallId) {
					return part.toolName;
				}
			}
		}
	}
	throw new Error(`Could not find tool name for toolCallId: ${toolCallId}`);
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
export function makeErrorStream(error: unknown): StreamResult {
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
	return {
		promptTokens: current.promptTokens + next.promptTokens,
		completionTokens: current.completionTokens + next.completionTokens,
		totalTokens: current.totalTokens + next.totalTokens,
	};
}

/**
 * Accumulate token usage across loop iterations.
 * Wraps mergeUsage + toTokenUsage to keep call sites concise.
 */
export function accumulateUsage(
	current: TokenUsage | undefined,
	raw: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
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
