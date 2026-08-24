import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import { PAGE_LIMIT, extractNextCursor } from '../common';
import type { ConfluenceOperation } from '../router';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	let limit = Infinity;
	if (!returnAll) {
		const rawLimit = this.getNodeParameter('limit', itemIndex, 50);
		if (!Number.isFinite(rawLimit) || rawLimit < 1) {
			throw new NodeOperationError(this.getNode(), 'Limit must be a number of at least 1', {
				itemIndex,
			});
		}
		limit = Math.floor(rawLimit);
	}

	const spaces: IDataObject[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;
	do {
		const qs: IDataObject = { limit: Math.min(limit - spaces.length, PAGE_LIMIT) };
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/spaces', {}, qs);
		const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		spaces.push(...results);

		// A repeated cursor would refetch the same page forever; treat it as the end
		const next = extractNextCursor(response);
		cursor = next === undefined || seenCursors.has(next) ? undefined : next;
		if (cursor !== undefined) seenCursors.add(cursor);
	} while (cursor !== undefined && spaces.length < limit);

	// The API treats `limit` as a page size, so an overshooting last page is trimmed
	return spaces.slice(0, returnAll ? spaces.length : limit);
};
