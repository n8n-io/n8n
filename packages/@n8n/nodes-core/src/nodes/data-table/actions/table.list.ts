import { t } from '@n8n/node-sdk';

import { direction, limit, pagesOf, table, tableInfo } from '../data-table.node';

export const listTables = table.action('list', {
	action: 'List tables',
	summary: 'List the data tables of the project, optionally by name. One item per table.',
	flow: { effect: 'read', cardinality: '1:N' },
	imports: ['dataTables'],
	input: {
		name: t
			.str()
			.optional()
			.title('Filter by Name')
			.hint('Tables whose name contains this text, case ignored'),
		sort: t
			.obj({ by: t.oneOf('name', 'createdAt', 'updatedAt').title('Sort Field'), direction })
			.title('Sort')
			.optional(),
		limit: limit.optional(),
	},
	output: tableInfo,
	async *run({ input, dataTables }) {
		const { name, sort } = input;
		yield* pagesOf(async (offset, room) => {
			const page = await dataTables.list({
				offset,
				limit: room,
				...(name === undefined ? {} : { name }),
				...(sort ? { sort } : {}),
			});
			return { count: page.count, entries: page.tables };
		}, input.limit);
	},
});
