/**
 * Pure utility functions used by AgentRuntime that require no class context.
 * These are extracted here to keep agent-runtime.ts focused on orchestration logic.
 */
import type { GenerateResult, StreamChunk, TokenUsage } from '../types';
import { toTokenUsage } from './stream';
import type { AgentMessage, ContentToolCall } from '../types/sdk/message';

/**
 * Normalize caller input to `AgentMessage[]` for the runtime. String input becomes a
 * single user message.
 */
export function normalizeInput(input: AgentMessage[] | string): AgentMessage[] {
	if (typeof input === 'string') {
		return [{ role: 'user', content: [{ type: 'text', text: input }] }];
	}
	return input;
}

/** Stringify an error value for use in a rejected tool-call block. */
export function stringifyError(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Extract all settled (resolved or rejected) tool-call blocks from a flat list of agent messages. */
export function extractSettledToolCalls(messages: AgentMessage[]): ContentToolCall[] {
	return messages
		.flatMap((m) => ('content' in m ? m.content : []))
		.filter((c): c is ContentToolCall => c.type === 'tool-call' && c.state !== 'pending');
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
