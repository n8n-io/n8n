import { UserError } from '@n8n/node-sdk';
import {
	limit,
	pagesOf,
	row,
	ROW_COLUMNS,
	rowFromColumns,
	sort,
	storedRow,
	SYSTEM_COLUMNS,
	toFilter,
	where,
} from '../data-table.node';

export const getRows = row.action('get', {
	action: 'Get rows',
	summary: 'Get the rows that match the conditions, or every row. One item per row.',
	flow: { effect: 'read', cardinality: '1:N' },
	imports: ['dataTables'],
	input: {
		where: where.optional().hint('Omit for every row'),
		sort: sort.optional(),
		limit: limit.optional(),
	},
	output: storedRow,
	resourceOutput: { method: ROW_COLUMNS, toOutput: rowFromColumns },
	async *run({ input, dataTables }) {
		const table = await dataTables.open(input.table);
		const { sort: order } = input;
		if (order && !SYSTEM_COLUMNS.includes(order.column)) {
			const known = await table.columns();
			if (!known.some(({ name }) => name === order.column)) {
				throw new UserError(`The data table has no column "${order.column}" to sort by`);
			}
		}
		const filter = input.where && toFilter(input.where);
		yield* pagesOf(async (offset, room) => {
			const page = await table.rows({
				offset,
				limit: room,
				...(filter ? { filter } : {}),
				...(order ? { sort: order } : {}),
			});
			return { count: page.count, entries: page.rows };
		}, input.limit);
	},
});
