import type { TableBlock } from '@n8n/api-types';

import { visibleRows } from '../rendering/blocks/table-rows';
import type { BlockRenderContext } from '../rendering/types';
import type {
	AppDataTableColumn,
	AppDataTableFilter,
	AppDataTableHandle,
	AppDataTableRow,
	AppDataTableValue,
} from '../runtime/page-context.factory';

export type TableActionOutcome = { redirect: string } | { error: string };

export const SYSTEM_COLUMNS = new Set(['id', 'createdAt', 'updatedAt']);

/** The columns a visitor may change: the block's shown columns minus the system ones. */
export const writableColumns = (
	block: TableBlock,
	schema: AppDataTableColumn[],
): AppDataTableColumn[] =>
	schema.filter(
		(column) =>
			!SYSTEM_COLUMNS.has(column.name) && (block.data.columns?.includes(column.name) ?? true),
	);

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** `undefined` means the value cannot be stored in a column of that type. */
function coerceValue(
	raw: unknown,
	type: AppDataTableColumn['type'],
): AppDataTableValue | undefined {
	const value = raw === null || raw === undefined ? '' : String(raw);
	switch (type) {
		case 'number': {
			if (value === '') return null;
			const parsed = Number(value);
			return Number.isNaN(parsed) ? undefined : parsed;
		}
		case 'boolean':
			return value === 'true';
		case 'date': {
			if (value === '') return null;
			// The edit row shows the UTC value in a `datetime-local` input, which
			// posts it back without an offset; parse it as UTC, not server-local time.
			const parsed = new Date(LOCAL_DATETIME.test(value) ? `${value}Z` : value);
			return Number.isNaN(parsed.getTime()) ? undefined : parsed;
		}
		case 'string':
			return value;
	}
}

export async function runTableAction({
	handle,
	block,
	name,
	input,
	ctx,
}: {
	handle: AppDataTableHandle;
	block: TableBlock;
	name: string;
	input: Record<string, unknown>;
	/** The rendered page's context; its params decide which rows the block shows. */
	ctx: BlockRenderContext;
}): Promise<TableActionOutcome> {
	const allowed =
		(name === 'delete' && block.data.deletable === true) ||
		(name === 'update' && block.data.editable === true);
	if (!allowed) return { error: 'Action not found' };

	const id = Number(input.id);
	if (!Number.isInteger(id) || id <= 0) return { error: 'Invalid row id' };
	const shown = await visibleRows(handle, block, ctx);
	if (!shown.some((row) => row.id === id)) return { error: 'Row not found' };
	const filter: AppDataTableFilter = {
		type: 'and',
		filters: [{ columnName: 'id', condition: 'eq', value: id }],
	};

	if (name === 'delete') {
		await handle.deleteRows({ filter });
	} else {
		const data: AppDataTableRow = {};
		for (const column of writableColumns(block, await handle.getColumns())) {
			if (!(column.name in input)) continue;
			const value = coerceValue(input[column.name], column.type);
			if (value === undefined) return { error: `Invalid value for "${column.name}"` };
			data[column.name] = value;
		}
		await handle.updateRows({ filter, data });
	}

	return { redirect: `?_form=${block.id}&_status=ok` };
}
