import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import type { ConfluenceBodyFormat } from '../common';
import {
	bodyFormatOption,
	fetchPaginatedResults,
	optionalSpaceRLC,
	pageRLC,
	parsePositiveInt,
	resolvePageId,
	shapeBody,
	sortDirectionOption,
	sortQs,
} from '../common';
import type { ConfluenceOperation } from '../router';

const properties: INodeProperties[] = [
	optionalSpaceRLC,
	{
		...pageRLC,
		description: 'The page whose footer comments to fetch',
	},
	...returnAllOrLimit,
	{
		...bodyFormatOption,
		description: 'The representation to return the comment bodies in',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'created-date',
				description: 'The field to order the comments by',
				options: [
					{ name: 'Created Date', value: 'created-date' },
					{ name: 'Modified Date', value: 'modified-date' },
				],
			},
			sortDirectionOption,
		],
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['getComments'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const options = this.getNodeParameter('options', itemIndex, {});
	const rawBodyFormat = this.getNodeParameter('bodyFormat', itemIndex, 'storage');
	const bodyFormat: ConfluenceBodyFormat =
		rawBodyFormat === 'atlas_doc_format' || rawBodyFormat === 'plainText'
			? rawBodyFormat
			: 'storage';
	// No server-side plain-text format exists; it is derived from ADF in shapeBody
	const requestedFormat = bodyFormat === 'plainText' ? 'atlas_doc_format' : bodyFormat;

	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	const total = returnAll
		? Infinity
		: parsePositiveInt.call(
				this,
				this.getNodeParameter('limit', itemIndex, 50),
				'Limit',
				itemIndex,
			);

	const pageId = await resolvePageId.call(this, itemIndex);

	const qs: IDataObject = { 'body-format': requestedFormat, ...sortQs(options) };

	const comments = await fetchPaginatedResults.call(
		this,
		`/wiki/api/v2/pages/${encodeURIComponent(pageId)}/footer-comments`,
		total,
		qs,
	);
	return comments.map((comment) => shapeBody(comment, bodyFormat));
};
