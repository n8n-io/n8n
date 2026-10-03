import {
	OperationalError,
	type DataTableRef,
	type DataTableValues,
	type InputItem,
} from '@n8n/node-sdk';

import { cellsOf, row, ROW_COLUMNS, rowFromColumns, storedRow, values } from '../data-table.node';

interface Write {
	readonly table: DataTableRef;
	readonly rows: Array<{ readonly item: InputItem; readonly cells: DataTableValues }>;
}

export const insertRows = row.action('insert', {
	action: 'Insert rows',
	summary: 'Insert one row per item, in one write per table. Gives each stored row with its id.',
	flow: { effect: 'write', cardinality: 'batch' },
	imports: ['dataTables', 'inputOf'],
	input: { values: values.optional().hint('Omit to store the fields of the item') },
	output: storedRow,
	resourceOutput: { method: ROW_COLUMNS, toOutput: rowFromColumns },
	async *run({ items, dataTables, inputOf }) {
		const inputs = await Promise.all(items.map(async (item) => await inputOf(item)));
		// Items can name different tables. Each table gets one write, in the order of its first item.
		const writes = new Map<string, Write>();
		items.forEach((item, index) => {
			const input = inputs[index];
			if (!input) return;
			const key = JSON.stringify(input.table);
			const write: Write = writes.get(key) ?? { table: input.table, rows: [] };
			write.rows.push({ item, cells: input.values ?? cellsOf(item) });
			writes.set(key, write);
		});
		for (const write of writes.values()) {
			const table = await dataTables.open(write.table);
			const stored = await table.insert(write.rows.map(({ cells }) => cells));
			if (stored.length !== write.rows.length) {
				throw new OperationalError(
					`The data table stored ${stored.length} of ${write.rows.length} rows`,
				);
			}
			yield* stored.map((json, index) => ({ json, from: write.rows[index]?.item ?? items }));
		}
	},
});
