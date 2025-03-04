import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { executeRequestWithSessionManagement } from '../common/session.utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['getPaginated'],
			},
		},
		description: 'The prompt to extract data from the pages',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['getPaginated'],
			},
		},
		options: [
			{
				displayName: 'Output Schema',
				name: 'outputSchema',
				description: 'JSON schema defining the structure of the output',
				type: 'json',
				default: '{}',
			},
			{
				displayName: 'Interaction Mode',
				name: 'interactionMode',
				type: 'options',
				default: 'auto',
				options: [
					{
						name: 'Auto',
						value: 'auto',
					},
					{
						name: 'Accurate',
						value: 'accurate',
					},
					{
						name: 'Cost Efficient',
						value: 'cost-efficient',
					},
				],
			},
			{
				displayName: 'Pagination Mode',
				name: 'paginationMode',
				type: 'options',
				default: 'auto',
				options: [
					{
						name: 'Auto',
						value: 'auto',
					},
					{
						name: 'Paginated',
						value: 'paginated',
					},
					{
						name: 'Infinite Scroll',
						value: 'infinite-scroll',
					},
				],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const prompt = this.getNodeParameter('prompt', index, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', index);

	return await executeRequestWithSessionManagement.call(this, index, {
		method: 'POST',
		path: '/sessions/{sessionId}/windows/{windowId}/paginated-extraction',
		body: {
			prompt,
			configuration: {
				...additionalFields,
			},
		},
	});
}
