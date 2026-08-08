// Re-exports from @n8n/api-types so agent-eval FE callers don't reach across
// packages. New shared type? Export it from `@n8n/api-types` first.
//
// Result and rating shapes are still absent: nothing renders per-case results or
// captures a rating yet, so binding them here would only invite a premature read.

import type { AgentEvalDatasetRecord, DataTableDatasetRef } from '@n8n/api-types';

export type {
	AgentEvalColumnMapping,
	AgentEvalDatasetRecord,
	AgentEvalDraftCase,
	AgentEvalRunList,
	AgentEvalRunRecord,
	AgentEvalRunStatus,
	AgentEvalRunSummary,
	CreateAgentEvalRunPayload,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
} from '@n8n/api-types';

/**
 * A case as the cases view renders it: the two mapped columns plus the Data Table
 * row id, which is what row updates and deletes filter on.
 */
export type AgentEvalCase = {
	rowId: number;
	input: string;
	whatToCheck: string;
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
