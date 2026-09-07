import { isRecord } from '@n8n/utils/is-record';

import type { ToolCall, ToolCallState } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';

import type { InstanceAiEvalAgentToolCallRecord } from '../agentEvals.types';

/** The recorded value for a call the runner cancelled, as opposed to one that failed. */
const CANCELED_ERROR = 'canceled';

/**
 * Only the fields the review view renders. Narrowing to the full record would
 * reject rows written before a field existed, for no gain — the extra fields
 * (`kind`, `mocked`, `interceptedRequests`) have no bearing on the disclosure.
 */
type PersistedToolCall = Pick<
	InstanceAiEvalAgentToolCallRecord,
	'tool' | 'input' | 'output' | 'error'
>;

/** `Array.isArray` widens an `unknown` to `any[]`; this keeps the elements opaque. */
function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function isPersistedToolCall(value: unknown): value is PersistedToolCall {
	return isRecord(value) && typeof value.tool === 'string';
}

function resolveState(error: string | undefined): ToolCallState {
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
 * The runner stores `{ calls: [...] }`, and its records carry neither a call id nor
 * a state — a chat tool call is observed live, an eval one is read back after the
 * fact — so both are synthesized here.
 *
 * Takes the blob as `unknown` rather than `JsonObject`: the column's declared type
 * says nothing useful about its elements, and narrowing from `JsonValue` can't
 * reach a record shape whose `input`/`output` are themselves opaque.
 */
export function toDisplayToolCalls(toolCalls: unknown): ToolCall[] {
	if (!isRecord(toolCalls) || !isUnknownArray(toolCalls.calls)) return [];

	return toolCalls.calls.filter(isPersistedToolCall).map((call, index) => ({
		tool: call.tool,
		// The persisted records carry no id, and this is only ever a render key.
		// Index-prefixed so repeated calls to the same tool stay distinct.
		toolCallId: `${index}-${call.tool}`,
		input: call.input,
		output: call.output,
		state: resolveState(call.error),
		// `error` is deliberately not forwarded as `output`: the only errored
		// records the runner writes are ledger-only entries whose message is an
		// internal diagnostic about unattributed requests. Leaving `output` empty
		// makes the renderer fall back to its generic tool-error copy, which is
		// what a reviewer should see.
	}));
}
