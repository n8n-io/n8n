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
		placeholder: 'Is there a login modal on this page?',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['query'],
			},
		},
		description: 'The prompt to query the page content',
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
				operation: ['query'],
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
		path: '/sessions/{sessionId}/windows/{windowId}/page-query',
		body: {
			prompt,
			configuration: {
				...additionalFields,
			},
		},
	});
}
