import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import { Notion } from 'n8n-nodes-base/dist/nodes/Notion/Notion.node';

import { getManyDatabasePages } from '../../nodes/notion/actions/database-page.get-all';
import { describeFixtureParity, type AllowedDifference } from './harness';

const DATA_SOURCE = '2a3b4c5d6e7f40818293a4b5c6d7e8f9';
const QUERY = `https://api.notion.com/v1/data_sources/${DATA_SOURCE}/query`;

const ALLOWED: readonly AllowedDifference[] = [
	{
		path: `requests.GET https://api.notion.com/v1/databases/${DATA_SOURCE} #0`,
		kind: 'intended',
		reason: 'The action also takes a database ID and resolves it to its first data source.',
	},
	...[0, 1].map(
		(index): AllowedDifference => ({
			path: `requests.POST ${QUERY} #${index}.body.filter.and[2].date.on_or_after`,
			kind: 'intended',
			reason:
				'The action sends the ISO date as given; the legacy node converts it to a UTC time in the workflow timezone.',
		}),
	),
	{
		path: `requests.POST ${QUERY} #1.body.page_size`,
		kind: 'intended',
		reason:
			'The action asks the next page only for the pages the limit still needs; the legacy node repeats the first page size.',
	},
	...[0, 1, 2].map(
		(index): AllowedDifference => ({
			path: `items[${index}].json.property_notes`,
			kind: 'intended',
			reason:
				'The action keeps plain_text of mention and equation rich text; the legacy node drops it.',
		}),
	),
];

describeFixtureParity(getManyDatabasePages, {
	nodeType: new Notion(),
	credential: { data: { apiKey: 'secret_parity' }, types: [new NotionApi()] },
	cases: { 'filters, sort and limit over two pages': { allowed: ALLOWED } },
});
