/* eslint-disable @typescript-eslint/no-explicit-any */
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
	) {
		super(message);
	}
}

/**
 * Pull an authentication error from the response data.
 */
export function getAuthError(body: {
	error: string;
	error_description?: string;
}): Error | undefined {
	const message: string | undefined =
		ERROR_RESPONSES[body.error] ?? body.error_description ?? body.error;

	if (message) {
		return new AuthError(message, body);
	}

	return undefined;
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
