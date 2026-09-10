import {
	extractDataTableRefs,
	type DataTableExpressionRows,
	type DataTableRowReturn,
} from 'n8n-workflow';

import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

async function fetchRow(
	dataTableId: string,
	projectId: string,
	options: { sortBy: string; filter?: string },
): Promise<DataTableRowReturn | undefined> {
	try {
		const response = await useDataTableStore().fetchDataTableContent(
			dataTableId,
			projectId,
			1,
			1,
			options.sortBy,
			options.filter,
		);
		// The API returns dates as ISO strings; the preview shows them as such.
		return response.data[0] as DataTableRowReturn | undefined;
	} catch {
		// A row the preview cannot load resolves like a row that does not exist.
		return undefined;
	}
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
	const refs = extractDataTableRefs(parameter);
	if (refs.length === 0 || !projectId) return undefined;

	let tables: Awaited<
		ReturnType<ReturnType<typeof useDataTableStore>['fetchDataTablesForProject']>
	>;
	try {
		tables = await useDataTableStore().fetchDataTablesForProject(projectId);
	} catch {
		return undefined;
	}

	const rows: DataTableExpressionRows = {};

	await Promise.all(
		refs.map(async (ref) => {
			const dataTableId = tables.find((table) => table.name === ref.table)?.id;
			if (!dataTableId) return;

			const target = (rows[ref.table] ??= { row: {}, by: {} });

			if (!('column' in ref)) {
				const sortBy = ref.accessor === 'first' ? 'id:asc' : 'id:desc';
				const row = await fetchRow(dataTableId, projectId, { sortBy });
				if (row) target[ref.accessor] = row;
				return;
			}

			const value = await resolveKey(ref.keyExpression);
			if (value === null || value === undefined) return;

			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: ref.column, condition: 'eq', value }],
			});
			const row = await fetchRow(dataTableId, projectId, { sortBy: 'id:asc', filter });
			if (!row) return;

			if (ref.accessor === 'row') target.row[String(value)] = row;
			else (target.by[ref.column] ??= {})[String(value)] = row;
		}),
	);

	return rows;
}
