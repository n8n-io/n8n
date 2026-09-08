import pick from 'lodash/pick';
import { NodeApiError } from 'n8n-workflow';
import { ERROR_MESSAGES, OPERATION_TIMEOUT } from '../../constants';
import { waitForSessionEvent } from '../../GenericFunctions';
import { apiRequest } from '../../transport';
/**
 * Fetches all files from the Airtop API using pagination
 * @param this - The execution context providing access to n8n functionality
 * @param sessionIds - Comma-separated string of session IDs to filter files by
 * @returns Promise resolving to a response object containing the complete array of files
 */
export async function requestAllFiles(sessionIds) {
    const endpoint = '/files';
    let hasMore = true;
    let currentOffset = 0;
    const limit = 100;
    const files = [];
    let responseData;
    while (hasMore) {
        // request files
        responseData = (await apiRequest.call(this, 'GET', endpoint, {}, { offset: currentOffset, limit, sessionIds }));
        // add files to the array
        if (responseData.data?.files && Array.isArray(responseData.data?.files)) {
            files.push.apply(files, responseData.data.files);
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
export async function pollFileUntilAvailable(fileId, timeout = OPERATION_TIMEOUT, intervalSeconds = 1) {
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
        fileStatus = response.data?.status;
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
export async function createAndUploadFile(fileName, fileBuffer, fileType, pollingFunction = pollFileUntilAvailable) {
    // Create file entry
    const createResponse = await apiRequest.call(this, 'POST', '/files', {
        fileName,
        fileType,
    });
    const fileId = createResponse.data?.id;
    const uploadUrl = createResponse.data?.uploadUrl;
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
    return await pollingFunction.call(this, fileId);
}
/**
 * Waits for a file to be ready in a session by polling file's information
 * @param this - The execution context providing access to n8n functionality
 * @param sessionId - ID of the session to check for file availability
 * @param fileId - ID of the file
 * @param timeout - Maximum time in milliseconds to wait before failing (defaults to OPERATION_TIMEOUT)
 * @returns Promise that resolves when a file in the session becomes available
 * @throws NodeApiError if the timeout is reached before a file becomes available
 */
export async function waitForFileInSession(sessionId, fileId, timeout = OPERATION_TIMEOUT) {
    // Wait for a "file_upload_status" event with status "available" or "upload_failed"
    const condition = (sessionEvent) => {
        const { event, status } = sessionEvent;
        return (sessionEvent.fileId === fileId &&
            event === 'file_upload_status' &&
            (status === 'available' || status === 'upload_failed'));
    };
    const event = await waitForSessionEvent.call(this, sessionId, condition, timeout);
    if (event.status === 'upload_failed') {
        const error = new NodeApiError(this.getNode(), {
            message: event.eventData?.error ?? `Upload failed for File ID: ${fileId}`,
            code: 500,
        });
        throw error;
    }
}
/**
 * Associates a file with a session and waits until the file is ready for use
 * @param this - The execution context providing access to n8n functionality
 * @param fileId - ID of the file to associate with the session
 * @param sessionId - ID of the session to add the file to
 * @param pollingFunction - Function to use for checking file availability in session (defaults to waitForFileInSession)
 * @returns Promise that resolves when the file is ready for use in the session
 */
export async function pushFileToSession(fileId, sessionId, pollingFunction = waitForFileInSession) {
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
export async function triggerFileInput(request) {
    await apiRequest.call(this, 'POST', `/sessions/${request.sessionId}/windows/${request.windowId}/file-input`, pick(request, ['fileId', 'elementDescription', 'includeHiddenElements']));
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
export async function createFileBuffer(source, value, itemIndex) {
    if (source === 'url') {
        const buffer = (await this.helpers.httpRequest({
            url: value,
            json: false,
            encoding: 'arraybuffer',
        }));
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
//# sourceMappingURL=helpers.js.map