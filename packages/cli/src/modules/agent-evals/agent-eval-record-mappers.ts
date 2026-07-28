import type {
	AgentEvalDatasetRecord,
	AgentEvalResultRecord,
	AgentEvalRunRecord,
	DataTableDatasetRef,
	DatasetRef,
} from '@n8n/api-types';
import type { AgentEvalDataset, AgentEvalResult, AgentEvalRun } from '@n8n/db';

/**
 * Entity → wire-record mappers for the agent-eval REST responses.
 *
 * Explicit field-by-field mapping rather than returning entities directly: it
 * serializes dates as ISO strings, and it keeps the run's cross-main
 * coordination columns (`runningInstanceId`, `cancelRequested`) out of the
 * contract — they're internal scheduling state, and `runningInstanceId` would
 * expose an instance host id. A new entity column therefore can't leak onto the
 * API by accident.
 */

const toIso = (date: Date | null): string | null => date?.toISOString() ?? null;

/**
 * The two ref shapes are disjoint, so which one a dataset holds is decidable
 * from the value itself.
 */
const isDataTableRef = (ref: DatasetRef['datasetRef']): ref is DataTableDatasetRef =>
	'dataTableId' in ref;

/**
 * Rebuild the `datasetSource` + `datasetRef` discriminated union from the
 * entity, which stores the two halves as independent columns and so has lost
 * their correlation. Derived from the ref rather than read off the
 * `datasetSource` column: that keeps the pair narrowable on the client without a
 * cast, and the two can only ever disagree if a row was written outside
 * `createDataset`, which always persists them together from a validated union.
 */
function toDatasetRefPair(dataset: AgentEvalDataset): DatasetRef {
	return isDataTableRef(dataset.datasetRef)
		? { datasetSource: 'data_table', datasetRef: dataset.datasetRef }
		: { datasetSource: 'google_sheets', datasetRef: dataset.datasetRef };
}

export function toDatasetRecord(dataset: AgentEvalDataset): AgentEvalDatasetRecord {
	return {
		id: dataset.id,
		name: dataset.name,
		description: dataset.description,
		agentId: dataset.agentId,
		columnMapping: dataset.columnMapping,
		createdById: dataset.createdById,
		createdAt: dataset.createdAt.toISOString(),
		updatedAt: dataset.updatedAt.toISOString(),
		...toDatasetRefPair(dataset),
	};
}

export function toRunRecord(run: AgentEvalRun): AgentEvalRunRecord {
	return {
		id: run.id,
		datasetId: run.datasetId,
		agentVersionId: run.agentVersionId,
		status: run.status,
		runAt: toIso(run.runAt),
		completedAt: toIso(run.completedAt),
		metrics: run.metrics,
		errorCode: run.errorCode,
		errorDetails: run.errorDetails,
		createdById: run.createdById,
		createdAt: run.createdAt.toISOString(),
		updatedAt: run.updatedAt.toISOString(),
	};
}

export function toResultRecord(result: AgentEvalResult): AgentEvalResultRecord {
	return {
		id: result.id,
		runId: result.runId,
		sourceRowId: result.sourceRowId,
		runIndex: result.runIndex,
		status: result.status,
		input: result.input,
		output: result.output,
		toolCalls: result.toolCalls,
		metrics: result.metrics,
		runAt: toIso(result.runAt),
		completedAt: toIso(result.completedAt),
		errorCode: result.errorCode,
		errorDetails: result.errorDetails,
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}
