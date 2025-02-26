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
				operation: ['scrape'],
			},
		},
		description: 'The ID of the session to use for the scraping',
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
				operation: ['scrape'],
			},
		},
		description: 'The ID of the window to use for the scraping',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/scrape-content`,
		{},
	);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, windowId, ...response });
}
