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
		...elementDescriptionField,
		placeholder: 'e.g. the green "save" button at the top of the page',
		required: true,
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['click'],
			},
		},
	},
	{
		displayName: 'Click Type',
		name: 'clickType',
		type: 'options',
		default: 'click',
		description: 'The type of click to perform. Defaults to left click.',
		options: [
			{
				name: 'Left Click',
				value: 'click',
			},
			{
				name: 'Double Click',
				value: 'doubleClick',
			},
			{
				name: 'Right Click',
				value: 'rightClick',
			},
		],
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['click'],
			},
		},
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

	const clickType = validateRequiredStringField.call(this, index, 'clickType', 'Click Type');

	const request = constructInteractionRequest.call(this, index, {
		elementDescription,
		configuration: {
			clickType,
		},
	});

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/click`,
		request,
	);

	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
