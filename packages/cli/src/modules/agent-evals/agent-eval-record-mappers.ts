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
 * Entity → wire-record mappers. Mapped field-by-field so dates serialize as ISO
 * strings and a new entity column can't leak onto the API by accident — notably
 * the run's `runningInstanceId` (an instance host id) and `cancelRequested`.
 */

const toIso = (date: Date | null): string | null => date?.toISOString() ?? null;

// Used only to re-narrow a ref, never to decide which source a dataset is.
const isDataTableRef = (ref: DatasetRef['datasetRef']): ref is DataTableDatasetRef =>
	'dataTableId' in ref;

const isGoogleSheetsRef = (ref: DatasetRef['datasetRef']): ref is GoogleSheetsDatasetRef =>
	'spreadsheetId' in ref;

/**
 * Rebuild the source/ref union, which the entity stores as two uncorrelated
 * columns. Switches on `datasetSource` — inferring it from the ref's shape would
 * silently relabel a future third source as one of today's two. A disagreeing
 * pair is unreachable via `createDataset`, so it means a corrupt row.
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
