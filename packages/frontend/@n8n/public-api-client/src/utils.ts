import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import type { Method } from 'axios';
import axios from 'axios';
import type { GenericValue, IDataObject } from 'n8n-workflow';

import type { IPublicApiContext } from './types';

function getBrowserId() {
	let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
	if (!browserId) {
		browserId = crypto.randomUUID();
		localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
	}
	return browserId;
}

// axios's default query serializer un-escapes `:`, `$`, `,` after encodeURIComponent for
// readability, but the Public API's OpenAPI spec requires reserved characters (e.g. the
// colons in ISO date-times) to stay percent-encoded, so we serialize query params ourselves.
function serializeParams(params: IDataObject) {
	return Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key, value]) => {
			const stringValue =
				typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
					? String(value)
					: JSON.stringify(value);
			return `${encodeURIComponent(key)}=${encodeURIComponent(stringValue)}`;
		})
		.join('&');
}

export class PublicApiResponseError extends Error {
	httpStatusCode?: number;

	constructor(message: string, httpStatusCode?: number) {
		super(message);
		this.name = 'PublicApiResponseError';
		this.httpStatusCode = httpStatusCode;
	}
}

async function request<T>(
	context: IPublicApiContext,
	method: Method,
	endpoint: string,
	data?: GenericValue | GenericValue[],
): Promise<T> {
	try {
		const response = await axios.request({
			method,
			baseURL: context.baseUrl,
			url: endpoint,
			headers: { 'browser-id': getBrowserId() },
			withCredentials: true,
			...(['POST', 'PATCH', 'PUT'].includes(method)
				? { data }
				: { params: data, paramsSerializer: serializeParams }),
		});

		return response.data as T;
	} catch (error) {
		const errorResponseData = axios.isAxiosError(error) ? error.response?.data : undefined;
		const message =
			(errorResponseData as { message?: string } | undefined)?.message ??
			(error instanceof Error ? error.message : 'Unknown error');

		throw new PublicApiResponseError(
			message,
			axios.isAxiosError(error) ? error.response?.status : undefined,
		);
	}
}

export const get = async <T>(context: IPublicApiContext, endpoint: string, params?: IDataObject) =>
	await request<T>(context, 'GET', endpoint, params);

export const post = async <T>(context: IPublicApiContext, endpoint: string, data?: IDataObject) =>
	await request<T>(context, 'POST', endpoint, data);

export const patch = async <T>(context: IPublicApiContext, endpoint: string, data?: IDataObject) =>
	await request<T>(context, 'PATCH', endpoint, data);
