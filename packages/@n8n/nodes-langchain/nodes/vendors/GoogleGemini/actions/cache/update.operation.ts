import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Cached Content Name',
		name: 'cachedContentName',
		type: 'string',
		default: '',
		placeholder: 'cachedContents/1234567890',
		required: true,
		description: 'The resource name of the cached content to update',
	},
	{
		displayName: 'TTL (Seconds)',
		name: 'ttl',
		type: 'number',
		default: 300,
		description: 'New TTL for the cached content (updates expiration time)',
	},
];

const displayOptions = {
	show: {
		operation: ['update'],
		resource: ['cache'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('cachedContentName', i) as string;
	const ttlSeconds = this.getNodeParameter('ttl', i) as number;

	const body = {
		ttl: `${ttlSeconds}s`,
	};

	const response = await apiRequest.call(this, 'PATCH', `/v1beta/${name}`, {
		body,
		qs: {
			updateMask: 'ttl',
		},
	});

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
