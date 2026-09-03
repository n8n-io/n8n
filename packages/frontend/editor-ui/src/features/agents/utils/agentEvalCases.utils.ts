/**
 * Pure mapping between an agent eval dataset's Data Table rows and the cases the
 * eval view renders. Kept free of Pinia and the REST client so the column-mapping
 * rules — the part that would silently corrupt a dataset if wrong — are testable
 * on their own.
 */
import { caseInputFlavorSchema, type AgentEvalColumnMapping } from '@n8n/api-types';

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
	/** Column holding the sampled flavor; absent on datasets that predate it. */
	type?: string;
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

	const type =
		mapping.type && mapping.type !== mapping.input && mapping.type !== criteria
			? mapping.type
			: undefined;

	return { input: mapping.input, whatToCheck: criteria ?? null, ...(type ? { type } : {}) };
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

	// A recognised flavor is a kind; any other non-empty text in that column is a
	// label the user (or the naming step) gave a hand-written check.
	const rawType = columns.type ? row[columns.type] : undefined;
	const flavor = columns.type ? caseInputFlavorSchema.safeParse(rawType) : null;
	const label =
		!flavor?.success && typeof rawType === 'string' && rawType.trim().length > 0
			? rawType.trim()
			: undefined;

	return {
		rowId,
		input: toDisplayText(row[columns.input]),
		whatToCheck: columns.whatToCheck === null ? '' : toDisplayText(row[columns.whatToCheck]),
		...(flavor?.success ? { flavor: flavor.data } : {}),
		...(label ? { label } : {}),
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
	value: Pick<AgentEvalCase, 'input' | 'whatToCheck'> & { type?: string },
	columns: AgentEvalCaseColumns,
): DataTableRow => {
	const row: DataTableRow = { [columns.input]: value.input };
	if (columns.whatToCheck !== null) row[columns.whatToCheck] = value.whatToCheck;
	if (columns.type && value.type !== undefined) row[columns.type] = value.type;
	return row;
};
