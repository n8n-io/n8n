import type { AxiosRequestConfig, Method, RawAxiosRequestHeaders } from 'axios';
import axios from 'axios';
import type { IDataObject } from 'n8n-workflow';
import type { IExecutionFlattedResponse, IExecutionResponse, IRestApiContext } from '@/Interface';
import { parse } from 'flatted';

const BROWSER_ID_STORAGE_KEY = 'n8n-browserId';
let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
if (!browserId && 'randomUUID' in crypto) {
	browserId = crypto.randomUUID();
	localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
}

export const NO_NETWORK_ERROR_CODE = 999;

export class ResponseError extends Error {
	// The HTTP status code of response
	httpStatusCode?: number;

	// The error code in the response
	errorCode?: number;

	// The stack trace of the server
	serverStackTrace?: string;

	/**
	 * Creates an instance of ResponseError.
	 * @param {string} message The error message
	 * @param {number} [errorCode] The error code which can be used by frontend to identify the actual error
	 * @param {number} [httpStatusCode] The HTTP status code the response should have
	 * @param {string} [stack] The stack trace
	 */
	constructor(
		message: string,
		options: { errorCode?: number; httpStatusCode?: number; stack?: string } = {},
	) {
		super(message);
		this.name = 'ResponseError';

		const { errorCode, httpStatusCode, stack } = options;
		if (errorCode) {
			this.errorCode = errorCode;
		}
		if (httpStatusCode) {
			this.httpStatusCode = httpStatusCode;
		}
		if (stack) {
			this.serverStackTrace = stack;
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyParamSerializer = (params: Record<string, any>) =>
	Object.keys(params)
		.filter((key) => params[key] !== undefined)
		.map((key) => {
			if (Array.isArray(params[key])) {
				return params[key].map((v) => `${key}[]=${encodeURIComponent(v)}`).join('&');
			}
			if (typeof params[key] === 'object') {
				params[key] = JSON.stringify(params[key]);
			}
			return `${key}=${encodeURIComponent(params[key])}`;
		})
		.join('&');

export async function request(config: {
	method: Method;
	baseURL: string;
	endpoint: string;
	headers?: RawAxiosRequestHeaders;
	data?: IDataObject | IDataObject[];
	withCredentials?: boolean;
}) {
	const { method, baseURL, endpoint, headers, data } = config;
	const options: AxiosRequestConfig = {
		method,
		url: endpoint,
		baseURL,
		headers: headers ?? {},
	};
	if (baseURL.startsWith('/') && browserId) {
		options.headers!['browser-id'] = browserId;
	}
	if (
		import.meta.env.NODE_ENV !== 'production' &&
		!baseURL.includes('api.n8n.io') &&
		!baseURL.includes('n8n.cloud')
	) {
		options.withCredentials = options.withCredentials ?? true;
	}
	if (['POST', 'PATCH', 'PUT'].includes(method)) {
		options.data = data;
	} else if (data) {
		options.params = data;
		options.paramsSerializer = legacyParamSerializer;
	}

	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		if (error.message === 'Network Error') {
			throw new ResponseError("Can't connect to n8n.", {
				errorCode: NO_NETWORK_ERROR_CODE,
			});
		}

		const errorResponseData = error.response.data;
		if (errorResponseData !== undefined && errorResponseData.message !== undefined) {
			if (errorResponseData.name === 'NodeApiError') {
				errorResponseData.httpStatusCode = error.response.status;
				throw errorResponseData;
			}

			throw new ResponseError(errorResponseData.message, {
				errorCode: errorResponseData.code,
				httpStatusCode: error.response.status,
				stack: errorResponseData.stack,
			});
		}

		throw error;
	}
}

export async function makeRestApiRequest<T>(
	context: IRestApiContext,
	method: Method,
	endpoint: string,
	data?: IDataObject | IDataObject[],
) {
	const response = await request({
		method,
		baseURL: context.baseUrl,
		endpoint,
		headers: { 'push-ref': context.pushRef },
		data,
	});

	// @ts-ignore all cli rest api endpoints return data wrapped in `data` key
	return response.data as T;
}

export async function get(
	baseURL: string,
	endpoint: string,
	params?: IDataObject,
	headers?: RawAxiosRequestHeaders,
) {
	return await request({ method: 'GET', baseURL, endpoint, headers, data: params });
}

export async function post(
	baseURL: string,
	endpoint: string,
	params?: IDataObject,
	headers?: RawAxiosRequestHeaders,
) {
	return await request({ method: 'POST', baseURL, endpoint, headers, data: params });
}

export async function patch(
	baseURL: string,
	endpoint: string,
	params?: IDataObject,
	headers?: IDataObject,
) {
	return await request({ method: 'PATCH', baseURL, endpoint, headers, data: params });
}

/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 */
export function unflattenExecutionData(
	fullExecutionData: IExecutionFlattedResponse,
): IExecutionResponse {
	// Unflatten the data
	const returnData: IExecutionResponse = {
		...fullExecutionData,
		workflowData: fullExecutionData.workflowData,
		data: parse(fullExecutionData.data),
	};

	returnData.finished = returnData.finished ? returnData.finished : false;

	if (fullExecutionData.id) {
		returnData.id = fullExecutionData.id;
	}

	return returnData;
}
