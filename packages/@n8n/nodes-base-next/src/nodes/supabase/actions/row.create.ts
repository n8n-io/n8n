import { parse, t } from '@n8n/node-sdk';

import { row as rowResource, schemaHeaders, tablePath } from '../supabase.node';
import { tableRow } from '../table-row';

export const createSupabaseRow = rowResource.action('create', {
	action: 'Create a row',
	summary: 'Insert one row into a table, and return it as stored.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: { columns: tableRow },
	output: tableRow,
	async run({ input, http }) {
		const created = await http.request({
			method: 'POST',
			path: tablePath(input.table),
			body: [input.columns],
			headers: { Prefer: 'return=representation', ...schemaHeaders(input.schema, true) },
		});
		const [stored] = parse(t.arr(tableRow), created);
		if (!stored) throw new Error('Supabase returned no row');
		return stored;
	},
});
