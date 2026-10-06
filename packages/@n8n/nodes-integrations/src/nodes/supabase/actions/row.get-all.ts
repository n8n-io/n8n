import { t } from '@n8n/node-sdk';

import { filterQuery, rowFilter } from '../filter';
import { row as rowResource, schemaHeaders } from '../supabase.node';
import { tableRow } from '../table-row';

export const getManySupabaseRows = rowResource.action('getAll', {
	action: 'Get many rows',
	summary: 'List the rows of a table that match an optional filter.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		filter: rowFilter.optional(),
		order: t.str().hint('PostgREST order, e.g. created_at.desc').optional(),
	},
	output: tableRow,
	list: {
		path: '/{table}',
		query: (input) => ({ ...filterQuery(input.filter), order: input.order }),
		headers: (input) => ({
			Prefer: 'return=representation',
			...schemaHeaders(input.schema, false),
		}),
		response: t.arr(tableRow),
		items: (page) => page,
		// 1000 is the most rows the legacy node asks for in one request.
		pages: {
			style: 'offset',
			unit: 'item',
			send: { query: 'offset' },
			size: { query: 'limit', max: 1000 },
		},
	},
});
