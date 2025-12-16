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
import { elementDescriptionField } from '../common/fields';

export const description: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['type'],
			},
		},
		description: 'The text to type into the browser window',
		placeholder: 'e.g. email@example.com',
	},
	{
		displayName: 'Press Enter Key',
		name: 'pressEnterKey',
		type: 'boolean',
		default: false,
		description: 'Whether to press the Enter key after typing the text',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['type'],
			},
		},
	},
	{
		...elementDescriptionField,
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['type'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const text = validateRequiredStringField.call(this, index, 'text', 'Text');
	const pressEnterKey = this.getNodeParameter('pressEnterKey', index) as boolean;
	const elementDescription = this.getNodeParameter('elementDescription', index) as string;

	const request = constructInteractionRequest.call(this, index, {
		text,
		pressEnterKey,
		elementDescription,
	});

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/type`,
		request,
	);

	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
