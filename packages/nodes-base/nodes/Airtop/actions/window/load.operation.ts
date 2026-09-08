import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import {
	validateRequiredStringField,
	validateSessionAndWindowId,
	validateUrl,
	validateAirtopApiResponse,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { urlField } from '../common/fields';

export const description: INodeProperties[] = [
	{
		...urlField,
		required: true,
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['load'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['load'],
			},
		},
		options: [
			{
				displayName: 'Wait until',
				name: 'waitUntil',
				type: 'options',
				default: 'load',
				description: "Wait until the specified loading event occurs. Defaults to 'Fully loaded'.",
				options: [
					{
						name: 'Complete',
						value: 'complete',
						description: "Wait until the page and all it's iframes have loaded it's dom and assets",
					},
					{
						name: 'DOM only loaded',
						value: 'domContentLoaded',
						description: 'Wait until the dom has loaded',
					},
					{
						name: 'Fully loaded',
						value: 'load',
						description: "Wait until the page dom and it's assets have loaded",
					},
					{
						name: 'No wait',
						value: 'noWait',
						description: 'Do not wait for any loading event and will return immediately',
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
	let url = validateRequiredStringField.call(this, index, 'url', 'URL');
	url = validateUrl.call(this, index);
	const additionalFields = this.getNodeParameter('additionalFields', index);

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}`,
		{
			url,
			waitUntil: additionalFields.waitUntil,
		},
	);

	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
