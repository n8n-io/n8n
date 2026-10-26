import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import type { ConfluenceBodyFormat } from '../common';
import {
	bodyFormatOption,
	fetchPaginatedResults,
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

	const qs: IDataObject = { 'body-format': requestedFormat };
	if (spaceId !== '') qs['space-id'] = spaceId;

	const pages = await fetchPaginatedResults.call(
		this,
		`/wiki/api/v2/labels/${encodeURIComponent(labelId)}/pages`,
		limit,
		qs,
	);

	return pages.map((page) => shapeBody(page, bodyFormat));
};
