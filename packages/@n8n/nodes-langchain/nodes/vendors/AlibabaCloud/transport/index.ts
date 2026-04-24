import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: object | string;
	qs?: IDataObject;
	option?: IDataObject;
};

const TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'CANCELED'];
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 60; // ~15 min with 15s interval

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option } = parameters ?? {};

	const credentials = await this.getCredentials('alibabaCloudApi');

	const uri = `${credentials.url as string}${endpoint}`;
	const headers = parameters?.headers ?? {};

	const options = {
		headers,
		method,
		body,
		qs,
		url: uri,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'alibabaCloudApi',
		options,
	);

	if (response && response.error === null) {
		delete response.error;
	}

	return response;
}

/**
 * Polls an asynchronous task until it reaches a terminal status (SUCCEEDED, FAILED, or CANCELED).
 *
 * @param taskId - The task ID returned by the async task creation call.
 * @param pollIntervalMs - Interval between polls in milliseconds. Defaults to 15 seconds.
 * @returns The final task response containing video_url on success.
 */
export async function pollTaskResult(
	this: IExecuteFunctions,
	taskId: string,
	pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<IDataObject> {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		const response = await apiRequest.call(this, 'GET', `/api/v1/tasks/${taskId}`);

		const taskStatus = response?.output?.task_status as string;

		if (TERMINAL_STATUSES.includes(taskStatus)) {
			if (taskStatus === 'FAILED') {
				const errorCode = response?.output?.code || response?.code || 'UNKNOWN';
				const errorMessage =
					response?.output?.message || response?.message || 'Video generation task failed';
				throw new NodeOperationError(this.getNode(), `Task failed: [${errorCode}] ${errorMessage}`);
			}

			if (taskStatus === 'CANCELED') {
				throw new NodeOperationError(this.getNode(), 'Video generation task was canceled');
			}

			// SUCCEEDED
			return response as IDataObject;
		}

		// Wait before next poll
		await sleep(pollIntervalMs);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Task ${taskId} did not complete within the maximum polling time. Last status was not terminal. You can query the task manually using the task ID.`,
	);
}
