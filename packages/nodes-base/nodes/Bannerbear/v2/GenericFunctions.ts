import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';

const BASE_URL = 'https://api.bannerbear.com/v5';

export const TOOL_POLL_INTERVAL_MS = 2000;

export async function bannerbearApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	baseUrl: string = BASE_URL,
) {
	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		url: `${baseUrl}${resource}`,
		json: true,
	};

	if (!Object.keys(options.body as IDataObject).length) {
		delete options.body;
	}
	if (!Object.keys(options.qs as IDataObject).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'bannerbearV5Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Remove keys the user left blank so the API applies its own defaults.
 */
export function compact(body: IDataObject): IDataObject {
	const result: IDataObject = {};
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null || value === '') continue;
		result[key] = value;
	}
	return result;
}

/**
 * Split a textarea of one URL per line into an array, preserving order.
 */
export function linesToArray(value: string): string[] {
	if (!value) return [];
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/**
 * V5 returns render output in a `files` object keyed by format. Flatten it to
 * `<format>Url` keys so the output is easy to reference in later nodes.
 */
export function flattenImageFiles(image: IDataObject): IDataObject {
	const files = (image.files ?? {}) as IDataObject;
	const preferred = ['jpg', 'png', 'webp', 'avif', 'pdf'];

	for (const [format, url] of Object.entries(files)) {
		image[`${format}Url`] = url;
	}

	const primary = preferred.find((format) => files[format]) ?? Object.keys(files)[0];
	image.imageUrl = primary ? files[primary] : null;

	return image;
}

/**
 * Animations return `files` keyed by format (mp4, or mov when transparent).
 */
export function flattenAnimationFiles(animation: IDataObject): IDataObject {
	const files = (animation.files ?? {}) as IDataObject;
	const preferred = ['mp4', 'mov'];

	for (const [format, url] of Object.entries(files)) {
		animation[`${format}Url`] = url;
	}

	const primary = preferred.find((format) => files[format]) ?? Object.keys(files)[0];
	animation.animationUrl = primary ? files[primary] : null;

	return animation;
}

/**
 * Tool endpoints are async: they return 202 with a pending job. Poll until the
 * job settles, or return the pending job once the caller's budget runs out.
 */
export async function runTool(
	this: IExecuteFunctions,
	tool: string,
	body: IDataObject,
	index: number,
): Promise<IDataObject> {
	const waitForCompletion = this.getNodeParameter('waitForCompletion', index, true) as boolean;

	let job = (await bannerbearApiRequest.call(
		this,
		'POST',
		`/tools/${tool}`,
		compact(body),
	)) as IDataObject;

	if (!waitForCompletion) return job;

	const maxTries = this.getNodeParameter('maxTries', index, 30) as number;

	for (let tries = 0; tries < maxTries; tries++) {
		if (job.status === 'completed' || job.status === 'failed') break;
		await sleep(TOOL_POLL_INTERVAL_MS);
		job = (await bannerbearApiRequest.call(
			this,
			'GET',
			`/tool_jobs/${job.uid as string}`,
		)) as IDataObject;
	}

	if (job.status === 'failed') {
		throw new NodeApiError(this.getNode(), job as JsonObject, {
			message: (job.error_message as string) ?? 'The tool job failed',
		});
	}

	return job;
}
