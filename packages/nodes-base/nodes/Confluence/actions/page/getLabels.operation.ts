import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import { PAGE_LIMIT, extractNextCursor, optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnGetLabels = { resource: ['page'], operation: ['getLabels'] };

export const description: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		displayOptions: { show: showOnGetLabels },
	},
	{
		...pageRLC,
		description: 'The page whose labels to list',
		displayOptions: { show: showOnGetLabels },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnGetLabels },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { ...showOnGetLabels, returnAll: [false] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnGetLabels },
		options: [
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'multiOptions',
				default: [],
				description: 'Filter the results to labels with these prefixes',
				options: [
					{ name: 'Global', value: 'global' },
					{ name: 'My', value: 'my' },
					{ name: 'System', value: 'system' },
					{ name: 'Team', value: 'team' },
				],
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: 'name',
				description: 'The order to return the labels in',
				options: [
					{ name: 'Created Date (Ascending)', value: 'created-date' },
					{ name: 'Created Date (Descending)', value: '-created-date' },
					{ name: 'ID (Ascending)', value: 'id' },
					{ name: 'ID (Descending)', value: '-id' },
					{ name: 'Name (Ascending)', value: 'name' },
					{ name: 'Name (Descending)', value: '-name' },
				],
			},
		],
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	let total = Number.POSITIVE_INFINITY;
	if (!returnAll) {
		const rawLimit = Number(this.getNodeParameter('limit', itemIndex, 50));
		if (!Number.isFinite(rawLimit) || rawLimit < 1) {
			throw new NodeOperationError(this.getNode(), 'Limit must be a number of at least 1', {
				itemIndex,
			});
		}
		total = Math.floor(rawLimit);
	}
	const options = this.getNodeParameter('options', itemIndex, {});

	// An expression can deliver a bare string where multiOptions gives an array
	const rawPrefix = options.prefix;
	const prefixes: string[] = [];
	for (const value of Array.isArray(rawPrefix) ? rawPrefix : [rawPrefix]) {
		if (typeof value === 'string' && value !== '') prefixes.push(value);
	}

	const pageId = await resolvePageId.call(this, itemIndex);
	const endpoint = `/wiki/api/v2/pages/${encodeURIComponent(pageId)}/labels`;

	const labels: IDataObject[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;

	while (labels.length < total) {
		const qs: IDataObject = { limit: Math.min(total - labels.length, PAGE_LIMIT) };
		if (prefixes.length > 0) qs.prefix = prefixes.join(',');
		if (typeof options.sort === 'string' && options.sort !== '') qs.sort = options.sort;
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(this, 'GET', endpoint, {}, qs);
		const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		for (const label of results) labels.push(label);

		const next = extractNextCursor(response);
		// Any cursor cycle would append 250 labels per iteration forever under Return All
		if (next === undefined || seenCursors.has(next)) break;
		seenCursors.add(next);
		cursor = next;
	}

	return labels.slice(0, total);
};
