import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequest } from '../../transport';
import { spaceDescriptionFormatQs, spaceOptionsCollection, spaceRLC } from '../common';
import type { ConfluenceOperation } from '../router';

const properties: INodeProperties[] = [
	{
		...spaceRLC,
		required: true,
		description: 'The space to retrieve',
	},
	spaceOptionsCollection,
];

const displayOptions = {
	show: {
		resource: ['space'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const spaceId = String(
		this.getNodeParameter('space', itemIndex, '', { extractValue: true }) as string,
	).trim();
	if (spaceId === '') {
		throw new NodeOperationError(this.getNode(), "The 'Space' parameter is empty", { itemIndex });
	}

	const options = this.getNodeParameter('options', itemIndex, {});

	return await confluenceApiRequest.call(
		this,
		'GET',
		`/wiki/api/v2/spaces/${encodeURIComponent(spaceId)}`,
		{},
		spaceDescriptionFormatQs(options),
	);
};
