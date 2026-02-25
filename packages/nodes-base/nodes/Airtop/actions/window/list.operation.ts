import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { validateAirtopApiResponse, validateSessionId } from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const sessionId = validateSessionId.call(this, index);

	const response = await apiRequest.call(this, 'GET', `/sessions/${sessionId}/windows`, undefined);

	validateAirtopApiResponse(this.getNode(), response);

	return this.helpers.returnJsonArray({ sessionId, ...response });
}
