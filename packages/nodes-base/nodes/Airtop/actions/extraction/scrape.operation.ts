import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { executeRequestWithSessionManagement } from '../common/session.utils';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	return await executeRequestWithSessionManagement.call(this, index, {
		method: 'POST',
		path: '/sessions/{sessionId}/windows/{windowId}/scrape-content',
		body: {},
	});
}
