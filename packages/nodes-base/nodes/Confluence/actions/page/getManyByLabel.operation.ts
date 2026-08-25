import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceBodyFormat } from '../common';
import {
	PAGE_LIMIT,
	bodyFormatOption,
	extractNextCursor,
	labelRLC,
	optionalSpaceRLC,
	parsePositiveInt,
	shapeBody,
} from '../common';
import type { ConfluenceOperation } from '../router';

const properties: INodeProperties[] = [
	{
		...labelRLC,
		description: 'The label whose pages to fetch',
	},
	{
		...optionalSpaceRLC,
		description:
			'Only returns pages in this space. Leave empty or pick "All Spaces" to return pages from all spaces.',
	},
	...returnAllOrLimit,
	bodyFormatOption,
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['getManyByLabel'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

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
	const limit = returnAll
		? Infinity
		: parsePositiveInt.call(
				this,
				this.getNodeParameter('limit', itemIndex, 100),
				'Limit',
				itemIndex,
			);

	const bodyFormat = this.getNodeParameter(
		'bodyFormat',
		itemIndex,
		'storage',
	) as ConfluenceBodyFormat;
	// No server-side plain-text format exists; it is derived from ADF in shapeBody
	const requestedFormat = bodyFormat === 'plainText' ? 'atlas_doc_format' : bodyFormat;

	const pages: IDataObject[] = [];
	let cursor: string | undefined;
	const seenCursors = new Set<string>();
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
