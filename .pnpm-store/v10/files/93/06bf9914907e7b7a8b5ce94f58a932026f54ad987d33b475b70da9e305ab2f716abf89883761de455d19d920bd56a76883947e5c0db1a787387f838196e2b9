/// <reference types="node" />

import {RequestOptions} from 'http';
import {FormData} from 'formdata-polyfill/esm.min.js';
import {
	Blob,
	blobFrom,
	blobFromSync,
	File,
	fileFrom,
	fileFromSync
} from 'fetch-blob/from.js';

type AbortSignal = {
	readonly aborted: boolean;

	addEventListener: (type: 'abort', listener: (this: AbortSignal) => void) => void;
	removeEventListener: (type: 'abort', listener: (this: AbortSignal) => void) => void;
};

export type HeadersInit = Headers | Record<string, string> | Iterable<readonly [string, string]> | Iterable<Iterable<string>>;

export {
	FormData,
	Blob,
	blobFrom,
	blobFromSync,
	File,
	fileFrom,
	fileFromSync
};

/**
 * This Fetch API interface allows you to perform various actions on HTTP request and response headers.
 * These actions include retrieving, setting, adding to, and removing.
 * A Headers object has an associated header list, which is initially empty and consists of zero or more name and value pairs.
 * You can add to this using methods like append() (see Examples.)
 * In all methods of this interface, header names are matched by case-insensitive byte sequence.
 * */
export class Headers {
	constructor(init?: HeadersInit);

	append(name: string, value: string): void;
	delete(name: string): void;
	get(name: string): string | null;
	has(name: string): boolean;
	set(name: string, value: string): void;
	forEach(
		callbackfn: (value: string, key: string, parent: Headers) => void,
		thisArg?: any
	): void;

	[Symbol.iterator](): IterableIterator<[string, string]>;
	/**
	 * Returns an iterator allowing to go through all key/value pairs contained in this object.
	 */
	entries(): IterableIterator<[string, string]>;
	/**
	 * Returns an iterator allowing to go through all keys of the key/value pairs contained in this object.
	 */
	keys(): IterableIterator<string>;
	/**
	 * Returns an iterator allowing to go through all values of the key/value pairs contained in this object.
	 */
	values(): IterableIterator<string>;

	/** Node-fetch extension */
	raw(): Record<string, string[]>;
}

export interface RequestInit {
	/**
	 * A BodyInit object or null to set request's body.
	 */
	body?: BodyInit | null;
	/**
	 * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
	 */
	headers?: HeadersInit;
	/**
	 * A string to set request's method.
	 */
	method?: string;
	/**
	 * A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
	 */
	redirect?: RequestRedirect;
	/**
	 * An AbortSignal to set request's signal.
	 */
	signal?: AbortSignal | null;
	/**
	 * A string whose value is a same-origin URL, "about:client", or the empty string, to set request’s referrer.
	 */
	referrer?: string;
	/**
	 * A referrer policy to set request’s referrerPolicy.
	 */
	referrerPolicy?: ReferrerPolicy;

	// Node-fetch extensions to the whatwg/fetch spec
	agent?: RequestOptions['agent'] | ((parsedUrl: URL) => RequestOptions['agent']);
	compress?: boolean;
	counter?: number;
	follow?: number;
	hostname?: string;
	port?: number;
	protocol?: string;
	size?: number;
	highWaterMark?: number;
	insecureHTTPParser?: boolean;
}

export interface ResponseInit {
	headers?: HeadersInit;
	status?: number;
	statusText?: string;
}

export type BodyInit =
	| Blob
	| Buffer
	| URLSearchParams
	| FormData
	| NodeJS.ReadableStream
	| string;
declare class BodyMixin {
	constructor(body?: BodyInit, options?: {size?: number});

	readonly body: NodeJS.ReadableStream | null;
	readonly bodyUsed: boolean;
	readonly size: number;

	/** @deprecated Use `body.arrayBuffer()` instead. */
	buffer(): Promise<Buffer>;
	arrayBuffer(): Promise<ArrayBuffer>;
	formData(): Promise<FormData>;
	blob(): Promise<Blob>;
	json(): Promise<unknown>;
	text(): Promise<string>;
}

// `Body` must not be exported as a class since it's not exported from the JavaScript code.
export interface Body extends Pick<BodyMixin, keyof BodyMixin> {}

export type RequestRedirect = 'error' | 'follow' | 'manual';
export type ReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'same-origin' | 'origin' | 'strict-origin' | 'origin-when-cross-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
export type RequestInfo = string | Request;
export class Request extends BodyMixin {
	constructor(input: URL | RequestInfo, init?: RequestInit);

	/**
	 * Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header.
	 */
	readonly headers: Headers;
	/**
	 * Returns request's HTTP method, which is "GET" by default.
	 */
	readonly method: string;
	/**
	 * Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default.
	 */
	readonly redirect: RequestRedirect;
	/**
	 * Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler.
	 */
	readonly signal: AbortSignal;
	/**
	 * Returns the URL of request as a string.
	 */
	readonly url: string;
	/**
	 * A string whose value is a same-origin URL, "about:client", or the empty string, to set request’s referrer.
	 */
	readonly referrer: string;
	/**
	 * A referrer policy to set request’s referrerPolicy.
	 */
	readonly referrerPolicy: ReferrerPolicy;
	clone(): Request;
}

type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect';

export class Response extends BodyMixin {
	constructor(body?: BodyInit | null, init?: ResponseInit);

	readonly headers: Headers;
	readonly ok: boolean;
	readonly redirected: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly type: ResponseType;
	readonly url: string;
	clone(): Response;

	static error(): Response;
	static redirect(url: string, status?: number): Response;
	static json(data: any, init?: ResponseInit): Response;
}

export class FetchError extends Error {
	constructor(message: string, type: string, systemError?: Record<string, unknown>);

	name: 'FetchError';
	[Symbol.toStringTag]: 'FetchError';
	type: string;
	code?: string;
	errno?: string;
}

export class AbortError extends Error {
	type: string;
	name: 'AbortError';
	[Symbol.toStringTag]: 'AbortError';
}

export function isRedirect(code: number): boolean;
export default function fetch(url: URL | RequestInfo, init?: RequestInit): Promise<Response>;
