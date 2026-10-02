import { arr, bool, json, nullable, obj, parse, str } from '@n8n/node-sdk';

import { NOTION_VERSION } from '../data-source';
import { dataSource } from '../notion.node';
import { SIMPLIFIED, simplifyProperty } from '../simplify';

/** The fields of a data source query response that the poll reads. */
const queryResponse = obj({
	results: arr(
		obj({ id: str(), created_time: str(), properties: json() }).with({
			additionalProperties: true,
		}),
	),
	has_more: bool().optional(),
	next_cursor: nullable(str()).optional(),
}).with({ additionalProperties: true });

/** A page as the legacy trigger emits it with `simple: true`: the ID and each property by name. */
const addedPage = obj({ id: str() }).with({
	additionalProperties: true,
	'x-n8n-hint': 'Keys are the Notion property names, with no property_ prefix',
	'x-n8n-value-types': SIMPLIFIED,
});

export const pageAdded = dataSource.trigger('pageAdded', {
	patch: 2,
	trigger: 'On page added to data source',
	summary: 'Starts when a page is added to a Notion data source.',
	scopes: ['content:read'],
	input: {},
	output: addedPage,
	poll: {
		request: ({ input, since, page, limit }) => ({
			method: 'POST',
			path: `/data_sources/${encodeURIComponent(input.dataSource)}/query`,
			headers: NOTION_VERSION,
			body: {
				page_size: limit ?? 100,
				sorts: [{ timestamp: 'created_time', direction: 'descending' }],
				...(since
					? { filter: { timestamp: 'created_time', created_time: { on_or_after: since } } }
					: {}),
				...(page ? { start_cursor: page } : {}),
			},
		}),
		items: (body) => parse(queryResponse, body).results,
		next: (body) => {
			const { has_more: hasMore, next_cursor: cursor } = parse(queryResponse, body);
			return hasMore === true && cursor ? cursor : undefined;
		},
		// Notion times have minute precision, so pages of the same minute are kept by ID.
		cursor: {
			timestamp: (page) => page.created_time,
			key: (page) => page.id,
			precision: 'minute',
		},
		// Like the legacy trigger: the first poll emits pages of the current minute.
		firstRun: 'emit',
		map: (page) => ({
			id: page.id,
			...Object.fromEntries(
				Object.entries(page.properties).map(([name, value]) => [name, simplifyProperty(value)]),
			),
		}),
	},
});
