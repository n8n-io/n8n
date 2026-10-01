import { definePollingTrigger, isRecord, list, obj, str } from '@n8n/node-sdk';

import { notion, notionIdOf, NOTION_VERSION, SIMPLIFIED, simplifyProperty } from './node';

interface NotionPage {
	readonly id: string;
	readonly created_time: string;
	readonly properties: Record<string, unknown>;
}

const pagesOf = (body: unknown): NotionPage[] =>
	list(isRecord(body) ? body.results : undefined).flatMap((page) =>
		isRecord(page) && typeof page.id === 'string' && typeof page.created_time === 'string'
			? [
					{
						id: page.id,
						created_time: page.created_time,
						properties: isRecord(page.properties) ? page.properties : {},
					},
				]
			: [],
	);

/** A page as the legacy trigger emits it with `simple: true`: the ID and each property by name. */
const addedPage = obj({ id: str() }).with({
	additionalProperties: true,
	'x-n8n-hint': 'Keys are the Notion property names, with no property_ prefix',
	'x-n8n-value-types': SIMPLIFIED,
});

export const databasePageAdded = definePollingTrigger({
	node: notion,
	id: 'notion.databasePage.added',
	trigger: 'On page added to database',
	summary: 'Starts when a page is added to a Notion data source.',
	input: { dataSource: str().hint('Notion data source ID or URL') },
	output: addedPage,
	poll: {
		request: ({ input, since, page }) => ({
			method: 'POST',
			path: `/data_sources/${notionIdOf(input.dataSource)}/query`,
			headers: NOTION_VERSION,
			body: {
				page_size: 100,
				sorts: [{ timestamp: 'created_time', direction: 'descending' }],
				...(since
					? { filter: { timestamp: 'created_time', created_time: { on_or_after: since } } }
					: {}),
				...(page ? { start_cursor: page } : {}),
			},
		}),
		items: pagesOf,
		next: (body) =>
			isRecord(body) && body.has_more === true && typeof body.next_cursor === 'string'
				? body.next_cursor
				: undefined,
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
