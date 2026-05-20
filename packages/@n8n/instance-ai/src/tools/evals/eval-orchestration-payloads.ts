/**
 * Canonical orchestration payload strings for eval-related "gate" / "reminder"
 * directives. These are embedded both in tool result payloads (so the agent
 * sees a loud inline instruction) and in the system prompt (so the agent
 * always has the rule). Keeping a single source here prevents the two
 * channels from drifting.
 */

export const EVAL_OFFER_GATE_DESCRIPTION =
	'When `executions(action="run")` returns `{ status: "success" }` for a user-initiated run, ' +
	'you MUST call `evals(action="offer", workflowId, projectId)` in this same turn before any ' +
	'user-facing reply. Handle `offer`: `{ eligible: false }` → skip silently, then write your ' +
	'normal post-execution recap. `{ eligible: true, message }` → output `message` verbatim as ' +
	'your reply and end the turn (do not also write a separate execution-result recap; the ' +
	'offer message IS the reply). Only skip the gate when `evals(action="offer")` has already ' +
	'run for this exact workflowId in this conversation, or the user explicitly declined / ' +
	"said they don't want evals. This gate does NOT apply to `verify-built-workflow`, " +
	'post-build turns before a user run, or synthesize turns.';

export const EVAL_PUBLISH_REMINDER_DESCRIPTION =
	'This workflow has test cases wired. Before ending the turn, briefly offer to run them so ' +
	'the published changes can be confirmed — a one-liner is enough (e.g. "Want me to run the ' +
	'test cases to make sure the update didn\'t regress anything?"). Do NOT auto-run them.';

export interface EvalOfferGatePayload {
	required: true;
	workflowId: string;
	instruction: string;
}

export interface EvalPublishReminderPayload {
	required: true;
	workflowId: string;
	instruction: string;
}

export function buildEvalOfferGatePayload(workflowId: string): EvalOfferGatePayload {
	return {
		required: true,
		workflowId,
		instruction: `POST-FIRST-RUN EVAL GATE (workflowId="${workflowId}"): ${EVAL_OFFER_GATE_DESCRIPTION}`,
	};
}

export function buildEvalPublishReminderPayload(workflowId: string): EvalPublishReminderPayload {
	return {
		required: true,
		workflowId,
		instruction: `POST-PUBLISH EVAL RUN REMINDER (workflowId="${workflowId}"): ${EVAL_PUBLISH_REMINDER_DESCRIPTION}`,
	};
}
