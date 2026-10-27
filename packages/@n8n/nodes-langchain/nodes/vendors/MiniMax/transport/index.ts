import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
import { NodeOperationError } from 'n8n-workflow';

import type {
	VideoGenerationResponse,
	VideoGenerationV2Response,
	VideoTaskV2QueryResponse,
} from '../helpers/interfaces';

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
	const versionedBaseUrl = (credentials.url as string) ?? 'https://api.minimax.io/v1';
	const baseUrl = versionedBaseUrl.replace(/\/v1\/?$/, '');
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
const VIDEO_V2_TERMINAL_STATUSES = ['succeeded', 'failed', 'cancelled'];
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 60;

export async function pollVideoTask(
	this: IExecuteFunctions,
	taskId: string,
	pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<{ fileId: string; status: string }> {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		const response = await apiRequest.call(this, 'GET', '/v1/query/video_generation', {
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

export async function pollVideoTaskV2(
	this: IExecuteFunctions,
	taskId: string,
	pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<{ videoUrl: string; status: string }> {
	const abortSignal = this.getExecutionCancelSignal();

	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		abortSignal?.throwIfAborted();

		const response = (await apiRequest.call(
			this,
			'GET',
			`/v2/query/video_generation/${taskId}`,
		)) as VideoTaskV2QueryResponse;
		const task = response.task;
		const status = task?.status;

		if (status && VIDEO_V2_TERMINAL_STATUSES.includes(status)) {
			if (status !== 'succeeded') {
				const errorCode = task.error?.code ?? 'UNKNOWN';
				const errorMessage = task.error?.message ?? `Video generation task was ${status}`;
				throw new NodeOperationError(this.getNode(), `Task failed: [${errorCode}] ${errorMessage}`);
			}

			const videoUrl = task.content?.url;
			if (!videoUrl) {
				throw new NodeOperationError(
					this.getNode(),
					'Video generation succeeded but no video URL was returned',
				);
			}

			return { videoUrl, status };
		}

		await sleep(pollIntervalMs, abortSignal);
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
	const response = await apiRequest.call(this, 'GET', '/v1/files/retrieve', {
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

export async function generateVideo(
	this: IExecuteFunctions,
	apiVersion: 'v1' | 'v2',
	body: IDataObject,
): Promise<{ videoUrl: string; taskId: string; fileId?: string }> {
	if (apiVersion === 'v2') {
		const response = (await apiRequest.call(this, 'POST', '/v2/video_generation', {
			body,
		})) as VideoGenerationV2Response;
		const taskId = response.task_id;
		if (!taskId) {
			throw new NodeOperationError(
				this.getNode(),
				'No task_id returned from video generation request',
			);
		}

		const { videoUrl } = await pollVideoTaskV2.call(this, taskId);
		return { videoUrl, taskId };
	}

	const response = (await apiRequest.call(this, 'POST', '/v1/video_generation', {
		body,
	})) as VideoGenerationResponse;
	if (response.base_resp?.status_code !== 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to create video task: ${response.base_resp?.status_msg || 'Unknown error'}`,
		);
	}

	const taskId = response.task_id;
	if (!taskId) {
		throw new NodeOperationError(
			this.getNode(),
			'No task_id returned from video generation request',
		);
	}

	const { fileId } = await pollVideoTask.call(this, taskId);
	const videoUrl = await getVideoDownloadUrl.call(this, fileId);
	return { videoUrl, taskId, fileId };
}
