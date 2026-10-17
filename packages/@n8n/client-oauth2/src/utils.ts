/* eslint-disable @typescript-eslint/no-explicit-any */
import { isRecord } from '@n8n/utils/is-record';

import type { ClientOAuth2Options, ClientOAuth2RequestObject } from './client-oauth2';
import { ERROR_RESPONSES } from './constants';

/**
 * Check if properties exist on an object and throw when they aren't.
 */
export function expects<Keys extends keyof ClientOAuth2Options>(
	obj: ClientOAuth2Options,
	...keys: Keys[]
): asserts obj is ClientOAuth2Options & {
	[K in Keys]: NonNullable<ClientOAuth2Options[K]>;
} {
	for (const key of keys) {
		if (obj[key] === null || obj[key] === undefined) {
			throw new TypeError('Expected "' + key + '" to exist');
		}
	}
}

export class AuthError extends Error {
	constructor(
		message: string,
		readonly body: any,
		readonly code = 'EAUTH',
		/** True when `message` is the text of an `error` object in the server response. */
		readonly fromErrorObject = false,
	) {
		super(message);
	}
}

const UNREADABLE_ERROR_MESSAGE = 'The OAuth2 server rejected the request';

/** Some servers (e.g. Meta Graph API) send `error` as an object with its own `message`. */
function getErrorObjectText(value: unknown): string | undefined {
	return isRecord(value) && typeof value.message === 'string' && value.message
		? value.message
		: undefined;
}

/**
 * Pull an authentication error from the response data.
 */
export function getAuthError(body: {
	error: string;
	error_description?: string;
}): Error | undefined {
	const message: unknown = ERROR_RESPONSES[body.error] ?? body.error_description ?? body.error;

	if (!message) return undefined;
	if (typeof message === 'string') return new AuthError(message, body);

	const errorObjectText = getErrorObjectText(message);
	return errorObjectText
		? new AuthError(errorObjectText, body, undefined, true)
		: new AuthError(UNREADABLE_ERROR_MESSAGE, body);
}

/**
 * Parse a string as a URL, returning `null` when it is not parseable.
 */
export function tryParseUrl(url: string): URL | null {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

/**
 * Ensure a value is a string.
 */
function toString(str: string | null | undefined) {
	return str === null ? '' : String(str);
}

/**
 * Create basic auth header.
 */
export function auth(username: string, password: string): string {
	return 'Basic ' + Buffer.from(toString(username) + ':' + toString(password)).toString('base64');
}

/**
 * Merge request options from an options object.
 */
export function getRequestOptions(
	{ url, method, body, query, headers }: ClientOAuth2RequestObject,
	options: ClientOAuth2Options,
): ClientOAuth2RequestObject {
	const rOptions = {
		url,
		method,
		body: { ...body, ...options.body },
		query: { ...query, ...options.query },
		headers: headers ?? {},
		ignoreSSLIssues: options.ignoreSSLIssues,
	};
	// if request authorization was overridden delete it from header
	if (rOptions.headers.Authorization === '') {
		delete rOptions.headers.Authorization;
	}
	return rOptions;
}
