import { cellsOf, row, storedRow, toFilter, values, where } from '../data-table.node';

export const updateRows = row.action('update', {
	action: 'Update rows',
	summary: 'Set the values on each row that matches the conditions. One item per changed row.',
	flow: { effect: 'write', cardinality: '1:N' },
	imports: ['dataTables'],
	input: { where, values: values.optional().hint('Omit to set the fields of the item') },
	output: storedRow,
	async *run({ input, item, dataTables }) {
		const table = await dataTables.open(input.table);
		yield* await table.update(toFilter(input.where), input.values ?? cellsOf(item));
	},
});
