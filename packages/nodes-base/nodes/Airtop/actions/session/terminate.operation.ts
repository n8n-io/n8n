import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { validateAirtopApiResponse } from '../../GenericFunctions';
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
				resource: ['session'],
				operation: ['terminate'],
			},
		},
		description: 'The ID of the session to terminate',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = this.getNodeParameter('sessionId', index) as string;

	// validate sessionId
	if ((sessionId || '').trim() === '') {
		throw new NodeOperationError(this.getNode(), "Please fill the 'Session ID' parameter", {
			itemIndex: index,
		});
	}

	const response = await apiRequest.call(this, 'DELETE', `/sessions/${sessionId}`);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ success: true } as IDataObject);
}
