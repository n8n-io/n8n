import { t } from '@n8n/node-sdk';

import { table, tableRef } from '../data-table.node';

export const deleteTable = table.action('delete', {
	action: 'Delete a table',
	summary: 'Delete a data table and all its rows.',
	flow: { effect: 'write', cardinality: 'per-item' },
	imports: ['dataTables'],
	input: { table: tableRef },
	output: t.obj({ id: t.str(), deleted: t.bool() }),
	async run({ input, dataTables }) {
		const opened = await dataTables.open(input.table);
		return { id: opened.id, deleted: await opened.drop() };
	},
});
