import type { DataTableService } from '@n8n/backend-module-data-table';
import type { AgentEvalDataset, User } from '@n8n/db';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { DataTableColumnJsType, DataTableRow, JsonObject, JsonValue } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';

const ROW_PAGE_SIZE = 100;
// Each case is a real agent execution, so a run is capped rather than letting a
// large table launch thousands of model calls. Raise deliberately if needed.
const MAX_CASES = 500;

/** A dataset row resolved into a runnable case via the dataset's column mapping. */
export interface ResolvedCase {
	/** Origin Data Table row id, tracked loosely (rows are external/mutable). */
	sourceRowId: string | null;
	/** The opening message the agent receives. */
	input: string;
	/** The case snapshot persisted on the result row for later judging. */
	snapshot: JsonObject;
}

/**
 * Resolve the dataset's Data Table rows into runnable cases via its column
 * mapping. Mirrors {@link EvaluationDatasetService}'s data-table access: the
 * table may live in a different project than the agent, so access is checked
 * on the table directly.
 */
export async function resolveCases(
	dataTableService: DataTableService,
	dataset: AgentEvalDataset,
	user: User,
): Promise<ResolvedCase[]> {
	const mapping = dataset.columnMapping;
	if (!mapping?.input) {
		throw new BadRequestError('The dataset has no input column mapping.');
	}

	// Narrowed by the caller (datasetSource === 'data_table'): the ref carries a table id.
	const dataTableId = (dataset.datasetRef as { dataTableId: string }).dataTableId;

	const allowed = await userHasScopes(user, ['dataTable:readRow'], false, { dataTableId });
	if (!allowed) throw new ForbiddenError('You do not have access to this dataset.');

	const tableProjectId = await dataTableService.getProjectIdForDataTable(dataTableId);

	// Validate the mapping against the live columns so a renamed/deleted column
	// fails loudly here instead of silently turning every case into an
	// "empty input" error once the run starts.
	const columnNames = new Set(
		(await dataTableService.getColumns(dataTableId, tableProjectId)).map((c) => c.name),
	);
	const missing = (
		[
			['input', mapping.input],
			['expectedOutput', mapping.expectedOutput],
			['criteria', mapping.criteria],
			['expectedTools', mapping.expectedTools],
		] as const
	)
		.filter(([, name]) => name && !columnNames.has(name))
		.map(([role, name]) => `${role} → '${name}'`);
	if (missing.length > 0) {
		throw new BadRequestError(
			`The dataset's column mapping references columns missing from the data table: ${missing.join(', ')}.`,
		);
	}

	const rows: DataTableRow[] = [];
	let skip = 0;
	for (;;) {
		const { data, count } = await dataTableService.getManyRowsAndCount(
			dataTableId,
			tableProjectId,
			{ take: ROW_PAGE_SIZE, skip },
		);
		// Reject oversized datasets rather than launching thousands of real
		// agent executions (`count` is the table total, known from page one).
		if (count > MAX_CASES) {
			throw new BadRequestError(
				`The dataset has ${count} rows, exceeding the ${MAX_CASES}-case limit for a single run.`,
			);
		}
		rows.push(...data);
		skip += data.length;
		if (data.length === 0 || skip >= count) break;
	}

	return rows.map((row) => {
		const snapshot: JsonObject = { input: cellToJson(row[mapping.input]) };
		if (mapping.expectedOutput) {
			snapshot.expectedOutput = cellToJson(row[mapping.expectedOutput]);
		}
		if (mapping.criteria) snapshot.criteria = cellToJson(row[mapping.criteria]);
		if (mapping.expectedTools) snapshot.expectedTools = cellToJson(row[mapping.expectedTools]);

		return {
			sourceRowId: row.id === undefined || row.id === null ? null : String(row.id),
			input: cellToString(row[mapping.input]),
			snapshot,
		};
	});
}

/**
 * Reads `criteria`/`expectedOutput` back out of a case snapshot as judge-ready
 * text. Mirrors {@link cellToJson}'s scalar coercion — the snapshot stores
 * whatever the mapped Data Table cell held.
 */
export function readSnapshotText(
	snapshot: JsonObject,
	key: 'criteria' | 'expectedOutput',
): string | null {
	const value = snapshot[key];
	if (typeof value === 'string' && value.length > 0) return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return null;
}

/**
 * Reads the expected tools of a case snapshot. The snapshot holds the raw
 * cell: tool names with commas between them.
 */
export function readSnapshotExpectedTools(snapshot: JsonObject): string[] {
	const value = snapshot.expectedTools;
	if (typeof value !== 'string') return [];
	return value
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

/** Coerce a Data Table cell into the agent's opening message. */
export function cellToString(value: DataTableColumnJsType | undefined): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

/** Coerce a Data Table cell into a JSON-safe snapshot value. */
export function cellToJson(value: DataTableColumnJsType | undefined): JsonValue {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value.toISOString();
	return value;
}
