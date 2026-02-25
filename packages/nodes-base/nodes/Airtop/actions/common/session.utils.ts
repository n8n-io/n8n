import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import {
	validateSessionAndWindowId,
	createSessionAndWindow,
	shouldCreateNewSession,
	validateAirtopApiResponse,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import type { IAirtopResponse } from '../../transport/types';

/**
 * Execute the node operation. Creates and terminates a new session if needed.
 * @param this - The execution context
 * @param index - The index of the node
 * @param request - The request to execute
 * @returns The response from the request
 */
export async function executeRequestWithSessionManagement(
	this: IExecuteFunctions,
	index: number,
	request: {
		method: 'POST' | 'DELETE';
		path: string;
		body: IDataObject;
	},
): Promise<IAirtopResponse> {
	let airtopSessionId = '';
	try {
		const { sessionId, windowId } = shouldCreateNewSession.call(this, index)
			? await createSessionAndWindow.call(this, index)
			: validateSessionAndWindowId.call(this, index);
		airtopSessionId = sessionId;

		const shouldTerminateSession = this.getNodeParameter('autoTerminateSession', index, false);

		const endpoint = request.path.replace('{sessionId}', sessionId).replace('{windowId}', windowId);
		const response = await apiRequest.call(this, request.method, endpoint, request.body);

		validateAirtopApiResponse(this.getNode(), response);

		if (shouldTerminateSession) {
			await apiRequest.call(this, 'DELETE', `/sessions/${sessionId}`);
			this.logger.info(`[${this.getNode().name}] Session terminated.`);
			return response;
		}

		return { sessionId, windowId, ...response };
	} catch (error) {
		// terminate session on error
		if (airtopSessionId) {
			await apiRequest.call(this, 'DELETE', `/sessions/${airtopSessionId}`);
			this.logger.info(`[${this.getNode().name}] Session terminated.`);
		}
		throw error;
	}
}
