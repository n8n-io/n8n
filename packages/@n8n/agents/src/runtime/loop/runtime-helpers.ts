/**
 * Pure utility functions used by AgentRuntime that require no class context.
 * These are extracted here to keep agent-runtime.ts focused on orchestration logic.
 */
import type { ModelTurnError } from './run-output-sink';
import type { StreamChunk, TokenUsage } from '../../types';
import type { AgentMessage, ContentToolCall } from '../../types/sdk/message';
import type { RawProviderError } from '../model/raw-error';

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

/**
 * Finish reasons that indicate the provider rejected or filtered the request
 * when they arrive with zero output. `stop`/`length` with empty output are the
 * model's own (odd but legal) choice; `tool-calls` always carries calls;
 * `error` surfaces through the SDK's thrown error instead.
 */
const EMPTY_RESPONSE_ERROR_FINISH_REASONS = new Set(['other', 'unknown', 'content-filter']);

/**
 * Classify a turn that produced no output as a recognized failure, or return
 * `undefined` when it doesn't look like a provider rejection. Some providers
 * fail this way rather than erroring, reporting the cause only on their raw
 * stream events — when a {@link RawProviderError} was captured there, its type
 * and reason are carried into the result; otherwise the failure is a generic
 * `no_output`.
 */
export function classifyModelTurnError(turn: {
	aiFinishReason: string;
	newMessages: AgentMessage[];
	providerError?: RawProviderError;
}): ModelTurnError | undefined {
	if (turn.newMessages.length > 0) return undefined;
	if (!EMPTY_RESPONSE_ERROR_FINISH_REASONS.has(turn.aiFinishReason)) return undefined;

	const guidance =
		'This can be a provider-side false positive — try rephrasing the message, clearing the chat history, or switching models.';
	if (turn.providerError) {
		return {
			type: turn.providerError.type,
			message: `The model provider blocked this request (${turn.providerError.reason}) and returned no output (finish reason: ${turn.aiFinishReason}). ${guidance}`,
		};
	}
	return {
		type: 'no_output',
		message: `The model returned no output (finish reason: ${turn.aiFinishReason}). The provider may have blocked or filtered the request. ${guidance}`,
	};
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

	const noCache =
		(current.inputTokenDetails?.noCache ?? 0) + (next.inputTokenDetails?.noCache ?? 0);
	const cacheRead =
		(current.inputTokenDetails?.cacheRead ?? 0) + (next.inputTokenDetails?.cacheRead ?? 0);
	const cacheWrite =
		(current.inputTokenDetails?.cacheWrite ?? 0) + (next.inputTokenDetails?.cacheWrite ?? 0);
	if (noCache > 0 || cacheRead > 0 || cacheWrite > 0) {
		merged.inputTokenDetails = {
			...(noCache > 0 && { noCache }),
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
