import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceBodyFormat } from '../common';
import {
	PAGE_LIMIT,
	bodyFormatOption,
	extractNextCursor,
	labelRLC,
	optionalSpaceRLC,
	shapeBody,
} from '../common';
import type { ConfluenceOperation } from '../router';

const showOnGetManyByLabel = { resource: ['page'], operation: ['getManyByLabel'] };

export const description: INodeProperties[] = [
	{
		...labelRLC,
		description: 'The label whose pages to fetch',
		displayOptions: { show: showOnGetManyByLabel },
	},
	{
		...optionalSpaceRLC,
		description:
			'Only returns pages in this space. Leave empty or pick "All Spaces" to return pages from all spaces.',
		displayOptions: { show: showOnGetManyByLabel },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: showOnGetManyByLabel },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		displayOptions: { show: { ...showOnGetManyByLabel, returnAll: [false] } },
	},
	{
		...bodyFormatOption,
		displayOptions: { show: showOnGetManyByLabel },
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const labelId = String(
		this.getNodeParameter('label', itemIndex, '', { extractValue: true }) as string,
	).trim();
	if (labelId === '') {
		throw new NodeOperationError(this.getNode(), "The 'Label' parameter is empty", { itemIndex });
	}

	const spaceId = String(
		this.getNodeParameter('space', itemIndex, '', { extractValue: true }) as string,
	).trim();

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

	const bodyFormat = this.getNodeParameter(
		'bodyFormat',
		itemIndex,
		'storage',
	) as ConfluenceBodyFormat;
	// No server-side plain-text format exists; it is derived from ADF in shapeBody
	const requestedFormat = bodyFormat === 'plainText' ? 'atlas_doc_format' : bodyFormat;

	const pages: IDataObject[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;
	do {
		const qs: IDataObject = {
			'body-format': requestedFormat,
			limit: Math.min(limit - pages.length, PAGE_LIMIT),
		};
		if (spaceId !== '') qs['space-id'] = spaceId;
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(
			this,
			'GET',
			`/wiki/api/v2/labels/${encodeURIComponent(labelId)}/pages`,
			{},
			qs,
		);
		const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		pages.push.apply(pages, results);

		const next = extractNextCursor(response);
		// A next link revisiting any earlier page would loop forever under Return All
		if (next === undefined || seenCursors.has(next)) break;
		seenCursors.add(next);
		cursor = next;
	} while (pages.length < limit);

	return pages.slice(0, limit).map((page) => shapeBody(page, bodyFormat));
};
