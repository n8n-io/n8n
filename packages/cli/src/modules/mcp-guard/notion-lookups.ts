import { isRecord } from '@n8n/utils/is-record';

import { text, type Lookup } from './linear-lookups';

const MAX_SOURCES = 2;

/**
 * Real reads for the data sources that a Notion query names. The rows of a query do not carry the
 * title or the schema of their database, and the gym refuses a database without a title. The fetch
 * of the data source has both.
 */
export function notionLookups(tool: string, args: Record<string, unknown>): Lookup[] {
	if (tool !== 'notion-query-data-sources') return [];
	const data = isRecord(args.data) ? args.data : args;
	const urls = [
		data.data_source_url,
		...(Array.isArray(data.data_source_urls) ? data.data_source_urls : []),
	]
		.flatMap((u) => text(u) ?? [])
		.slice(0, MAX_SOURCES);
	return urls.map((id) => ({ tool: 'notion-fetch', args: { id } }));
}
