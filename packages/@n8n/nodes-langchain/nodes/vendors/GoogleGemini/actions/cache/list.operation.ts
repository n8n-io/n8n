import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
	},
	{
		displayName: 'Page Token',
		name: 'pageToken',
		type: 'string',
		default: '',
		description: 'Token for the page of results to retrieve',
	},
];

const displayOptions = {
	show: {
		operation: ['list'],
		resource: ['cache'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const pageSize = this.getNodeParameter('pageSize', i) as number;
	const pageToken = this.getNodeParameter('pageToken', i) as string;

	const qs: any = {
		pageSize,
	};
	if (pageToken) {
		qs.pageToken = pageToken;
	}

	const response = await apiRequest.call(this, 'GET', '/v1beta/cachedContents', {
		qs,
	});

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
