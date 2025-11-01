import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { validateAirtopApiResponse, validateSessionAndWindowId } from '../../GenericFunctions';
import { apiRequest } from '../../transport';

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
