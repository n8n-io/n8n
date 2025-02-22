import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { constructInteractionRequest } from './helpers';
import {
	validateRequiredStringField,
	validateSessionAndWindowId,
	validateAirtopApiResponse,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Element Description',
		name: 'elementDescription',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'the user profile image',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['hover'],
			},
		},
		description: 'The description of the element to hover over',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const elementDescription = validateRequiredStringField.call(
		this,
		index,
		'elementDescription',
		'Element Description',
	);

	const request = constructInteractionRequest.call(this, index, {
		elementDescription,
	});

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/hover`,
		request,
	);

	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
