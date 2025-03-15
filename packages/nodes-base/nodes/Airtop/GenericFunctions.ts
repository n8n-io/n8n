import { NodeApiError, type IExecuteFunctions, type INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SESSION_MODE } from './actions/common/fields';
import {
	ERROR_MESSAGES,
	DEFAULT_TIMEOUT_MINUTES,
	MIN_TIMEOUT_MINUTES,
	MAX_TIMEOUT_MINUTES,
	INTEGRATION_URL,
} from './constants';
import { apiRequest } from './transport';
import type { IAirtopResponse } from './transport/types';

/**
 * Validate a required string field
 * @param this - The execution context
 * @param index - The index of the node
 * @param field - The field to validate
 * @param fieldName - The name of the field
 */
export function validateRequiredStringField(
	this: IExecuteFunctions,
	index: number,
	field: string,
	fieldName: string,
) {
	let value = this.getNodeParameter(field, index) as string;
	value = (value || '').trim();
	const errorMessage = ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', fieldName);

	if (!value) {
		throw new NodeOperationError(this.getNode(), errorMessage, {
			itemIndex: index,
		});
	}

	return value;
}

/**
 * Validate the session ID parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated session ID
 */
export function validateSessionId(this: IExecuteFunctions, index: number) {
	let sessionId = this.getNodeParameter('sessionId', index, '') as string;
	sessionId = (sessionId || '').trim();

	if (!sessionId) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.SESSION_ID_REQUIRED, {
			itemIndex: index,
		});
	}

	return sessionId;
}

/**
 * Validate the session ID and window ID parameters
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated session ID and window ID parameters
 */
export function validateSessionAndWindowId(this: IExecuteFunctions, index: number) {
	let sessionId = this.getNodeParameter('sessionId', index, '') as string;
	let windowId = this.getNodeParameter('windowId', index, '') as string;
	sessionId = (sessionId || '').trim();
	windowId = (windowId || '').trim();

	if (!sessionId) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.SESSION_ID_REQUIRED, {
			itemIndex: index,
		});
	}

	if (!windowId) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.WINDOW_ID_REQUIRED, {
			itemIndex: index,
		});
	}

	return {
		sessionId,
		windowId,
	};
}

/**
 * Validate the profile name parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated profile name
 */
export function validateProfileName(this: IExecuteFunctions, index: number) {
	let profileName = this.getNodeParameter('profileName', index) as string;
	profileName = (profileName || '').trim();

	if (!profileName) {
		return profileName;
	}

	if (!/^[a-zA-Z0-9-]+$/.test(profileName)) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.PROFILE_NAME_INVALID, {
			itemIndex: index,
		});
	}

	return profileName;
}

/**
 * Validate the timeout minutes parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated timeout minutes
 */
export function validateTimeoutMinutes(this: IExecuteFunctions, index: number) {
	const timeoutMinutes = this.getNodeParameter(
		'timeoutMinutes',
		index,
		DEFAULT_TIMEOUT_MINUTES,
	) as number;

	if (timeoutMinutes < MIN_TIMEOUT_MINUTES || timeoutMinutes > MAX_TIMEOUT_MINUTES) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.TIMEOUT_MINUTES_INVALID, {
			itemIndex: index,
		});
	}

	return timeoutMinutes;
}

/**
 * Validate the URL parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated URL
 */
export function validateUrl(this: IExecuteFunctions, index: number) {
	let url = this.getNodeParameter('url', index) as string;
	url = (url || '').trim();

	if (!url) {
		return '';
	}

	if (!url.startsWith('http')) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.URL_INVALID, {
			itemIndex: index,
		});
	}

	return url;
}

/**
 * Validate the Proxy URL parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @param proxy - The value of the Proxy parameter
 * @returns The validated proxy URL
 */
export function validateProxyUrl(this: IExecuteFunctions, index: number, proxy: string) {
	let proxyUrl = this.getNodeParameter('proxyUrl', index, '') as string;
	proxyUrl = (proxyUrl || '').trim();

	// only validate proxyUrl if proxy is custom
	if (proxy !== 'custom') {
		return '';
	}

	if (!proxyUrl) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.PROXY_URL_REQUIRED, {
			itemIndex: index,
		});
	}

	if (!proxyUrl.startsWith('http')) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.PROXY_URL_INVALID, {
			itemIndex: index,
		});
	}

	return proxyUrl;
}

/**
 * Validate the screen resolution parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated screen resolution
 */
export function validateScreenResolution(this: IExecuteFunctions, index: number) {
	let screenResolution = this.getNodeParameter('screenResolution', index, '') as string;
	screenResolution = (screenResolution || '').trim().toLowerCase();
	const regex = /^\d{3,4}x\d{3,4}$/; // Expected format: 1280x720

	if (!screenResolution) {
		return '';
	}

	if (!regex.test(screenResolution)) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.SCREEN_RESOLUTION_INVALID, {
			itemIndex: index,
		});
	}

	return screenResolution;
}

/**
 * Validate the save profile on termination parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @param profileName - The profile name
 * @returns The validated save profile on termination
 */
export function validateSaveProfileOnTermination(
	this: IExecuteFunctions,
	index: number,
	profileName: string,
) {
	const saveProfileOnTermination = this.getNodeParameter(
		'saveProfileOnTermination',
		index,
		false,
	) as boolean;

	if (saveProfileOnTermination && !profileName) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.PROFILE_NAME_REQUIRED, {
			itemIndex: index,
		});
	}

	return saveProfileOnTermination;
}

/**
 * Check if there is an error in the API response and throw NodeApiError
 * @param node - The node instance
 * @param response - The response from the API
 */
export function validateAirtopApiResponse(node: INode, response: IAirtopResponse) {
	if (response?.errors?.length) {
		const errorMessage = response.errors.map((error) => error.message).join('\n');
		throw new NodeApiError(node, {
			message: errorMessage,
		});
	}
}

/**
 * Convert a screenshot from the API response to a binary buffer
 * @param screenshot - The screenshot from the API response
 * @returns The processed screenshot
 */
export function convertScreenshotToBinary(screenshot: { dataUrl: string }): Buffer {
	const base64Data = screenshot.dataUrl.replace('data:image/jpeg;base64,', '');
	const buffer = Buffer.from(base64Data, 'base64');
	return buffer;
}

/**
 * Check if a new session should be created
 * @param this - The execution context
 * @param index - The index of the node
 * @returns True if a new session should be created, false otherwise
 */
export function shouldCreateNewSession(this: IExecuteFunctions, index: number) {
	const sessionMode = this.getNodeParameter('sessionMode', index) as string;
	return Boolean(sessionMode && sessionMode === SESSION_MODE.NEW);
}

/**
 * Create a new session and window
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The session ID and window ID
 */
export async function createSessionAndWindow(
	this: IExecuteFunctions,
	index: number,
): Promise<{ sessionId: string; windowId: string }> {
	const node = this.getNode();
	const noCodeEndpoint = `${INTEGRATION_URL}/create-session`;
	const profileName = validateProfileName.call(this, index);
	const url = validateRequiredStringField.call(this, index, 'url', 'URL');

	const { sessionId } = await apiRequest.call(this, 'POST', noCodeEndpoint, {
		configuration: {
			profileName,
		},
	});

	if (!sessionId) {
		throw new NodeApiError(node, {
			message: 'Failed to create session',
			code: 500,
		});
	}
	this.logger.info(`[${node.name}] Session successfully created.`);

	const windowResponse = await apiRequest.call(this, 'POST', `/sessions/${sessionId}/windows`, {
		url,
	});
	const windowId = windowResponse?.data?.windowId as string;

	if (!windowId) {
		throw new NodeApiError(node, {
			message: 'Failed to create window',
			code: 500,
		});
	}
	this.logger.info(`[${node.name}] Window successfully created.`);
	return { sessionId, windowId };
}
