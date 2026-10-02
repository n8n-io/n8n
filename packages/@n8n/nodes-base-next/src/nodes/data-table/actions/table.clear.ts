import { t } from '@n8n/node-sdk';

import { table, tableRef } from '../data-table.node';

export const clearTable = table.action('clear', {
	action: 'Clear a table',
	summary: 'Delete every row of a data table. The table and its columns stay.',
	flow: { effect: 'write', cardinality: 'per-item' },
	imports: ['dataTables'],
	input: { table: tableRef },
	output: t.obj({ id: t.str(), deletedRows: t.int() }),
	async run({ input, dataTables }) {
		const opened = await dataTables.open(input.table);
		return { id: opened.id, deletedRows: await opened.clear() };
	},
});
