import { parse, t } from '@n8n/node-sdk';

import { filterQuery, rowFilter } from '../filter';
import { row as rowResource, schemaHeaders, tablePath } from '../supabase.node';
import { tableRow } from '../table-row';

export const updateSupabaseRows = rowResource.action('update', {
	action: 'Update rows',
	summary: 'Set columns on the rows of a table that match the filter, and return the updated rows.',
	flow: { effect: 'write', cardinality: '1:N', idempotent: true },
	input: { filter: rowFilter, columns: tableRow.title('Fields to Send') },
	output: tableRow,
	async *run({ input, http }) {
		const updated = await http.request({
			method: 'PATCH',
			path: tablePath(input.table),
			query: filterQuery(input.filter),
			body: input.columns,
			headers: { Prefer: 'return=representation', ...schemaHeaders(input.schema, true) },
		});
		yield* parse(t.arr(tableRow), updated);
	},
});
