import {
	NodeApiError,
	type IExecuteFunctions,
	type INode,
	type IDataObject,
	jsonParse,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type Stream from 'node:stream';

import { SESSION_MODE } from './actions/common/fields';
import { BASE_URL, type TScrollingMode } from './constants';
import {
	ERROR_MESSAGES,
	DEFAULT_TIMEOUT_MINUTES,
	DEFAULT_DOWNLOAD_TIMEOUT_SECONDS,
	MIN_TIMEOUT_MINUTES,
	MAX_TIMEOUT_MINUTES,
	SESSION_STATUS,
	OPERATION_TIMEOUT,
} from './constants';
import { apiRequest } from './transport';
import type {
	IAirtopResponse,
	IAirtopServerEvent,
	IAirtopSessionResponse,
} from './transport/types';

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
	let value = this.getNodeParameter(field, index, '') as string;
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
 * Validate the Proxy configuration
 * @param this - The execution context
 * @param index - The index of the node
 * @returns The validated proxy configuration
 */
export function validateProxy(this: IExecuteFunctions, index: number) {
	const proxyParam = this.getNodeParameter('proxy', index, '') as
		| 'none'
		| 'integrated'
		| 'proxyUrl';
	const proxyConfig = this.getNodeParameter('proxyConfig', index, '') as {
		country: string;
		sticky: boolean;
	};
	const isConfigEmpty = Object.keys(proxyConfig).length === 0;

	if (proxyParam === 'integrated') {
		return {
			proxy: isConfigEmpty ? true : { ...proxyConfig },
		};
	}

	// handle custom proxy configuration
	if (proxyParam === 'proxyUrl') {
		return {
			proxy: validateRequiredStringField.call(this, index, 'proxyUrl', 'Proxy URL'),
		};
	}

	return {
		proxy: false,
	};
}

/**
 * Validate the scrollBy amount parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @param parameterName - The name of the parameter
 * @returns The validated scrollBy amount
 */
export function validateScrollByAmount(
	this: IExecuteFunctions,
	index: number,
	parameterName: string,
) {
	const regex = /^(?:-?\d{1,3}(?:%|px))$/;
	const scrollBy = this.getNodeParameter(parameterName, index, {}) as {
		xAxis?: string;
		yAxis?: string;
	};

	if (!scrollBy?.xAxis && !scrollBy?.yAxis) {
		return {};
	}

	const allAxisValid = [scrollBy.xAxis, scrollBy.yAxis]
		.filter(Boolean)
		.every((axis) => regex.test(axis ?? ''));

	if (!allAxisValid) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.SCROLL_BY_AMOUNT_INVALID, {
			itemIndex: index,
		});
	}

	return scrollBy;
}

/**
 * Validate the scroll mode parameter
 * @param this - The execution context
 * @param index - The index of the node
 * @returns Scroll mode
 * @throws Error if the scroll mode or scroll parameters are invalid
 */
export function validateScrollingMode(this: IExecuteFunctions, index: number): TScrollingMode {
	const scrollingMode = this.getNodeParameter(
		'scrollingMode',
		index,
		'automatic',
	) as TScrollingMode;

	const scrollToEdge = this.getNodeParameter('scrollToEdge.edgeValues', index, {}) as {
		xAxis?: string;
		yAxis?: string;
	};
	const scrollBy = this.getNodeParameter('scrollBy.scrollValues', index, {}) as {
		xAxis?: string;
		yAxis?: string;
	};

	if (scrollingMode !== 'manual') {
		return scrollingMode;
	}

	// validate manual scroll parameters
	const emptyScrollBy = !scrollBy.xAxis && !scrollBy.yAxis;
	const emptyScrollToEdge = !scrollToEdge.xAxis && !scrollToEdge.yAxis;

	if (emptyScrollBy && emptyScrollToEdge) {
		throw new NodeOperationError(this.getNode(), ERROR_MESSAGES.SCROLL_MODE_INVALID, {
			itemIndex: index,
		});
	}

	return scrollingMode;
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
 * Create a new session and wait until the session is ready
 * @param this - The execution context
 * @param parameters - The parameters for the session
 * @returns The session ID
 */
export async function createSession(
	this: IExecuteFunctions,
	parameters: IDataObject,
	timeout = OPERATION_TIMEOUT,
): Promise<{ sessionId: string; data: IAirtopSessionResponse }> {
	// Request session creation
	const response = (await apiRequest.call(
		this,
		'POST',
		'/sessions',
		parameters,
	)) as IAirtopSessionResponse;
	const sessionId = response?.data?.id;

	if (!sessionId) {
		throw new NodeApiError(this.getNode(), {
			message: 'Failed to create session',
			code: 500,
		});
	}

	// Poll until the session is ready or timeout is reached
	let sessionStatus = response?.data?.status;
	const startTime = Date.now();

	while (sessionStatus !== SESSION_STATUS.RUNNING) {
		if (Date.now() - startTime > timeout) {
			throw new NodeApiError(this.getNode(), {
				message: ERROR_MESSAGES.TIMEOUT_REACHED,
				code: 500,
			});
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const sessionStatusResponse = (await apiRequest.call(
			this,
			'GET',
			`/sessions/${sessionId}`,
		)) as IAirtopSessionResponse;
		sessionStatus = sessionStatusResponse.data.status;
	}

	return {
		sessionId,
		data: {
			...response,
		},
	};
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
	const profileName = validateProfileName.call(this, index);
	const url = validateRequiredStringField.call(this, index, 'url', 'URL');

	const { sessionId } = await createSession.call(this, {
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

/**
 * SSE Helpers
 */

/**
 * Parses a server event from a string
 * @param eventText - The string to parse
 * @returns The parsed event or null if the string is not a valid event
 */
function parseEvent(eventText: string): IAirtopServerEvent | null {
	const dataLine = eventText.split('\n').find((line) => line.startsWith('data:'));
	if (!dataLine) {
		return null;
	}
	const jsonStr = dataLine.replace('data: ', '').trim();
	return jsonParse<IAirtopServerEvent>(jsonStr, {
		errorMessage: 'Failed to parse server event',
	});
}

/**
 * Waits for a session event to occur
 * @param this - The execution context providing access to n8n functionality
 * @param sessionId - ID of the session to check for events
 * @param condition - Function to check if the event meets the condition
 * @param timeoutInSeconds - Maximum time in seconds to wait before failing (defaults to DEFAULT_DOWNLOAD_TIMEOUT_SECONDS)
 * @returns Promise resolving to the event when the condition is met
 */
export async function waitForSessionEvent(
	this: IExecuteFunctions,
	sessionId: string,
	condition: (event: IAirtopServerEvent) => boolean,
	timeoutInSeconds = DEFAULT_DOWNLOAD_TIMEOUT_SECONDS,
): Promise<IAirtopServerEvent> {
	const url = `${BASE_URL}/sessions/${sessionId}/events?all=true`;
	let stream: Stream;

	const eventPromise = new Promise<IAirtopServerEvent>(async (resolve) => {
		stream = (await this.helpers.httpRequestWithAuthentication.call(this, 'airtopApi', {
			method: 'GET',
			url,
			encoding: 'stream',
		})) as Stream;

		stream.on('data', (data: Uint8Array) => {
			const event = parseEvent(data.toString());
			if (!event) {
				return;
			}
			// handle event
			if (condition(event)) {
				stream.removeAllListeners();
				resolve(event);
				return;
			}
		});
	});

	const timeoutPromise = new Promise<void>((_resolve, reject) => {
		setTimeout(() => {
			reject(
				new NodeApiError(this.getNode(), {
					message: ERROR_MESSAGES.TIMEOUT_REACHED,
					code: 500,
				}),
			);
			stream.removeAllListeners();
		}, timeoutInSeconds * 1000);
	});

	const result = await Promise.race([eventPromise, timeoutPromise]);
	return result as IAirtopServerEvent;
}
