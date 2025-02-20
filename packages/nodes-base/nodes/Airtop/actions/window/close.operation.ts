import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { validateAirtopApiResponse, validateSessionAndWindowId } from '../../GenericFunctions';
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
				operation: ['close'],
			},
		},
		description: 'The ID of the window to close',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);

	const response = await apiRequest.call(
		this,
		'DELETE',
		`/sessions/${sessionId}/windows/${windowId}`,
	);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
