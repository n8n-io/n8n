import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { validateAirtopApiResponse, validateSessionId } from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { sessionIdField } from '../common/fields';

export const description: INodeProperties[] = [
	{
		...sessionIdField,
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['terminate'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = validateSessionId.call(this, index);
	const response = await apiRequest.call(this, 'DELETE', `/sessions/${sessionId}`);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ success: true } as IDataObject);
}
