import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { stringify } from 'qs';
import { Readable } from 'node:stream';

import type { ScopedFetchInterceptor } from '../scoped-interceptor';
import { isFormDataInstance } from './utils';

function buildInterceptedUrl(requestOptions: IHttpRequestOptions, baseResolvedUrl: string): URL {
	const url = new URL(baseResolvedUrl);
	if (requestOptions.qs && Object.keys(requestOptions.qs).length > 0) {
		const serialized = stringify(requestOptions.qs, {
			arrayFormat: requestOptions.arrayFormat,
		});
		if (serialized) {
			url.search = url.search ? `${url.search}&${serialized}` : `?${serialized}`;
		}
	}
	return url;
}

function buildRequestHeaders(
	axiosRequest: AxiosRequestConfig,
	requestOptions: IHttpRequestOptions,
): Headers {
	const headers = new Headers();
	const rawHeaders = axiosRequest.headers;
	if (rawHeaders && typeof rawHeaders === 'object') {
		for (const [key, value] of Object.entries(rawHeaders)) {
			if (value === undefined || value === null) continue;
			if (Array.isArray(value)) {
				for (const item of value) {
					headers.append(key, String(item));
				}
			} else {
				headers.set(key, String(value));
			}
		}
	}
	if (requestOptions.auth && !headers.has('authorization')) {
		const token = Buffer.from(
			`${requestOptions.auth.username}:${requestOptions.auth.password}`,
		).toString('base64');
		headers.set('Authorization', `Basic ${token}`);
	}
	return headers;
}

function serializeRequestBody(
	data: unknown,
	headers: Headers,
): { body?: BodyInit; hasBody: boolean } {
	if (data === undefined || data === null) {
		return { hasBody: false };
	}
	if (typeof data === 'string') {
		return { body: data, hasBody: true };
	}
	if (Buffer.isBuffer(data)) {
		return { body: new Uint8Array(data), hasBody: true };
	}
	if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
		return { body: data as BodyInit, hasBody: true };
	}
	if (data instanceof URLSearchParams) {
		if (!headers.has('content-type')) {
			headers.set('Content-Type', 'application/x-www-form-urlencoded');
		}
		return { body: data.toString(), hasBody: true };
	}
	if (isFormDataInstance(data)) {
		return { body: data.getBuffer() as unknown as BodyInit, hasBody: true };
	}
	if (!headers.has('content-type')) {
		headers.set('Content-Type', 'application/json');
	}
	return { body: JSON.stringify(data), hasBody: true };
}

async function decodeResponseBody(
	response: Response,
	encoding: IHttpRequestOptions['encoding'],
	jsonRequested: boolean | undefined,
): Promise<unknown> {
	if (encoding === 'arraybuffer') {
		return Buffer.from(await response.arrayBuffer());
	}
	if (encoding === 'stream') {
		const buffer = Buffer.from(await response.arrayBuffer());
		return Readable.from(buffer);
	}
	const text = await response.text();
	if (encoding === 'text') {
		return text;
	}
	const contentType = response.headers.get('content-type') ?? '';
	if (jsonRequested || contentType.includes('application/json') || contentType.includes('+json')) {
		if (!text.trim()) return '';
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}
	return text;
}

/**
 * Dispatches an axios-shaped n8n HTTP request directly through a `ScopedFetchInterceptor`
 * and adapts the `Response` back into an `AxiosResponse` (throwing `AxiosError` on non-2xx
 * unless `validateStatus` accepts it).
 */
export async function invokeScopedInterceptor(
	interceptor: ScopedFetchInterceptor,
	axiosRequest: AxiosRequestConfig,
	requestOptions: IHttpRequestOptions,
	resolvedUrl: string,
): Promise<AxiosResponse> {
	const url = buildInterceptedUrl(requestOptions, resolvedUrl);
	const method = (axiosRequest.method ?? 'GET').toUpperCase();
	const headers = buildRequestHeaders(axiosRequest, requestOptions);
	const init: RequestInit = {
		method,
		headers,
		signal:
			requestOptions.abortSignal instanceof AbortSignal ? requestOptions.abortSignal : undefined,
	};

	if (method !== 'GET' && method !== 'HEAD') {
		const { body, hasBody } = serializeRequestBody(axiosRequest.data, headers);
		if (hasBody) {
			init.body = body;
		}
	}

	const response = await interceptor.fetch(url, init);
	const data = await decodeResponseBody(response, requestOptions.encoding, requestOptions.json);
	const responseHeaders: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		responseHeaders[key.toLowerCase()] = value;
	});

	const axiosResponse: AxiosResponse = {
		data,
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
		config: {
			...axiosRequest,
			headers: AxiosHeaders.from(headers as unknown as Record<string, string>),
		},
	};

	const validateStatus =
		axiosRequest.validateStatus ?? ((status: number) => status >= 200 && status < 300);
	if (!validateStatus(response.status)) {
		const code = response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
		throw new AxiosError(
			`Request failed with status code ${response.status}`,
			code,
			axiosResponse.config,
			undefined,
			axiosResponse,
		);
	}

	return axiosResponse;
}
