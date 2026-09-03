// Re-exports from @n8n/api-types so agent-eval FE callers don't reach across
// packages. New shared type? Export it from `@n8n/api-types` first.

import type { AgentEvalDatasetRecord, CaseInputFlavor, DataTableDatasetRef } from '@n8n/api-types';

export type {
	AgentEvalColumnMapping,
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

/**
 * A case as the cases view renders it: the two mapped columns plus the Data Table
 * row id, which is what row updates and deletes filter on.
 */
export type AgentEvalCase = {
	rowId: number;
	input: string;
	whatToCheck: string;
	/** Sampled input flavor, when the dataset records one (generated datasets do). */
	flavor?: CaseInputFlavor;
};

/**
 * A dataset narrowed to its Data Table backing. `AgentEvalDatasetRecord` carries a
 * `datasetSource` union, so narrowing once — via `isDataTableDataset` — keeps every
 * downstream caller off the Google Sheets branch instead of re-narrowing the ref.
 */
export type AgentEvalDataTableDataset = Omit<
	AgentEvalDatasetRecord,
	'datasetSource' | 'datasetRef'
> & {
	datasetSource: 'data_table';
	datasetRef: DataTableDatasetRef;
};
