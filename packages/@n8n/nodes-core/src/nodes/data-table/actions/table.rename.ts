import { t } from '@n8n/node-sdk';

import { table, tableRef } from '../data-table.node';

export const renameTable = table.action('rename', {
	action: 'Rename a table',
	summary: 'Give a data table a new name.',
	flow: { effect: 'write', cardinality: 'per-item' },
	imports: ['dataTables'],
	input: {
		table: tableRef,
		name: t.str().with({ minLength: 1 }).title('New Name').hint('The new name'),
	},
	output: t.obj({ id: t.str(), name: t.str(), renamed: t.bool() }),
	async run({ input, dataTables }) {
		const opened = await dataTables.open(input.table);
		return { id: opened.id, name: input.name, renamed: await opened.rename(input.name) };
	},
});
