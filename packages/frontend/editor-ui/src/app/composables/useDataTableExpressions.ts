import {
	collectStrings,
	extractDataTableRefs,
	isKeyedDataTableRef,
	type DataTableExpressionRef,
	type DataTableExpressionRows,
	type DataTableRowReturn,
} from 'n8n-workflow';

import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

/**
 * Rows already fetched for a preview, by table, column and value. Expression
 * previews re-resolve on every keystroke, so without this each one would hit
 * the API again. Rows can go stale until a reload, which a preview can live with.
 */
const cache = new Map<string, DataTableRowReturn | undefined>();

async function fetchRow(
	dataTableId: string,
	projectId: string,
	lookup: { column: string; value: unknown } | { edge: 'first' | 'last' },
): Promise<DataTableRowReturn | undefined> {
	const key =
		'edge' in lookup
			? `${dataTableId}:${lookup.edge}`
			: `${dataTableId}:${lookup.column}:${String(lookup.value)}`;
	if (cache.has(key)) return cache.get(key);

	const sortBy = 'edge' in lookup && lookup.edge === 'last' ? 'id:desc' : 'id:asc';
	const filter =
		'edge' in lookup
			? undefined
			: JSON.stringify({
					type: 'and',
					filters: [{ columnName: lookup.column, condition: 'eq', value: lookup.value }],
				});

	let row: DataTableRowReturn | undefined;
	try {
		const response = await useDataTableStore().fetchDataTableContent(
			dataTableId,
			projectId,
			1,
			1,
			sortBy,
			filter,
		);
		row = response.data[0] as DataTableRowReturn | undefined;
	} catch {
		// A preview that cannot load a row shows nothing for it.
	}

	cache.set(key, row);
	return row;
}

/**
 * Fetches the rows a parameter's `$datatable` expressions refer to, so the
 * editor preview shows real values. Mirrors the engine's prefetch, but for the
 * single item the editor is previewing rather than every input item.
 */
export async function fetchDataTableExpressionRows(
	parameter: unknown,
	projectId: string | undefined,
	resolveKey: (expression: string) => Promise<unknown>,
): Promise<DataTableExpressionRows | undefined> {
	if (!projectId) return undefined;

	const refs = new Map<string, DataTableExpressionRef>();
	for (const text of collectStrings(parameter)) {
		for (const ref of extractDataTableRefs(text)) refs.set(JSON.stringify(ref), ref);
	}
	if (refs.size === 0) return undefined;

	const tables = await useDataTableStore().fetchDataTablesForProject(projectId);
	const idByName = new Map(tables.map((table) => [table.name.toLowerCase(), table.id]));

	const rows: DataTableExpressionRows = {};

	await Promise.all(
		[...refs.values()].map(async (ref) => {
			const dataTableId = idByName.get(ref.table.toLowerCase());
			if (!dataTableId) return;

			const target = (rows[ref.table] ??= { row: {}, matched: {} });

			if (!isKeyedDataTableRef(ref)) {
				const row = await fetchRow(dataTableId, projectId, { edge: ref.accessor });
				if (row) target[ref.accessor] = row;
				return;
			}

			const value = await resolveKey(ref.keyExpression);
			if (value === null || value === undefined) return;

			const column = ref.accessor === 'row' ? 'id' : ref.column;
			const row = await fetchRow(dataTableId, projectId, { column, value });
			if (!row) return;

			if (ref.accessor === 'row') target.row[String(value)] = row;
			else (target.matched[column] ??= {})[String(value)] = row;
		}),
	);

	return rows;
}
