import type { IExecuteFunctions } from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';
import type { Stream } from 'stream';

import { BASE_URL, ERROR_MESSAGES, OPERATION_TIMEOUT } from '../../constants';
import { apiRequest } from '../../transport';
import type { IAirtopResponseWithFiles, IAirtopServerEvent } from '../../transport/types';

/**
 * Fetches all files from the Airtop API using pagination
 * @param this - The execution context providing access to n8n functionality
 * @param sessionIds - Comma-separated string of session IDs to filter files by
 * @returns Promise resolving to a response object containing the complete array of files
 */
export async function requestAllFiles(
	this: IExecuteFunctions,
	sessionIds: string,
): Promise<IAirtopResponseWithFiles> {
	const endpoint = '/files';
	let hasMore = true;
	let currentOffset = 0;
	const limit = 100;
	const files: IAirtopResponseWithFiles['data']['files'] = [];
	let responseData: IAirtopResponseWithFiles;

	while (hasMore) {
		// request files
		responseData = (await apiRequest.call(
			this,
			'GET',
			endpoint,
			{},
			{ offset: currentOffset, limit, sessionIds },
		)) as IAirtopResponseWithFiles;
		// add files to the array
		if (responseData.data?.files && Array.isArray(responseData.data?.files)) {
			files.push(...responseData.data.files);
		}
		// check if there are more files
		hasMore = Boolean(responseData.data?.pagination?.hasMore);
		currentOffset += limit;
	}

	return {
		data: {
			files,
			pagination: {
				hasMore,
			},
		},
	};
}

/**
 * Polls the Airtop API until a file reaches "available" status or times out
 * @param this - The execution context providing access to n8n functionality
 * @param fileId - The unique identifier of the file to poll
 * @param timeout - Maximum time in milliseconds to wait before failing (defaults to OPERATION_TIMEOUT)
 * @param intervalSeconds - Time in seconds to wait between polling attempts (defaults to 1)
 * @returns Promise resolving to the file ID when the file is available
 * @throws NodeApiError if the operation times out or API request fails
 */
export async function pollFileUntilAvailable(
	this: IExecuteFunctions,
	fileId: string,
	timeout = OPERATION_TIMEOUT,
	intervalSeconds = 1,
): Promise<string> {
	let fileStatus = '';
	const startTime = Date.now();

	while (fileStatus !== 'available') {
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime >= timeout) {
			throw new NodeApiError(this.getNode(), {
				message: ERROR_MESSAGES.TIMEOUT_REACHED,
				code: 500,
			});
		}

		const response = await apiRequest.call(this, 'GET', `/files/${fileId}`);
		fileStatus = response.data?.status as string;

		// Wait before the next polling attempt
		await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
	}

	return fileId;
}

/**
 * Creates a file entry in Airtop, uploads the file content, and waits until processing completes
 * @param this - The execution context providing access to n8n functionality
 * @param fileName - Name to assign to the uploaded file
 * @param fileBuffer - Buffer containing the binary file data to upload
 * @param fileType - Classification of the file in Airtop (e.g., 'customer_upload')
 * @param pollingFunction - Function to use for checking file availability (defaults to pollFileUntilAvailable)
 * @returns Promise resolving to the file ID once upload is complete and file is available
 * @throws NodeApiError if file creation, upload, or polling fails
 */
export async function createAndUploadFile(
	this: IExecuteFunctions,
	fileName: string,
	fileBuffer: Buffer,
	fileType: string,
	pollingFunction = pollFileUntilAvailable,
): Promise<string> {
	// Create file entry
	const createResponse = await apiRequest.call(this, 'POST', '/files', { fileName, fileType });

	const fileId = createResponse.data?.id;
	const uploadUrl = createResponse.data?.uploadUrl as string;

	if (!fileId || !uploadUrl) {
		throw new NodeApiError(this.getNode(), {
			message: 'Failed to create file entry: missing file ID or upload URL',
			code: 500,
		});
	}

	// Upload the file
	await this.helpers.httpRequest({
		method: 'PUT',
		url: uploadUrl,
		body: fileBuffer,
		headers: {
			'Content-Type': 'application/octet-stream',
		},
	});

	// Poll until the file is available
	return await pollingFunction.call(this, fileId as string);
}

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

function isFileAvailable(event: IAirtopServerEvent, fileId: string): boolean {
	return (
		event.event === 'file_upload_status' && event.fileId === fileId && event.status === 'available'
	);
}

/**
 * Waits for a file to be ready in a session by monitoring session events
 * @param this - The execution context providing access to n8n functionality
 * @param sessionId - ID of the session to monitor for file events
 * @param timeout - Maximum time in milliseconds to wait before failing (defaults to OPERATION_TIMEOUT)
 * @returns Promise that resolves when a file in the session becomes available
 * @throws NodeApiError if the timeout is reached before a file becomes available
 */
export async function waitForFileInSession(
	this: IExecuteFunctions,
	sessionId: string,
	fileId: string,
	timeout = OPERATION_TIMEOUT,
): Promise<void> {
	const url = `${BASE_URL}/sessions/${sessionId}/events?all=true`;

	const fileReadyPromise = new Promise<void>(async (resolve, reject) => {
		const stream = (await this.helpers.httpRequestWithAuthentication.call(this, 'airtopApi', {
			method: 'GET',
			url,
			encoding: 'stream',
		})) as Stream;

		const close = () => {
			resolve();
			stream.removeAllListeners();
		};

		const onError = (errorMessage: string) => {
			const error = new NodeApiError(this.getNode(), {
				message: errorMessage,
				description: 'Failed to upload file',
				code: 500,
			});
			reject(error);
			stream.removeAllListeners();
		};

		stream.on('data', (data: Uint8Array) => {
			const event = parseEvent(data.toString());
			if (!event) {
				return;
			}
			// handle error
			if (event?.eventData?.error) {
				onError(event.eventData.error);
				return;
			}
			// handle file available
			if (isFileAvailable(event, fileId)) {
				close();
			}
		});
	});

	const timeoutPromise = new Promise<void>((_resolve, reject) => {
		setTimeout(
			() =>
				reject(
					new NodeApiError(this.getNode(), {
						message: ERROR_MESSAGES.TIMEOUT_REACHED,
						code: 500,
					}),
				),
			timeout,
		);
	});

	await Promise.race([fileReadyPromise, timeoutPromise]);
}

/**
 * Associates a file with a session and waits until the file is ready for use
 * @param this - The execution context providing access to n8n functionality
 * @param fileId - ID of the file to associate with the session
 * @param sessionId - ID of the session to add the file to
 * @param pollingFunction - Function to use for checking file availability in session (defaults to waitForFileInSession)
 * @returns Promise that resolves when the file is ready for use in the session
 */
export async function pushFileToSession(
	this: IExecuteFunctions,
	fileId: string,
	sessionId: string,
	pollingFunction = waitForFileInSession,
): Promise<void> {
	// Push file into session
	await apiRequest.call(this, 'POST', `/files/${fileId}/push`, { sessionIds: [sessionId] });
	await pollingFunction.call(this, sessionId, fileId);
}

/**
 * Activates a file upload input in a specific window within a session
 * @param this - The execution context providing access to n8n functionality
 * @param fileId - ID of the file to use for the input
 * @param windowId - ID of the window where the file input will be triggered
 * @param sessionId - ID of the session containing the window
 * @returns Promise that resolves when the file input has been triggered
 */
export async function triggerFileInput(
	this: IExecuteFunctions,
	fileId: string,
	windowId: string,
	sessionId: string,
	elementDescription = '',
): Promise<void> {
	await apiRequest.call(this, 'POST', `/sessions/${sessionId}/windows/${windowId}/file-input`, {
		fileId,
		...(elementDescription ? { elementDescription } : {}),
	});
}

/**
 * Creates a file Buffer from either a URL or binary data
 * This function supports two source types:
 * - URL: Downloads the file from the specified URL and returns it as a Buffer
 * - Binary: Retrieves binary data from the workflow's binary data storage
 *
 * @param this - The execution context providing access to n8n functionality
 * @param source - Source type, either 'url' or 'binary'
 * @param value - Either a URL string or binary data property name depending on source type
 * @param itemIndex - Index of the workflow item to get binary data from (when source is 'binary')
 * @returns Promise resolving to a Buffer containing the file data
 * @throws NodeApiError if the source type is unsupported or retrieval fails
 */
export async function createFileBuffer(
	this: IExecuteFunctions,
	source: string,
	value: string,
	itemIndex: number,
): Promise<Buffer> {
	if (source === 'url') {
		const buffer = (await this.helpers.httpRequest({
			url: value,
			json: false,
			encoding: 'arraybuffer',
		})) as Buffer;

		return buffer;
	}

	if (source === 'binary') {
		const binaryData = await this.helpers.getBinaryDataBuffer(itemIndex, value);
		return binaryData;
	}

	throw new NodeApiError(this.getNode(), {
		message: `Unsupported source type: ${source}. Please use 'url' or 'binary'`,
		code: 500,
	});
}
