import type {
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { validateAirtopApiResponse, validateSessionId, validateUrl } from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import type { IAirtopResponse } from '../../transport/response.type';

export const description: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		description: 'Initial URL to load in the window. Defaults to http://google.com.',
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Get Live View',
		name: 'getLiveView',
		type: 'boolean',
		default: false,
		description: "Whether to get the URL of the window's live view",
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['create'],
			},
		},
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
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Wait Until',
				name: 'waitUntil',
				type: 'options',
				description: 'Wait until the specified loading event occurs',
				default: 'load',
				options: [
					{
						name: 'Load',
						value: 'load',
						description: "Wait until the page dom and it's assets have loaded",
					},
					{
						name: 'DOM Content Loaded',
						value: 'domContentLoaded',
						description: 'Wait until the page DOM has loaded',
					},
					{
						name: 'Complete',
						value: 'complete',
						description: 'Wait until all iframes in the page have loaded',
					},
					{
						name: 'No Wait',
						value: 'noWait',
						description: 'Do not wait for any loading event and it will return immediately',
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
	const sessionId = validateSessionId.call(this, index);
	const url = validateUrl.call(this, index);
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const getLiveView = this.getNodeParameter('getLiveView', index, false);

	let response: IAirtopResponse;

	const body: IDataObject = {
		url,
		...additionalFields,
	};

	response = await apiRequest.call(this, 'POST', `/sessions/${sessionId}/windows`, body);

	if (!response?.data?.windowId) {
		throw new NodeApiError(this.getNode(), {
			message: 'Failed to create window',
			code: 500,
		});
	}

	const windowId = String(response.data.windowId);

	if (getLiveView) {
		response = await apiRequest.call(this, 'GET', `/sessions/${sessionId}/windows/${windowId}`);
	}

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
