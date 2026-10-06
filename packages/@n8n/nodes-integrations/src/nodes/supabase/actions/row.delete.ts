import { parse, t } from '@n8n/node-sdk';

import { filterQuery, rowFilter } from '../filter';
import { row as rowResource, schemaHeaders, tablePath } from '../supabase.node';
import { tableRow } from '../table-row';

export const deleteSupabaseRows = rowResource.action('delete', {
	action: 'Delete rows',
	summary: 'Delete the rows of a table that match the filter, and return the deleted rows.',
	flow: { effect: 'write', cardinality: '1:N', idempotent: true },
	input: { filter: rowFilter },
	output: tableRow,
	async *run({ input, http }) {
		const deleted = await http.request({
			method: 'DELETE',
			path: tablePath(input.table),
			query: filterQuery(input.filter),
			headers: { Prefer: 'return=representation', ...schemaHeaders(input.schema, true) },
		});
		yield* parse(t.arr(tableRow), deleted);
	},
});
