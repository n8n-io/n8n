import { row, storedRow, toFilter, where } from '../data-table.node';

export const deleteRows = row.action('delete', {
	action: 'Delete rows',
	summary: 'Delete each row that matches the conditions. One item per deleted row.',
	flow: { effect: 'write', cardinality: '1:N' },
	imports: ['dataTables'],
	input: { where },
	output: storedRow,
	async *run({ input, dataTables }) {
		const table = await dataTables.open(input.table);
		yield* await table.delete(toFilter(input.where));
	},
});
