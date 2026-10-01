/**
 * Pure mapping between an agent eval dataset's Data Table rows and the cases the
 * eval view renders. Kept free of Pinia and the REST client so the column-mapping
 * rules — the part that would silently corrupt a dataset if wrong — are testable
 * on their own.
 */
import type { AgentEvalColumnMapping } from '@n8n/api-types';

import { DEFAULT_ID_COLUMN_NAME } from '@/features/core/dataTable/constants';
import type { DataTableRow, DataTableValue } from '@/features/core/dataTable/dataTable.types';

import type {
	AgentEvalCase,
	AgentEvalDatasetRecord,
	AgentEvalDataTableDataset,
} from '../agentEvals.types';

/**
 * The columns a case is read from and written to. `whatToCheck` is null when the
 * dataset maps no criteria column — a valid dataset, just one with no per-case check.
 */
export type AgentEvalCaseColumns = {
	input: string;
	whatToCheck: string | null;
	/** Grouping column; absent when the dataset maps none. */
	check?: string | null;
	kind?: string | null;
	suggested?: string | null;
};

/**
 * Column names come from the dataset's own mapping, never guessed. Case generation
 * happens to write `input`/`criteria`, but a dataset whose mapping says otherwise
 * would be silently corrupted by a hardcoded fallback: the text would land in a
 * column the runner never reads, producing a run that tests nothing and reports
 * success. Without an `input` column there is nothing to render, so callers get
 * null and fall back to a read-only view.
 */
export const resolveCaseColumns = (
	mapping: AgentEvalColumnMapping | null,
): AgentEvalCaseColumns | null => {
	if (!mapping?.input) return null;

	// A mapping may name the same column for both roles — nothing in
	// `agentEvalColumnMappingSchema` forbids it. Writing both fields to one column
	// would let the check text overwrite the request, so the next run would send the
	// wrong prompt. Treat an aliased criteria as absent: the request stays writable
	// and the check renders read-only rather than corrupting the row.
	const criteria = mapping.criteria === mapping.input ? undefined : mapping.criteria;

	// Optional columns never alias the input, or a write would overwrite the request.
	const optional = (name: string | undefined) => (name && name !== mapping.input ? name : null);
	const check = optional(mapping.check);
	const kind = optional(mapping.kind);
	const suggested = optional(mapping.suggested);

	return {
		input: mapping.input,
		whatToCheck: criteria ?? null,
		...(check ? { check } : {}),
		...(kind ? { kind } : {}),
		...(suggested ? { suggested } : {}),
	};
};

/** Narrows a dataset to its Data Table backing — the single place the ref union is split. */
export const isDataTableDataset = (
	dataset: AgentEvalDatasetRecord,
): dataset is AgentEvalDataTableDataset =>
	dataset.datasetSource === 'data_table' && 'dataTableId' in dataset.datasetRef;

/** Everything needed to address a dataset's case rows, resolved once per dataset. */
export type AgentEvalCaseSource = {
	datasetId: string;
	dataTableId: string;
	columns: AgentEvalCaseColumns;
};

/**
 * Bundles a dataset's id, its table and its resolved columns. Null when the mapping
 * names no input column, which is the signal to fall back to a read-only view rather
 * than write cases into columns the runner would ignore.
 */
export const toCaseSource = (dataset: AgentEvalDataTableDataset): AgentEvalCaseSource | null => {
	const columns = resolveCaseColumns(dataset.columnMapping);
	if (!columns) return null;

	return { datasetId: dataset.id, dataTableId: dataset.datasetRef.dataTableId, columns };
};

/**
 * Renders any cell as the plain text the view shows. Takes `undefined` on top of the
 * value union because a mapping can name a column the table no longer has — indexing
 * a row is typed as always present, but at runtime that yields `undefined`, and
 * `String(undefined)` would put the word "undefined" in front of the user.
 */
const toDisplayText = (value: DataTableValue | undefined): string => {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	return String(value);
};

/**
 * Row to case. The numeric system `id` is what row updates and deletes filter on,
 * so a row without one is dropped rather than rendered as a case that silently
 * fails to save.
 */
export const toAgentEvalCase = (
	row: DataTableRow,
	columns: AgentEvalCaseColumns,
): AgentEvalCase | null => {
	const rowId = row[DEFAULT_ID_COLUMN_NAME];
	if (typeof rowId !== 'number') return null;

	return {
		rowId,
		input: toDisplayText(row[columns.input]),
		whatToCheck: columns.whatToCheck === null ? '' : toDisplayText(row[columns.whatToCheck]),
		...(columns.check ? { check: toDisplayText(row[columns.check]) } : {}),
		...(columns.kind ? { kind: toDisplayText(row[columns.kind]) } : {}),
		...(columns.suggested ? { suggested: row[columns.suggested] === true } : {}),
	};
};

export const toAgentEvalCases = (
	rows: DataTableRow[],
	columns: AgentEvalCaseColumns,
): AgentEvalCase[] =>
	rows.reduce<AgentEvalCase[]>((cases, row) => {
		const mapped = toAgentEvalCase(row, columns);
		if (mapped) cases.push(mapped);
		return cases;
	}, []);

/**
 * Case to row. Writes only the mapped columns so the update stays partial and
 * leaves any other column on the table — an expected output, a note — untouched.
 */
export const toDataTableRow = (
	value: Pick<AgentEvalCase, 'input' | 'whatToCheck'> &
		Partial<Pick<AgentEvalCase, 'check' | 'kind' | 'suggested'>>,
	columns: AgentEvalCaseColumns,
): DataTableRow => {
	const row: DataTableRow = { [columns.input]: value.input };
	if (columns.whatToCheck !== null) row[columns.whatToCheck] = value.whatToCheck;
	if (columns.check && value.check !== undefined) row[columns.check] = value.check;
	if (columns.kind && value.kind !== undefined) row[columns.kind] = value.kind;
	if (columns.suggested && value.suggested !== undefined) row[columns.suggested] = value.suggested;
	return row;
};
