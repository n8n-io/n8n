import { cellsOf, row, storedRow, toFilter, values, where } from '../data-table.node';

export const upsertRows = row.action('upsert', {
	action: 'Upsert rows',
	summary: 'Update the rows that match the conditions, or insert one row when none matches.',
	flow: { effect: 'write', cardinality: '1:N' },
	imports: ['dataTables'],
	input: { where, values: values.optional().hint('Omit to set the fields of the item') },
	output: storedRow,
	async *run({ input, item, dataTables }) {
		const table = await dataTables.open(input.table);
		yield* await table.upsert(toFilter(input.where), input.values ?? cellsOf(item));
	},
});
