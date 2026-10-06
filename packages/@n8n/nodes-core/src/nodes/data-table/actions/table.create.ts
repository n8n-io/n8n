import { t } from '@n8n/node-sdk';

import { columns, pagesOf, table, tableInfo } from '../data-table.node';

export const createTable = table.action('create', {
	action: 'Create a table',
	summary: 'Create a data table with these columns, or give the table that has the name.',
	flow: { effect: 'write', cardinality: 'per-item' },
	imports: ['dataTables'],
	input: {
		name: t.str().with({ minLength: 1 }).title('Name'),
		columns,
		reuse: t
			.bool()
			.default(true)
			.title('Reuse Existing Table')
			.hint('Give the table that has this name instead of failing'),
	},
	output: tableInfo,
	async run({ input, dataTables }) {
		const { name } = input;
		if (input.reuse) {
			// The list matches part of a name without case, and a name is unique with case.
			const named = pagesOf(async (offset, room) => {
				const page = await dataTables.list({ name, offset, limit: room });
				return { count: page.count, entries: page.tables };
			}, undefined);
			for await (const found of named) if (found.name === name) return found;
		}
		return await dataTables.create({ name, columns: input.columns });
	},
});
