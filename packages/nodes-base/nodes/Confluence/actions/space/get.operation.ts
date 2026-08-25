import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import { spaceRLC } from '../common';
import type { ConfluenceOperation } from '../router';

export const description: INodeProperties[] = [
	{
		...spaceRLC,
		required: true,
		description: 'The space to retrieve',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['get'],
			},
		},
	},
];

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

	return await confluenceApiRequest.call(
		this,
		'GET',
		`/wiki/api/v2/spaces/${encodeURIComponent(spaceId)}`,
	);
};
