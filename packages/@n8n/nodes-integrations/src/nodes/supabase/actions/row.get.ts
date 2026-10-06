import { parse, t, UserError } from '@n8n/node-sdk';

import { quoted, scalar } from '../filter';
import { row as rowResource, schemaHeaders, tablePath } from '../supabase.node';
import { tableRow } from '../table-row';

export const getSupabaseRows = rowResource.action('get', {
	action: 'Get rows by key',
	summary: 'Get the rows whose columns equal the given values, e.g. { id: 3 }.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		where: t
			.record(scalar)
			.title('Select Conditions')
			.hint('Column = value pairs; a row must match every pair'),
	},
	output: tableRow,
	async *run({ input, http }) {
		if (Object.keys(input.where).length === 0)
			throw new UserError('Set at least one column in where');
		const rows = await http.request({
			path: tablePath(input.table),
			query: Object.fromEntries(
				Object.entries(input.where).map(([column, value]) => [quoted(column), `eq.${value}`]),
			),
			headers: { Prefer: 'return=representation', ...schemaHeaders(input.schema, false) },
		});
		yield* parse(t.arr(tableRow), rows);
	},
});
