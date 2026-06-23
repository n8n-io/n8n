import type { IHttpRequestOptions } from 'n8n-workflow';

import type { HttpRequestClientOptions } from './client-options';

/**
 * Headers to apply to every request from a bound {@link HttpRequestClient}.
 * Entries whose value is `undefined` are dropped,
 * so an absent token simply omits its header.
 */
export type HttpRequestDefaultHeaders = Record<string, string | undefined>;

/**
 * Folds a bound client's `baseURL` and default `headers` into a single request.
 * Per-request values win. An explicit `baseURL` is left untouched, and per-request headers override the defaults per key.
 * Default headers with an `undefined` value are dropped so an absent token simply omits its header.
 */
export function withClientDefaults(
	requestOptions: IHttpRequestOptions,
	baseURL: HttpRequestClientOptions['baseURL'],
	headers: HttpRequestClientOptions['headers'],
): IHttpRequestOptions {
	if (baseURL === undefined && headers === undefined) {
		return requestOptions;
	}

	const merged: IHttpRequestOptions = { ...requestOptions };

	if (baseURL !== undefined && merged.baseURL === undefined) {
		merged.baseURL = baseURL;
	}

	if (headers !== undefined) {
		const defaults = typeof headers === 'function' ? headers() : headers;
		const combined: Record<string, unknown> = { ...defaults, ...requestOptions.headers };
		for (const key of Object.keys(combined)) {
			if (combined[key] === undefined) {
				delete combined[key];
			}
		}
		merged.headers = combined as IHttpRequestOptions['headers'];
	}

	return merged;
}
