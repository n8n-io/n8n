import { bool, obj, str } from '@n8n/node-sdk';

import { table, tableRef } from '../data-table.node';

export const renameTable = table.action('rename', {
	action: 'Rename a table',
	summary: 'Give a data table a new name.',
	flow: { effect: 'write', cardinality: 'per-item' },
	imports: ['dataTables'],
	input: { table: tableRef, name: str().with({ minLength: 1 }).hint('The new name') },
	output: obj({ id: str(), name: str(), renamed: bool() }),
	async run({ input, dataTables }) {
		const opened = await dataTables.open(input.table);
		return { id: opened.id, name: input.name, renamed: await opened.rename(input.name) };
	},
});
