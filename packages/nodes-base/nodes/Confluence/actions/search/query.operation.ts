import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceOperation } from '../router';

const SEARCH_PAGE_SIZE = 50;
// Search post-filters results by permission, so a page can legitimately come
// back empty mid-stream — but an endless run of them means the walk is stuck
const MAX_CONSECUTIVE_EMPTY_PAGES = 5;

const properties: INodeProperties[] = [
	{
		displayName: 'Query (CQL)',
		name: 'cql',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		placeholder: 'e.g. type = page AND space = "DOCS" AND text ~ "roadmap"',
		description:
			'The CQL query to run. See <a href="https://developer.atlassian.com/cloud/confluence/advanced-searching-using-cql/" target="_blank">Atlassian\'s CQL reference</a> for the syntax.',
	},
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Additional Expand Fields',
				name: 'additionalExpandFields',
				type: 'string',
				default: '',
				placeholder: 'e.g. content.version,content.metadata.labels',
				description: 'Comma-separated list of extra fields to expand on each search result',
			},
			{
				displayName: 'Content Status',
				name: 'contentStatuses',
				type: 'multiOptions',
				default: [],
				description: 'Only match content in these statuses',
				options: [
					{ name: 'Archived', value: 'archived' },
					{ name: 'Current', value: 'current' },
					{ name: 'Draft', value: 'draft' },
				],
			},
			{
				displayName: 'Fetch Full Page Content',
				name: 'fetchFullPageContent',
				type: 'boolean',
				default: false,
				description:
					'Whether each result carries its full storage-format body (content.body.storage), fetched on the same request',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['query'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

interface SearchOptions {
	additionalExpandFields?: string;
	contentStatuses?: string[];
	fetchFullPageContent?: boolean;
}

function buildExpand(options: SearchOptions): string {
	const fields = (options.additionalExpandFields ?? '')
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field !== '');
	if (options.fetchFullPageContent === true) fields.unshift('content.body.storage');
	return [...new Set(fields)].join(',');
}

type NextPageParam = { key: 'cursor' | 'start'; value: string };

/**
 * The v1 search API pages via `_links.next`; the link is only used as a
 * parameter source (cursor, or start on older responses), never re-issued
 * verbatim — the follow-up request repeats the known qs plus that parameter.
 */
function nextPageParam(response: IDataObject): NextPageParam | undefined {
	const next = (response._links as IDataObject | undefined)?.next;
	if (typeof next !== 'string' || next === '') return undefined;

	let params: URLSearchParams;
	try {
		params = new URL(next, 'https://api.atlassian.com').searchParams;
	} catch {
		return undefined;
	}
	const cursor = params.get('cursor');
	if (cursor !== null && cursor !== '') return { key: 'cursor', value: cursor };
	const start = params.get('start');
	return start === null || start === '' ? undefined : { key: 'start', value: start };
}

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const cql = String(this.getNodeParameter('cql', itemIndex, '')).trim();
	if (cql === '') {
		throw new NodeOperationError(this.getNode(), 'The CQL query must not be empty', { itemIndex });
	}

	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	let limit = Infinity;
	if (!returnAll) {
		// Number() because an expression can hand back a numeric string
		const rawLimit = Number(this.getNodeParameter('limit', itemIndex, 100));
		if (!Number.isFinite(rawLimit) || rawLimit < 1) {
			throw new NodeOperationError(this.getNode(), 'Limit must be a number of at least 1', {
				itemIndex,
			});
		}
		limit = Math.floor(rawLimit);
	}

	const options = this.getNodeParameter('options', itemIndex, {}) as SearchOptions;

	const qs: IDataObject = { cql };
	const expand = buildExpand(options);
	if (expand !== '') qs.expand = expand;
	if (options.contentStatuses !== undefined && options.contentStatuses.length > 0) {
		qs.cqlcontext = JSON.stringify({ contentStatuses: options.contentStatuses });
	}

	const results: IDataObject[] = [];
	let pageParam: NextPageParam | undefined;
	let emptyPages = 0;
	for (;;) {
		const pageQs: IDataObject = {
			...qs,
			limit: Math.min(limit - results.length, SEARCH_PAGE_SIZE),
		};
		if (pageParam !== undefined) pageQs[pageParam.key] = pageParam.value;

		const response = await confluenceApiRequest.call(
			this,
			'GET',
			'/wiki/rest/api/search',
			{},
			pageQs,
		);
		const entries = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		results.push.apply(results, entries);
		if (results.length >= limit) break;

		emptyPages = entries.length === 0 ? emptyPages + 1 : 0;
		if (emptyPages >= MAX_CONSECUTIVE_EMPTY_PAGES) break;

		const next = nextPageParam(response);
		// A page can come back empty while next is still set; never repeat the
		// same cursor/offset
		const repeats =
			pageParam !== undefined &&
			next !== undefined &&
			next.key === pageParam.key &&
			next.value === pageParam.value;
		if (next === undefined || repeats) break;
		pageParam = next;
	}

	return returnAll ? results : results.slice(0, limit);
};
