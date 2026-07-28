import type {
	AgentEvalDatasetRecord,
	AgentEvalResultRecord,
	AgentEvalRunRecord,
	DataTableDatasetRef,
	DatasetRef,
	GoogleSheetsDatasetRef,
} from '@n8n/api-types';
import type { AgentEvalDataset, AgentEvalResult, AgentEvalRun } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

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

// The two ref shapes are disjoint, so each is recognizable from the value alone.
// Used to re-narrow the ref, never to decide which source a dataset is.
const isDataTableRef = (ref: DatasetRef['datasetRef']): ref is DataTableDatasetRef =>
	'dataTableId' in ref;

const isGoogleSheetsRef = (ref: DatasetRef['datasetRef']): ref is GoogleSheetsDatasetRef =>
	'spreadsheetId' in ref;

/**
 * Rebuild the `datasetSource` + `datasetRef` discriminated union from the
 * entity, which stores the two halves as independent columns and so has lost
 * their correlation.
 *
 * Switches on the persisted `datasetSource` — the authoritative discriminator —
 * and uses the predicates only to re-narrow the ref. Inferring the source from
 * the ref's shape instead would silently relabel any future third source as one
 * of these two, reporting a wrong-but-well-typed `datasetSource` to the client.
 * A source/ref disagreement is unreachable through `createDataset` (which
 * persists the pair from an already-validated union) and barred by the column's
 * CHECK constraint, so it can only mean a corrupt row — hence the loud failure
 * rather than a guess.
 */
function toDatasetRefPair(dataset: AgentEvalDataset): DatasetRef {
	const { datasetSource, datasetRef } = dataset;

	if (datasetSource === 'data_table' && isDataTableRef(datasetRef)) {
		return { datasetSource, datasetRef };
	}
	if (datasetSource === 'google_sheets' && isGoogleSheetsRef(datasetRef)) {
		return { datasetSource, datasetRef };
	}

	throw new UnexpectedError(
		`Agent eval dataset ${dataset.id} has a '${datasetSource}' source whose ref does not match that shape.`,
	);
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
