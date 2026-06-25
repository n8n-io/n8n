import type { IHttpRequestOptions } from 'n8n-workflow';

import type { HttpRequestClientOptions } from './client-options';

/**
 * Headers to apply to every request from a bound {@link HttpRequestClient}.
 * Entries whose value is `undefined` are dropped,
 * so an absent token simply omits its header.
 */
export type HttpRequestDefaultHeaders = Record<string, string | undefined>;

/**
 * Folds a bound client's `baseURL`, default `headers` and default `timeout` into
 * a single request. Per-request values win: an explicit `baseURL`/`timeout` is
 * left untouched, and per-request headers override the defaults case-insensitively.
 * Default headers with an `undefined` value are dropped so an absent token simply omits its header.
 */
export function withClientDefaults(
	requestOptions: IHttpRequestOptions,
	baseURL: HttpRequestClientOptions['baseURL'],
	headers: HttpRequestClientOptions['headers'],
	timeout: HttpRequestClientOptions['timeout'],
): IHttpRequestOptions {
	if (baseURL === undefined && headers === undefined && timeout === undefined) {
		return requestOptions;
	}

	const merged: IHttpRequestOptions = { ...requestOptions };

	if (baseURL !== undefined && merged.baseURL === undefined) {
		merged.baseURL = baseURL;
	}

	if (timeout !== undefined && merged.timeout === undefined) {
		merged.timeout = timeout;
	}

	if (headers !== undefined) {
		const defaults = typeof headers === 'function' ? headers() : headers;
		const requestHeaders = requestOptions.headers ?? {};

		// Merge case-insensitively: a per-request header overrides a default with
		// the same name in any casing (e.g. `content-type` over `Content-Type`),
		// instead of both surviving as duplicate keys. The per-request casing wins.
		const byLowerKey = new Map<string, { key: string; value: unknown }>();
		for (const [key, value] of Object.entries(defaults)) {
			byLowerKey.set(key.toLowerCase(), { key, value });
		}
		for (const [key, value] of Object.entries(requestHeaders)) {
			byLowerKey.set(key.toLowerCase(), { key, value });
		}

		const combined: Record<string, unknown> = {};
		for (const { key, value } of byLowerKey.values()) {
			if (value !== undefined) {
				combined[key] = value;
			}
		}
		merged.headers = combined as IHttpRequestOptions['headers'];
	}

	return merged;
}
