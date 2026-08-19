/**
 * Pure utility functions used by AgentRuntime that require no class context.
 * These are extracted here to keep agent-runtime.ts focused on orchestration logic.
 */
import type { ModelTurnError } from './run-output-sink';
import type { StreamChunk, TokenUsage, McpConnectionFailedEvent } from '../../types';
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
 * Render per-server MCP connection failures into a short, model-facing note
 * the agent can use to tell the user a server was unavailable. Returns
 * `undefined` when there are no failures so the volatile system message is
 * omitted entirely. The note is system-message only — never persisted to
 * thread memory or shown in the UI.
 */
export function formatMcpConnectionNote(
	failures: readonly McpConnectionFailedEvent[],
): string | undefined {
	if (failures.length === 0) return undefined;
	const lines = failures.map((f) => `- ${f.server}: ${f.error}`).join('\n');
	return `<mcp-connection-status>
The following MCP server(s) could not be reached, so their tools are unavailable for this run:
${lines}
If this affects the user's request, briefly let them know which server is unavailable.
</mcp-connection-status>`;
}

/**
 * Finish reasons that indicate the provider rejected or filtered the request
 * when they arrive with zero output. `stop`/`length` with empty output are the
 * model's own (odd but legal) choice; `tool-calls` always carries calls;
 * `error` surfaces through the SDK's thrown error instead.
 */
const EMPTY_RESPONSE_ERROR_FINISH_REASONS = new Set(['other', 'unknown', 'content-filter']);

/**
 * Whether a turn carries output the user can see or the loop can act on.
 * Reasoning is neither: a thinking block the model never turned into an answer
 * or a tool call leaves the run with nothing to show and nothing to do next.
 */
function hasActionableContent(messages: AgentMessage[]): boolean {
	return messages.some(
		(m) =>
			'content' in m &&
			Array.isArray(m.content) &&
			m.content.some(
				(c) =>
					(c.type === 'text' && c.text.trim().length > 0) ||
					c.type === 'tool-call' ||
					c.type === 'file',
			),
	);
}

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
	if (hasActionableContent(turn.newMessages)) return undefined;
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

/**
 * True when a turn produced no usable output — no non-whitespace text, no tool
 * call, no file. Providers emit such a turn mid-task in more than one shape: a
 * bare `stop` (observed with Kimi via Together), or a stream that dies before
 * its terminal chunk, leaving the SDK to synthesize a finish from its defaults
 * (`other`, no usage) around a reasoning-only message. Either way the run would
 * end silently with work half-done, so callers retry a bounded number of times
 * before accepting it. Reasoning-only turns count as empty: they carry no
 * user-visible output and no action. `tool-calls` is the one finish reason that
 * cannot be empty — the calls are the turn's output.
 */
export function isEmptyModelTurn(turn: {
	aiFinishReason: string;
	newMessages: AgentMessage[];
	structuredOutput?: unknown;
	errorReason?: ModelTurnError;
}): boolean {
	if (turn.aiFinishReason === 'tool-calls') return false;
	if (turn.structuredOutput !== undefined) return false;
	// A safety block is the provider's deterministic verdict on this prompt:
	// re-issuing it earns the same answer and discards the captured reason,
	// which is the only place the block is explained.
	if (turn.errorReason?.type === 'prompt_blocked') return false;
	return !hasActionableContent(turn.newMessages);
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
