import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { validateSessionAndWindowId, validateAirtopApiResponse } from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Window ID',
		name: 'windowId',
		type: 'string',
		required: true,
		default: '={{ $json["windowId"] }}',
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['query'],
			},
		},
	},
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
				resource: ['window'],
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
				resource: ['window'],
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
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const prompt = this.getNodeParameter('prompt', index, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', index);

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/page-query`,
		{
			prompt,
			configuration: {
				...additionalFields,
			},
		},
	);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
