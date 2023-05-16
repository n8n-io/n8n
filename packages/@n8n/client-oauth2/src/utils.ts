/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ClientOAuth2RequestObject } from './ClientOAuth2';
import { ERROR_RESPONSES } from './constants';

/**
 * Check if properties exist on an object and throw when they aren't.
 */
export function expects(obj: any, ...args: any[]) {
	for (let i = 1; i < args.length; i++) {
		const prop = args[i];
		if (obj[prop] === null) {
			throw new TypeError('Expected "' + prop + '" to exist');
		}
	}
}

export class AuthError extends Error {
	constructor(message: string, readonly body: any, readonly code = 'EAUTH') {
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
 * Sanitize the scopes option to be a string.
 */
export function sanitizeScope(scopes: string[] | string): string {
	return Array.isArray(scopes) ? scopes.join(' ') : toString(scopes);
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
	options: any,
): ClientOAuth2RequestObject {
	const rOptions = {
		url,
		method,
		body: { ...body, ...options.body },
		query: { ...query, ...options.query },
		headers: { ...headers, ...options.headers },
	};
	// if request authorization was overridden delete it from header
	if (rOptions.headers.Authorization === '') {
		delete rOptions.headers.Authorization;
	}
	return rOptions;
}
