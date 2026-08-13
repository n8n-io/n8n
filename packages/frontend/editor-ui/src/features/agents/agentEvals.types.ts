// Re-exports from @n8n/api-types so agent-eval FE callers don't reach across
// packages. New shared type? Export it from `@n8n/api-types` first.

export type {
	AgentEvalCorrection,
	AgentEvalDatasetRecord,
	AgentEvalDraftCase,
	AgentEvalPage,
	AgentEvalRatingRecord,
	AgentEvalResultRecord,
	AgentEvalResultStatus,
	AgentEvalRunDetail,
	AgentEvalRunList,
	AgentEvalRunRecord,
	AgentEvalRunStatus,
	AgentEvalRunSummary,
	AgentEvalVote,
	CreateAgentEvalRatingPayload,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
	// A result's `toolCalls` blob holds records of this shape under `calls`; the
	// review view narrows to it rather than re-describing the runner's output.
	InstanceAiEvalAgentToolCallRecord,
} from '@n8n/api-types';

// Values, not types: the page size the run-detail route defaults to, and the
// per-field bounds the rating service enforces, so the editor caps its inputs at
// the same numbers instead of restating them.
export {
	AGENT_EVAL_MAX_COMMENT_CHARS,
	AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS,
	AGENT_EVAL_RESULTS_DEFAULT_TAKE,
	// The server clamps `take` to this rather than rejecting it, so a re-read asking
	// for more silently returns fewer rows than the caller had.
	MAX_ITEMS_PER_PAGE,
} from '@n8n/api-types';
