import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject;
	qs?: IDataObject;
	option?: IDataObject;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option, headers } = parameters ?? {};

	const credentials = await this.getCredentials('minimaxApi');
	const baseUrl = (credentials.url as string) ?? 'https://api.minimax.io/v1';
	const url = `${baseUrl}${endpoint}`;

	const options = {
		headers: headers ?? {},
		method,
		body,
		qs,
		url,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'minimaxApi', options);
}

const VIDEO_TERMINAL_STATUSES = ['Success', 'Fail'];
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 60;

export async function pollVideoTask(
	this: IExecuteFunctions,
	taskId: string,
	pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<{ fileId: string; status: string }> {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		const response = await apiRequest.call(this, 'GET', '/query/video_generation', {
			qs: { task_id: taskId },
		});

		const status = response?.status as string;

		if (VIDEO_TERMINAL_STATUSES.includes(status)) {
			if (status === 'Fail') {
				const errorCode = response?.base_resp?.status_code || 'UNKNOWN';
				const errorMessage = response?.base_resp?.status_msg || 'Video generation task failed';
				throw new NodeOperationError(this.getNode(), `Task failed: [${errorCode}] ${errorMessage}`);
			}

			const fileId = response?.file_id as string;
			if (!fileId) {
				throw new NodeOperationError(
					this.getNode(),
					'Video generation succeeded but no file_id was returned',
				);
			}

			return { fileId, status };
		}

		await sleep(pollIntervalMs);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Video task ${taskId} did not complete within the maximum polling time. You can query the task manually using the task ID.`,
	);
}

export async function getVideoDownloadUrl(
	this: IExecuteFunctions,
	fileId: string,
): Promise<string> {
	const response = await apiRequest.call(this, 'GET', '/files/retrieve', {
		qs: { file_id: fileId },
	});

	const downloadUrl = response?.file?.download_url as string;
	if (!downloadUrl) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to retrieve download URL for file ${fileId}`,
		);
	}

	return downloadUrl;
}
