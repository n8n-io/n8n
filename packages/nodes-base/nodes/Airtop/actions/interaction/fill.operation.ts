import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	NodeApiError,
} from 'n8n-workflow';

import { ERROR_MESSAGES, OPERATION_TIMEOUT } from '../../constants';
import {
	validateRequiredStringField,
	validateSessionAndWindowId,
	validateAirtopApiResponse,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import type { IAirtopResponse } from '../../transport/types';

export const description: INodeProperties[] = [
	{
		displayName: 'Form Data',
		name: 'formData',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['fill'],
			},
		},
		description: 'The information to fill into the form written in natural language',
		placeholder: 'e.g. "Name: John Doe, Email: john.doe@example.com"',
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	timeout = OPERATION_TIMEOUT,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const formData = validateRequiredStringField.call(this, index, 'formData', 'Form Data');

	// run automation
	const asyncAutomationResponse = await apiRequest.call(
		this,
		'POST',
		`/async/sessions/${sessionId}/windows/${windowId}/execute-automation`,
		{
			automationId: 'auto',
			parameters: {
				customData: formData,
			},
		},
	);

	const reqId = asyncAutomationResponse.requestId as string;

	// Poll status every second until it's completed or timeout is reached
	const startTime = Date.now();
	let automationStatusResponse: IAirtopResponse;

	while (true) {
		automationStatusResponse = await apiRequest.call(this, 'GET', `/requests/${reqId}/status`);
		const status = automationStatusResponse?.status ?? '';

		validateAirtopApiResponse(this.getNode(), automationStatusResponse);

		if (status === 'completed' || status === 'error') {
			break;
		}

		const elapsedTime = Date.now() - startTime;
		if (elapsedTime >= timeout) {
			throw new NodeApiError(this.getNode(), {
				message: ERROR_MESSAGES.TIMEOUT_REACHED,
				code: 500,
			});
		}

		// Wait one second
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	return this.helpers.returnJsonArray({ sessionId, windowId, ...automationStatusResponse });
}
