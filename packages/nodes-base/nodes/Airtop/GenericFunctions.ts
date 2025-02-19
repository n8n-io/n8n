import { NodeApiError, type IExecuteFunctions, type INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	ERROR_MESSAGES,
	DEFAULT_TIMEOUT_MINUTES,
	MIN_TIMEOUT_MINUTES,
	MAX_TIMEOUT_MINUTES,
} from './constants';
import type { IAirtopResponse } from './transport/response.type';

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
