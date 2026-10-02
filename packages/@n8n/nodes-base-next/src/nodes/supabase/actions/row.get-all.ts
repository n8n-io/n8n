import { arr, obj, paginate, parse, str } from '@n8n/node-sdk';

import { limitOf, paging } from '../../paging';
import { filterQuery, rowFilter } from '../filter';
import { row as rowResource, schemaHeaders, tablePath } from '../supabase.node';
import { tableRow } from '../table-row';

/** The most rows the legacy node asks for in one request. */
const PAGE_SIZE = 1000;

/** A page with its headers: `content-range: 0-999/*` gives the offset of the next page. */
const rowPage = obj({
	body: arr(tableRow),
	headers: obj({ 'content-range': str().optional() }).with({ additionalProperties: true }),
}).with({ additionalProperties: true });

/** The offset after a full page. */
function nextOffset(range: string | undefined): string | undefined {
	const [, first, last] = /^(\d+)-(\d+)\//.exec(range ?? '') ?? [];
	if (first === undefined || last === undefined) return undefined;
	return Number(last) - Number(first) + 1 >= PAGE_SIZE ? String(Number(last) + 1) : undefined;
}

export const getManySupabaseRows = rowResource.action('getAll', {
	action: 'Get many rows',
	summary: 'List the rows of a table that match an optional filter.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		filter: rowFilter.optional(),
		order: str().hint('PostgREST order, e.g. created_at.desc').optional(),
		paging,
	},
	output: tableRow,
	async *run({ input, http }) {
		yield* paginate(http, {
			request: (offset, room) => ({
				path: tablePath(input.table),
				query: {
					...filterQuery(input.filter),
					limit: room === undefined ? undefined : Math.min(room, PAGE_SIZE),
					order: input.order,
					offset,
				},
				headers: { Prefer: 'return=representation', ...schemaHeaders(input.schema, false) },
				fullResponse: true,
			}),
			items: (response) => parse(rowPage, response).body,
			next: (response) => nextOffset(parse(rowPage, response).headers['content-range']),
			limit: limitOf(input.paging),
		});
	},
});
