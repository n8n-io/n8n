import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { validateSessionAndWindowId, validateAirtopApiResponse } from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		default: '={{ $json["sessionId"] }}',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['getPaginated'],
			},
		},
		description: 'The ID of the session to use for the extraction',
	},
	{
		displayName: 'Window ID',
		name: 'windowId',
		type: 'string',
		required: true,
		default: '={{ $json["windowId"] }}',
		displayOptions: {
			show: {
				resource: ['extraction'],
				operation: ['getPaginated'],
			},
		},
		description: 'The ID of the window to use for the extraction',
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
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const prompt = this.getNodeParameter('prompt', index, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', index);

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/paginated-extraction`,
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
