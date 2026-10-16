import type { InstanceAiEvalInterceptedRequest } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { isUnknownArray } from '@n8n/utils/is-unknown-array';

import type { ToolCall, ToolCallState } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';

import type { InstanceAiEvalAgentToolCallRecord } from '../agentEvals.types';

/** The recorded value for a call the runner cancelled, as opposed to one that failed. */
const CANCELED_ERROR = 'canceled';

/**
 * Only the fields the review view renders. Narrowing to the full record would
 * reject rows written before a field existed.
 */
type PersistedToolCall = Pick<
	InstanceAiEvalAgentToolCallRecord,
	'tool' | 'input' | 'output' | 'error' | 'toolCallId' | 'status' | 'mocked' | 'interceptedRequests'
>;

export type EvalDisplayToolCall = ToolCall & {
	mocked?: boolean;
	interceptedRequests?: InstanceAiEvalInterceptedRequest[];
};

function isInterceptedRequest(value: unknown): value is InstanceAiEvalInterceptedRequest {
	return (
		isRecord(value) &&
		typeof value.url === 'string' &&
		typeof value.method === 'string' &&
		typeof value.nodeType === 'string'
	);
}

function isPersistedToolCall(value: unknown): value is PersistedToolCall {
	return isRecord(value) && typeof value.tool === 'string';
}

function resolveState(
	error: string | undefined,
	status: PersistedToolCall['status'],
): ToolCallState {
	if (status === 'running') return TOOL_CALL_STATE.RUNNING;
	if (status === 'error') return TOOL_CALL_STATE.ERROR;
	if (error === undefined) return TOOL_CALL_STATE.DONE;
	// A cancelled call isn't a failure, and rendering it as one would overstate
	// what went wrong in the run.
	if (error === CANCELED_ERROR) return TOOL_CALL_STATE.CANCELLED;
	return TOOL_CALL_STATE.ERROR;
}

/**
 * Adapts a persisted eval result's `toolCalls` blob into the shape
 * `AgentChatToolSteps` renders, so the chat component stays the single renderer of
 * a tool-call disclosure.
 *
 * The runner stores `{ calls: [...] }`. Live progress carries the runtime call id
 * and status. Older completed records use a synthesized id and terminal state.
 *
 * Takes the blob as `unknown` rather than `JsonObject`: the column's declared type
 * says nothing useful about its elements, and narrowing from `JsonValue` can't
 * reach a record shape whose `input`/`output` are themselves opaque.
 */
export function toDisplayToolCalls(toolCalls: unknown): EvalDisplayToolCall[] {
	if (!isRecord(toolCalls) || !isUnknownArray(toolCalls.calls)) return [];

	return toolCalls.calls.filter(isPersistedToolCall).map((call, index) => ({
		tool: call.tool,
		// Older records carry no id. The index keeps repeated calls distinct.
		toolCallId: typeof call.toolCallId === 'string' ? call.toolCallId : `${index}-${call.tool}`,
		input: call.input,
		output: call.output,
		state: resolveState(call.error, call.status),
		mocked: call.mocked === true,
		interceptedRequests: isUnknownArray(call.interceptedRequests)
			? call.interceptedRequests.filter(isInterceptedRequest)
			: [],
		// `error` is deliberately not forwarded as `output`: it can be an
		// internal diagnostic about unattributed requests or interrupted execution. Leaving `output` empty
		// makes the renderer fall back to its generic tool-error copy, which is
		// what a reviewer should see.
	}));
}
