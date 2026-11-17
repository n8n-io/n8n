/**
 * Compiled library node: `n8n-nodes-base.httpRequest` (simplified parameters).
 *
 * It sends one request and gives the items of the v1 node (`HttpRequestV3`):
 * - a status of 400 or more fails the node with the message and description of
 *   n8n's `NodeApiError`, unless `response.neverError` is set; with `errorItems`
 *   (the node continues on fail) it gives the error item of v1 instead;
 * - the body by the response format: `autodetect` reads the content type
 *   (JSON, else text in `outputPropertyName`), `json` and `text` force one;
 * - `response.fullResponse` gives `{ body, headers, statusCode, statusMessage }`
 *   (text in `outputPropertyName` in place of `body`).
 * `version` is the node version: before 3 the format is JSON unless set.
 */
import { defineNode, type HttpResponse, type Item, type ResponseBinary } from '@n8n/workflow-lang';

interface ResponseOptions {
	fullResponse?: boolean;
	neverError?: boolean;
	responseFormat?: string;
	outputPropertyName?: string;
}

interface HttpRequestParameters {
	method?: string;
	url: string;
	headers?: Record<string, string>;
	qs?: Record<string, unknown>;
	body?: unknown;
	sendBody?: boolean;
	response?: ResponseOptions;
	errorItems?: boolean;
	version?: number;
	/** The index of the item in the input, for the messages of v1. */
	itemIndex?: number;
	/** The binary properties of the item (`$binary`), for a file body or file parts. */
	files?: Record<string, unknown>;
	/** `contentType: binaryData`: the binary property whose bytes are the body. */
	binaryField?: unknown;
	/** `contentType: multipart-form-data`: the rows of the body, in order. */
	multipart?: FormRow[];
	/** Before version 4.2, a repeated name replaces the earlier value (one object). */
	multipartAssign?: boolean;
	/**
	 * `options.sendCredentialsOnCrossOriginRedirect` of the node. Without it, versions 3 to
	 * 4.3 send the credential to another origin after a redirect, and the other versions do not.
	 */
	sendCredentialsOnCrossOriginRedirect?: boolean;
	/**
	 * The largest number of redirects that the node follows (`options.redirect` of v1). The
	 * default is 21. With 0 the node follows no redirect.
	 */
	redirects?: number;
	/** `options.timeout` of v1: the time limit of each request in ms. */
	timeoutMs?: number;
	/** How the query goes into the URL: v1 writes it with the qs library (`brackets`). */
	qsFormat?: 'repeat' | 'brackets';
	/** The n8n credential behind `credential`. */
	credentialId?: string;
	/** The n8n credential type behind `credential`. */
	credentialType?: string;
	/**
	 * Pagination: the request parameters of one page, merged into the request
	 * as v1 does (lodash `merge`). The node then never fails on the status and
	 * gives one item `{ response: { body, headers, statusCode }, items }`. The
	 * converter writes the page loop around it.
	 */
	page?: PageRequest;
	/**
	 * Response format "file": the node adds the answers of its GET requests here. When a
	 * file is over the largest size of the runtime, the fallback host runs the v1 node, and
	 * the converted workflow gives it these answers: the v1 node sends none of these
	 * requests again. A stored body goes as its reference (`{ $binary }`), not as bytes.
	 * The request whose body was too large has no answer here: the v1 node sends it.
	 */
	replay?: Replay;
}

/**
 * The GET requests of the node with their answers, for the fallback host. The converted
 * workflow owns the object: it lives for all calls of the node in one run.
 */
interface Replay {
	list: unknown[];
	/** About the size of the bodies in `list`. */
	bytes: number;
	/** True when the answers did not fit. The list is then empty, and stays empty. */
	full: boolean;
}

/**
 * The response format `autodetect` of the v1 node (`HttpRequestV3.node.ts`, `execute`): a
 * content type with `application/json` is JSON, else a content type with one text of
 * `binaryContentTypes` (`GenericFunctions.ts`) is a file, else the body is text. The runtime
 * decides with this rule after the head of the response (`responseBinary`, spec 7.1).
 */
const AUTODETECT: ResponseBinary = {
	inlineTypes: ['application/json'],
	storeTypes: [
		'image/',
		'audio/',
		'video/',
		'application/octet-stream',
		'application/gzip',
		'application/zip',
		'application/vnd.rar',
		'application/epub+zip',
		'application/x-bzip',
		'application/x-bzip2',
		'application/x-cdf',
		'application/vnd.amazon.ebook',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-fontobject',
		'application/vnd.oasis.opendocument.presentation',
		'application/pdf',
		'application/x-tar',
		'application/vnd.visio',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/x-7z-compressed',
	],
};

/** With "never error" the v1 node makes the file from a response of each status. */
const AUTODETECT_ANY_STATUS: ResponseBinary = { ...AUTODETECT, anyStatus: true };

/** True when the runtime stored the body of a response with this content type (`AUTODETECT`). */
function storesType(header: unknown): boolean {
	const contentType = typeof header === 'string' ? header : '';
	if (contentType.includes('application/json')) return false;
	for (const text of AUTODETECT.storeTypes ?? []) {
		if (contentType.includes(text)) return true;
	}
	return false;
}

/** The most answers that the node keeps for the host. */
const REPLAY_ENTRIES = 256;

/** The most bytes of bodies that the node keeps for the host: far below a host frame (64 MiB). */
const REPLAY_BYTES = 8 * 1024 * 1024;

/** Keeps the answer of a GET request. The answer is not copied. */
function keepAnswer(
	replay: Replay,
	url: string,
	qs: Record<string, unknown>,
	response: HttpResponse<unknown>,
): void {
	if (replay.full) return;
	// A stored body is a reference. The body of a redirect is text.
	const size = 1024 + (typeof response.body === 'string' ? response.body.length : 0);
	if (replay.list.length >= REPLAY_ENTRIES || replay.bytes + size > REPLAY_BYTES) {
		replay.full = true;
		replay.list = [];
		return;
	}
	replay.bytes += size;
	replay.list.push({ method: 'GET', url, qs, response });
}

interface FormRow {
	name?: unknown;
	value?: unknown;
	/** The binary property of a file part (`formBinaryData`). */
	field?: unknown;
	file?: boolean;
}

interface FilePart {
	data: string;
	id?: string;
	mimeType?: string;
	fileName?: string;
}

type Part = { name: string; value: string } | { name: string; binary: FilePart };

function asText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value === undefined || value === null) return '';
	return typeof value === 'number' || typeof value === 'boolean'
		? String(value)
		: JSON.stringify(value);
}

/**
 * The file of a binary property, as `assertBinaryData` of n8n-core finds it: the item must
 * have binary data, and the property.
 */
function fileOf(
	files: Record<string, unknown> | undefined,
	field: string,
	index: number,
): FilePart {
	if (files === undefined) {
		throw new Error(
			`This operation expects the node's input data to contain a binary file '${field}', but none was found [item ${index}]`,
		);
	}
	const file = files[field];
	if (!isRecord(file)) {
		throw new Error(`The item has no binary field '${field}' [item ${index}]`);
	}
	const out: FilePart = { data: asText(file.data) };
	if (typeof file.id === 'string') out.id = file.id;
	if (typeof file.mimeType === 'string') out.mimeType = file.mimeType;
	if (typeof file.fileName === 'string') out.fileName = file.fileName;
	return out;
}

/**
 * The parts of a multipart body, as v1 builds its form-data: a file part has the file name
 * (`path.basename`, default `file`) and the MIME type of the binary property.
 */
function formParts(p: HttpRequestParameters): Part[] {
	const index = p.itemIndex ?? 0;
	const parts: Part[] = [];
	for (const row of p.multipart ?? []) {
		const name = asText(row.name);
		let part: Part;
		if (row.file === true) {
			const file = fileOf(p.files, asText(row.field), index);
			const fileName = file.fileName ?? 'file';
			const binary: FilePart = {
				data: file.data,
				fileName: fileName.split('/').pop() ?? fileName,
				mimeType: file.mimeType ?? 'application/octet-stream',
			};
			if (file.id !== undefined) binary.id = file.id;
			part = { name, binary };
		} else {
			part = { name, value: asText(row.value) };
		}
		const at = p.multipartAssign === true ? parts.findIndex((x) => x.name === name) : -1;
		if (at >= 0) parts[at] = part;
		else parts.push(part);
	}
	return parts;
}

interface RequestParts {
	headers: Record<string, string>;
	body: unknown;
	multipart?: Part[];
}

/** The headers and body of the request: a file body has the MIME type of the file. */
function requestParts(p: HttpRequestParameters): RequestParts {
	const headers = p.headers ?? {};
	if (!p.sendBody) return { headers, body: undefined };
	if (p.multipart !== undefined) return { headers, body: undefined, multipart: formParts(p) };
	if (p.binaryField !== undefined) {
		const file = fileOf(p.files, asText(p.binaryField), p.itemIndex ?? 0);
		const ref: FilePart = { data: file.data };
		if (file.id !== undefined) ref.id = file.id;
		if (file.mimeType !== undefined) ref.mimeType = file.mimeType;
		const typed = Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');
		return {
			headers: typed
				? headers
				: { 'content-type': file.mimeType ?? 'application/octet-stream', ...headers },
			body: { $binary: ref },
		};
	}
	return { headers, body: p.body };
}

interface PageRequest {
	url?: unknown;
	qs?: Record<string, unknown>;
	headers?: Record<string, unknown>;
	body?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The status that means "the token expired" for the credential types to which the v1 node
 * gives one (`getOAuth2AdditionalParameters`). The runtime renews the token and sends the
 * request again once, as `requestOAuth2` of n8n-core does. It uses this status when the
 * credential has none of its own; for each other type the status is 401.
 */
function tokenExpiredStatus(type: unknown): number | undefined {
	return type === 'goToWebinarOAuth2Api' || type === 'microsoftAzureMonitorOAuth2Api'
		? 403
		: undefined;
}

/** lodash `merge` for request parts: objects merge deeply, undefined keeps the target. */
function mergeValue(target: unknown, source: unknown): unknown {
	if (source === undefined) return target;
	if (isRecord(source)) {
		const out: Record<string, unknown> = isRecord(target) ? { ...target } : {};
		for (const key of Object.keys(source)) out[key] = mergeValue(out[key], source[key]);
		return out;
	}
	return source;
}

/** Header values as text. */
function textValues(value: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	if (!isRecord(value)) return out;
	for (const key of Object.keys(value)) {
		const v = value[key];
		if (v === undefined || v === null) continue;
		out[key] = typeof v === 'string' ? v : JSON.stringify(v);
	}
	return out;
}

/** The query keys of a URL (`URL.searchParams.keys()`), decoded. */
function queryKeys(url: string): string[] {
	const start = url.indexOf('?');
	if (start < 0) return [];
	const end = url.indexOf('#', start);
	const query = url.slice(start + 1, end < 0 ? url.length : end);
	const keys: string[] = [];
	for (const part of query.split('&')) {
		if (part === '') continue;
		const eq = part.indexOf('=');
		const name = (eq < 0 ? part : part.slice(0, eq)).replaceAll('+', ' ');
		keys.push(decodeURIComponent(name));
	}
	return keys;
}

/** `STATUS_CODE_MESSAGES` of n8n's `NodeApiError`. */
function apiErrorMessage(status: number): string {
	switch (status) {
		case 400:
			return 'Bad request - please check your parameters';
		case 401:
			return 'Authorization failed - please check your credentials';
		case 402:
			return 'Payment required - perhaps check your payment details?';
		case 403:
			return 'Forbidden - perhaps check your credentials?';
		case 404:
			return 'The resource you are requesting could not be found';
		case 405:
			return 'Method not allowed - please check you are using the right HTTP method';
		case 429:
			return 'The service is receiving too many requests from you';
		case 500:
			return 'The service was not able to process your request';
		case 502:
			return 'Bad gateway - the service failed to handle your request';
		case 503:
			return 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)';
		case 504:
			return 'Gateway timed out - perhaps try again later?';
		default:
			return status >= 500
				? 'The service failed to process your request'
				: 'Your request is invalid or could not be processed by the service';
	}
}

/** The reason phrase of a status, as Node.js gives it (`statusMessage`). */
function reasonPhrase(status: number): string {
	switch (status) {
		case 200:
			return 'OK';
		case 201:
			return 'Created';
		case 202:
			return 'Accepted';
		case 204:
			return 'No Content';
		case 301:
			return 'Moved Permanently';
		case 302:
			return 'Found';
		case 304:
			return 'Not Modified';
		case 400:
			return 'Bad Request';
		case 401:
			return 'Unauthorized';
		case 403:
			return 'Forbidden';
		case 404:
			return 'Not Found';
		case 405:
			return 'Method Not Allowed';
		case 409:
			return 'Conflict';
		case 422:
			return 'Unprocessable Entity';
		case 429:
			return 'Too Many Requests';
		case 500:
			return 'Internal Server Error';
		case 501:
			return 'Not Implemented';
		case 502:
			return 'Bad Gateway';
		case 503:
			return 'Service Unavailable';
		case 504:
			return 'Gateway Timeout';
		default:
			return '';
	}
}

/** `location` against the URL of the request (an absolute path keeps the origin). */
function resolveUrl(base: string, location: string): string {
	if (location.startsWith('http://') || location.startsWith('https://')) return location;
	const scheme = base.indexOf('://');
	const rest = scheme < 0 ? base : base.slice(scheme + 3);
	const slash = rest.indexOf('/');
	const origin = scheme < 0 ? '' : base.slice(0, scheme + 3 + (slash < 0 ? rest.length : slash));
	if (location.startsWith('/')) return `${origin}${location}`;
	const parts = base.split('?')[0].split('/');
	parts[parts.length - 1] = location;
	return parts.join('/');
}

/**
 * The headers with the `accept` header that the v1 node (version 3 and later) adds for the
 * response format, when the request has none.
 */
function withAccept(
	headers: Record<string, string>,
	options: ResponseOptions,
	version: number,
): Record<string, string> {
	if (version < 3) return headers;
	if (Object.keys(headers).some((name) => name.toLowerCase() === 'accept')) return headers;
	const format = options.responseFormat;
	const accept =
		format === 'json'
			? 'application/json,text/*;q=0.99'
			: format === 'text'
				? 'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, */*;q=0.1'
				: 'application/json,text/html,application/xhtml+xml,application/xml,text/*;q=0.9, image/*;q=0.8, */*;q=0.7';
	return { ...headers, accept };
}

/** The scheme, the host and the port of a URL, in lower case. */
function originOf(url: string): string {
	const scheme = url.indexOf('://');
	if (scheme < 0) return '';
	const rest = url.slice(scheme + 3);
	let end = rest.length;
	for (const mark of ['/', '?', '#']) {
		const at = rest.indexOf(mark);
		if (at >= 0 && at < end) end = at;
	}
	return url.slice(0, scheme + 3 + end).toLowerCase();
}

/**
 * As n8n-core for a redirect: the same origin, or the same host that goes from http to
 * https with no port in the two URLs.
 */
function sameOrigin(first: string, next: string): boolean {
	const from = originOf(first);
	const to = originOf(next);
	if (from === to) return true;
	const host = from.slice('http://'.length);
	return from.startsWith('http://') && !host.includes(':') && to === `https://${host}`;
}

/** The headers without those of the body, as n8n-core drops them when the method becomes GET. */
function withoutContent(headers: Record<string, string>): Record<string, string> {
	const kept: Record<string, string> = {};
	for (const name of Object.keys(headers)) {
		if (!name.toLowerCase().startsWith('content-')) kept[name] = headers[name];
	}
	return kept;
}

/** The headers without those that authenticate a request, as n8n-core drops them. */
function withoutAuthentication(headers: Record<string, string>): Record<string, string> {
	const kept: Record<string, string> = {};
	for (const name of Object.keys(headers)) {
		const lower = name.toLowerCase();
		if (lower === 'authorization' || lower === 'proxy-authorization' || lower === 'cookie')
			continue;
		kept[name] = headers[name];
	}
	return kept;
}

/** The body as the text that the server sent. */
function bodyText(body: unknown): string {
	if (body === undefined || body === null) return '';
	return typeof body === 'string' ? body : JSON.stringify(body);
}

/** The description of a `NodeApiError`: the error text in the body, as n8n finds it. */
function errorDescription(body: unknown): string | undefined {
	if (typeof body === 'string') return body === '' ? undefined : body;
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
	const record = body as Record<string, unknown>;
	for (const key of ['message', 'error', 'description', 'error_description', 'detail']) {
		const value = record[key];
		if (typeof value === 'string') return value;
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			const inner = (value as Record<string, unknown>).message;
			if (typeof inner === 'string') return inner;
		}
	}
	return undefined;
}

/** Three digits as a number, or undefined when the text is not exactly three digits. */
function digits3(text: string): number | undefined {
	if (text.length !== 3) return undefined;
	for (const c of text) {
		if (c < '0' || c > '9') return undefined;
	}
	return Number(text);
}

/**
 * The status that a failed request reports in its message: the AxiosError of v1 writes
 * `<status> - "<body>"`, and a client error writes `... status code <status>`.
 */
function failureStatus(message: string): number | undefined {
	const head = digits3(message.slice(0, 3));
	if (head !== undefined && (message.length === 3 || message.charAt(3) === ' ')) return head;
	const marker = 'status code ';
	const at = message.indexOf(marker);
	if (at < 0) return undefined;
	return digits3(message.slice(at + marker.length, at + marker.length + 3));
}

/** The codes that Node.js gives a failed connection, as v1's AxiosError keeps them. */
const NETWORK_CODES = [
	'ECONNREFUSED',
	'ECONNRESET',
	'EAI_AGAIN',
	'EHOSTUNREACH',
	'ECONNABORTED',
	'ENOTFOUND',
	'ETIMEDOUT',
	'ERRADDRINUSE',
	'EADDRNOTAVAIL',
];

/** The network error code of a failure of the request, when its message names one. */
function failureCode(message: string): string | undefined {
	for (const code of NETWORK_CODES) {
		if (message.indexOf(code) >= 0) return code;
	}
	return undefined;
}

/**
 * The reason of a failed request, as v1's item carries it: the AxiosError with the status,
 * its code, the message and the body of the response. A failure without a status (a
 * network error) keeps the name 'Error' and the code that Node.js gives it.
 */
function requestReason(status: number | undefined, message: string, body?: unknown): Item {
	const reason: Item = { name: status === undefined ? 'Error' : 'AxiosError', message };
	if (status !== undefined) {
		reason.code = status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST';
		reason.status = status;
		reason.statusCode = status;
		if (body !== undefined) reason.error = bodyText(body);
		return reason;
	}
	const code = failureCode(message);
	if (code !== undefined) reason.code = code;
	return reason;
}

/**
 * The item of a request that failed under "continue on fail", as v1's node gives it: the
 * reason object in `error`, and from version 4.5 the `details` of `createErrorDetails`.
 */
function requestFailureItem(
	reason: Item,
	status: number | undefined,
	body: unknown,
	version: number,
): Item {
	const item: Item = { error: reason };
	if (version < 4.5 || status === undefined) return item;
	const details: Item = {
		message: apiErrorMessage(status),
		httpCode: String(status),
		context: { itemIndex: 0 },
	};
	if (body !== undefined) details.body = body;
	const description = errorDescription(body);
	if (description !== undefined) details.description = description;
	item.details = details;
	return item;
}

/** The items of one response, as the v1 node makes them for the response options. */
function responseItems(
	responseBody: unknown,
	headers: Record<string, unknown>,
	status: number,
	options: ResponseOptions,
	version: number,
): Item[] {
	const header = headers['content-type'];
	const contentType = typeof header === 'string' ? header : '';
	const outputName = options.outputPropertyName ?? 'data';
	let format = options.responseFormat ?? (version >= 3 ? 'autodetect' : 'json');
	if (format === 'autodetect') format = contentType.includes('application/json') ? 'json' : 'text';
	let body: unknown = responseBody;
	// n8n-core gives no body for an empty response, so a full response has no `body` key.
	const noBody = responseBody === '' || responseBody === undefined || responseBody === null;
	if (format === 'json') {
		if (body === '' || body === undefined || body === null) body = {};
		if (typeof body === 'string') {
			throw new Error('Response body is not valid JSON. Change "Response Format" to "Text"');
		}
	}
	if (options.fullResponse === true) {
		const item: Item = {};
		if (format === 'text') {
			// An empty text body is undefined in v1, so the key is not there.
			const text = bodyText(body);
			if (text !== '') item[outputName] = text;
		} else if (!noBody) item.body = body;
		item.headers = headers;
		item.statusCode = status;
		item.statusMessage = reasonPhrase(status);
		return [item];
	}
	if (format === 'text') {
		const text = bodyText(body);
		// An empty text body gives an empty item (v1 sets the body to undefined).
		return text === '' ? [{}] : [{ [outputName]: text }];
	}
	if (Array.isArray(body)) return [...body] as Item[];
	if (typeof body !== 'object' || body === null) return [{ [outputName]: body }];
	return [body as Item];
}

export default defineNode<HttpRequestParameters>({
	type: 'n8n-nodes-base.httpRequest',
	version: 4,
	async run(ctx, parameters, items, credential) {
		const method = parameters.method ?? 'GET';
		const options = parameters.response ?? {};
		const version = parameters.version ?? 4;
		// v1's node catches a failed request for each item (`this.continueOnFail()`), so it
		// gives the reason object as the item instead of failing the node.
		const continues = parameters.errorItems === true;
		const tokenExpiredStatusCode = tokenExpiredStatus(parameters.credentialType);
		if (parameters.page !== undefined) {
			// applyPaginationRequestData of n8n-core.
			const page = parameters.page;
			const pageUrl = page.url;
			const url =
				pageUrl === undefined
					? parameters.url
					: typeof pageUrl === 'string'
						? pageUrl
						: JSON.stringify(pageUrl);
			const qs = mergeValue(parameters.qs ?? {}, page.qs);
			const query: Record<string, unknown> = isRecord(qs) ? qs : {};
			if (page.url !== undefined) for (const key of queryKeys(url)) delete query[key];
			// The HTTP client leaves out query parameters that are null or undefined.
			for (const key of Object.keys(query)) if (query[key] === null) delete query[key];
			const headers = mergeValue(parameters.headers ?? {}, page.headers);
			const body = parameters.sendBody ? mergeValue(parameters.body, page.body) : undefined;
			const pageResponse = await ctx.http<unknown>({
				method,
				url,
				headers: withAccept(textValues(headers), options, version),
				qs: query,
				qsFormat: parameters.qsFormat,
				body,
				credential,
				tokenExpiredStatusCode,
				allowedDomains: true,
				timeoutMs: parameters.timeoutMs,
			});
			const items = responseItems(
				pageResponse.body,
				pageResponse.headers,
				pageResponse.status,
				options,
				version,
			);
			const status = pageResponse.status;
			const pageItem: Item = {
				response: { body: pageResponse.body, headers: pageResponse.headers, statusCode: status },
				items,
			};
			// The error when this page fails and another page would follow.
			if (status < 200 || status >= 300) {
				const failure: Item = {
					name: 'NodeApiError',
					message: apiErrorMessage(status),
					httpCode: String(status),
					statusText: reasonPhrase(status),
				};
				const description = errorDescription(pageResponse.body);
				if (description !== undefined) failure.description = description;
				pageItem.failure = failure;
			}
			return [pageItem];
		}
		// `responseFormat: file`: the runtime stores the body of a 2xx response (spec 7.1).
		// `autodetect`: the runtime stores it when the content type is one of v1's binary types.
		const stores = options.responseFormat === 'file';
		const detects =
			(options.responseFormat ?? (version >= 3 ? 'autodetect' : 'json')) === 'autodetect';
		const anyStatus = options.neverError === true;
		const responseBinary = stores
			? {}
			: detects
				? anyStatus
					? AUTODETECT_ANY_STATUS
					: AUTODETECT
				: undefined;
		const parts = requestParts(parameters);
		const sent = { ...parts, headers: withAccept(parts.headers, options, version) };
		let response: HttpResponse<unknown>;
		try {
			response = await ctx.http<unknown>({
				method,
				url: parameters.url,
				headers: sent.headers,
				qs: parameters.qs ?? {},
				qsFormat: parameters.qsFormat,
				body: sent.body,
				multipart: sent.multipart,
				credential,
				tokenExpiredStatusCode,
				allowedDomains: true,
				// The node sends the request of each redirect itself, with the rules of the v1 node.
				followRedirects: false,
				timeoutMs: parameters.timeoutMs,
				responseBinary,
			});
		} catch (error) {
			if (stores) {
				const limit = fileLimitError(error);
				// oxlint-disable-next-line typescript/only-throw-error
				if (limit !== undefined) throw limit;
			}
			if (!continues) throw requestError(error);
			return [failedRequestItem(error, version, false, parameters.timeoutMs)];
		}
		const sendsCredentials =
			parameters.sendCredentialsOnCrossOriginRedirect ?? (version >= 3 && version < 4.4);
		// The v1 node follows redirects (axios, at most 21). 303 changes the method to GET;
		// 307 and 308 keep the method and the body.
		let url = parameters.url;
		let current = method;
		const limit = parameters.redirects ?? 21;
		for (let hop = 0; hop < limit; hop++) {
			const status = response.status;
			const location = response.headers.location;
			if (![301, 302, 303, 307, 308].includes(status) || typeof location !== 'string') break;
			// The answers for the host are kept only on the paths of a redirect and of a stored
			// file, so a request without them costs nothing more.
			if (stores && current === 'GET' && parameters.replay !== undefined) {
				keepAnswer(parameters.replay, url, hop === 0 ? (parameters.qs ?? {}) : {}, response);
			}
			url = resolveUrl(url, location);
			const keep = status === 307 || status === 308;
			const before = current;
			current = keep ? current : status === 303 || current !== 'HEAD' ? 'GET' : current;
			// The v1 node sends what authenticates the request to another origin only when
			// `sendCredentialsOnCrossOriginRedirect` is set; versions 3 to 4.3 set it by default.
			// The credential stays in the request for its allowed domains.
			const authenticates = sendsCredentials || sameOrigin(parameters.url, url);
			const downgraded = current === 'GET' && before !== 'GET';
			let headers = authenticates ? sent.headers : withoutAuthentication(sent.headers);
			if (downgraded) headers = withoutContent(headers);
			try {
				response = await ctx.http<unknown>({
					method: current,
					url,
					headers,
					qs: {},
					body: keep ? sent.body : undefined,
					multipart: keep ? sent.multipart : undefined,
					credential,
					inject: authenticates ? 'redirect' : 'redirectOtherOrigin',
					tokenExpiredStatusCode,
					allowedDomains: true,
					followRedirects: false,
					timeoutMs: parameters.timeoutMs,
					responseBinary,
				});
			} catch (error) {
				if (stores) {
					const tooLarge = fileLimitError(error);
					// oxlint-disable-next-line typescript/only-throw-error
					if (tooLarge !== undefined) throw tooLarge;
				}
				if (!continues) throw requestError(error);
				return [failedRequestItem(error, version, true, parameters.timeoutMs)];
			}
		}
		const status = response.status;
		if (status >= 300 && status < 400) {
			// A redirect that the node does not follow. After the largest number of redirects,
			// v1 fails with the error of its HTTP client, also with "never error".
			if (limit > 0 && typeof response.headers.location === 'string') {
				const message = 'Maximum number of redirects exceeded';
				if (continues) {
					const item: Item = {
						error: {
							message,
							name: 'Error [ERR_FR_TOO_MANY_REDIRECTS]',
							code: 'ERR_FR_TOO_MANY_REDIRECTS',
						},
					};
					if (version >= 4.5) {
						item.details = {
							message,
							httpCode: 'ERR_FR_TOO_MANY_REDIRECTS',
							body: null,
							context: { itemIndex: 0 },
						};
					}
					return [item];
				}
				// oxlint-disable-next-line typescript/only-throw-error
				throw {
					name: 'NodeApiError',
					message,
					description: '',
					httpCode: 'ERR_FR_TOO_MANY_REDIRECTS',
				};
			}
			// Each other status from 300 to 399 is an error of v1: n8n has no text for it, so
			// the message is the message of the HTTP client.
			if (options.neverError !== true) {
				const message = `${status} - ${JSON.stringify(bodyText(response.body))}`;
				const description = errorDescription(response.body);
				if (continues) {
					const item: Item = {
						error: { message, name: 'AxiosError', code: 'ERR_BAD_RESPONSE', status },
					};
					if (version >= 4.5) {
						const details: Item = {
							message,
							httpCode: String(status),
							body: response.body,
							context: { itemIndex: 0 },
						};
						if (description !== undefined) details.description = description;
						item.details = details;
					}
					return [item];
				}
				// oxlint-disable-next-line typescript/only-throw-error
				throw {
					name: 'NodeApiError',
					message,
					description: description ?? '',
					httpCode: String(status),
				};
			}
		}
		if (status >= 400 && options.neverError !== true) {
			if (continues) {
				const message = `${status} - ${JSON.stringify(bodyText(response.body))}`;
				// With the response format "file" the error of v1's HTTP client has no body.
				const reason = !stores
					? requestReason(status, message, response.body)
					: {
							name: 'AxiosError',
							message,
							code: status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
							status,
						};
				return [requestFailureItem(reason, status, response.body, version)];
			}
			// n8n's NodeApiError: the message and the description are separate fields.
			const description = errorDescription(response.body);
			// The workflow library has no Error subclasses or Object.assign: a plain error object.
			// oxlint-disable-next-line typescript/only-throw-error
			throw {
				name: 'NodeApiError',
				message: apiErrorMessage(status),
				description: description ?? '',
				httpCode: String(status),
			};
		}
		// The node reads the content type as the runtime does: a JSON body with the key
		// `$binary` is never taken for a stored file.
		if (detects && (status < 300 || anyStatus) && storesType(response.headers['content-type'])) {
			return [fileItem(response, items?.[0], options, url)];
		}
		if (stores && status < 300) {
			// The query is in the first request only. A redirect to the first URL itself gives an
			// entry that answers no request of the v1 node: the v1 node then sends that request.
			if (parameters.replay !== undefined && current === 'GET') {
				const first = url === parameters.url;
				keepAnswer(parameters.replay, url, first ? (parameters.qs ?? {}) : {}, response);
			}
			return [fileItem(response, items?.[0], options, url)];
		}
		return responseItems(response.body, response.headers, status, options, version);
	},
});

/** The errors of n8n for a credential whose allowed domains refuse each request of the node. */
const DOMAIN_SETTING_ERRORS = [
	'This credential is configured to prevent use within an HTTP Request or GraphQL node',
	'No allowed domains specified. Configure allowed domains or change restriction setting.',
];

/**
 * The item of the v1 node for a request that the allowed domains of the credential refuse.
 * The v1 node gives the message for an error of the setting, the fields of the error that
 * its request helper throws for the first URL, and the error of the redirect for a later URL
 * (its stack is not given).
 */
function refusedDomainItem(message: string, redirected: boolean): Item | undefined {
	if (DOMAIN_SETTING_ERRORS.includes(message)) return { error: message };
	if (!message.startsWith('Domain not allowed: ')) return undefined;
	if (redirected) {
		return {
			error: {
				message: `Redirected request failed: ${message}`,
				name: 'Error [ERR_FR_REDIRECTION_FAILURE]',
			},
		};
	}
	return {
		error: {
			name: 'UserError',
			level: 'info',
			shouldReport: false,
			tags: { packageName: 'workflow' },
		},
	};
}

/** The end of the error of the runtime for a body over the largest size of a stored file. */
const FILE_LIMIT = '(limit: binary-max-file)';

/**
 * The error of the largest size of a stored file with the mark for the converted workflow:
 * the node sent only GET requests, so the fallback host can run the v1 node (which has no such
 * limit). Undefined for another error.
 */
function fileLimitError(error: unknown): unknown {
	const message =
		typeof error === 'object' && error !== null && 'message' in error
			? String(error.message)
			: String(error);
	if (!message.endsWith(FILE_LIMIT)) return undefined;
	return {
		name: 'Error',
		message: `${message} (no request to repeat: the fallback host runs the node)`,
	};
}

/** The path of a URL (`new URL(url).pathname`), or undefined for text that is not a URL. */
function urlPath(url: string): string | undefined {
	const scheme = url.indexOf('://');
	if (scheme < 0) return undefined;
	let end = url.length;
	for (const mark of ['?', '#']) {
		const at = url.indexOf(mark, scheme + 3);
		if (at >= 0 && at < end) end = at;
	}
	const slash = url.indexOf('/', scheme + 3);
	return slash < 0 || slash >= end ? '/' : url.slice(slash, end);
}

/**
 * The item of a response that the runtime stored as a file (`responseFormat: file`), as the
 * v1 node makes it: the JSON of the input item (or the parts of the full response), and the
 * binary data of the input item with the file under the output name.
 */
function fileItem(
	response: HttpResponse<unknown>,
	input: Item | undefined,
	options: ResponseOptions,
	url: string,
): Item {
	const body = response.body;
	const stored = isRecord(body) && isRecord(body.$binary) ? body.$binary : {};
	const file: Record<string, unknown> = { ...stored };
	// `setFilename` of the v1 node, for a file without a name.
	const extension = file.fileExtension;
	if (!file.fileName && typeof extension === 'string' && extension !== '') {
		const path = urlPath(url);
		file.fileName =
			path !== undefined && path.endsWith(extension)
				? path.split('/').pop()
				: `${options.outputPropertyName ?? 'data'}.${extension}`;
	}
	const item: Item = {};
	const binary: Record<string, unknown> = {};
	if (input !== undefined) {
		for (const key of Object.keys(input)) {
			if (key !== '$binary') {
				if (options.fullResponse !== true) item[key] = input[key];
			} else if (isRecord(input.$binary)) {
				for (const name of Object.keys(input.$binary)) binary[name] = input.$binary[name];
			}
		}
	}
	if (options.fullResponse === true) {
		item.headers = response.headers;
		item.statusCode = response.status;
		item.statusMessage = reasonPhrase(response.status);
	}
	binary[options.outputPropertyName ?? 'data'] = file;
	item.$binary = binary;
	return item;
}

/** The message of n8n for a request that reached its time limit (`ECONNABORTED`). */
const TIMEOUT_MESSAGE = 'The connection was aborted, perhaps the server is offline';

/** True for the error of the runtime for a request that reached its time limit (spec 7.1). */
function timedOut(message: string): boolean {
	return message.indexOf('the request timed out after') >= 0;
}

/** The error of a failed request as the v1 node throws it. */
function requestError(error: unknown): unknown {
	const message =
		typeof error === 'object' && error !== null && 'message' in error
			? String(error.message)
			: String(error);
	if (!timedOut(message)) return error;
	return {
		name: 'NodeApiError',
		message: TIMEOUT_MESSAGE,
		description: '',
		httpCode: 'ECONNABORTED',
	};
}

/** The item of a request that the runtime reports as a failure (`ctx.http` throws). */
function failedRequestItem(
	error: unknown,
	version: number,
	redirected = false,
	timeoutMs?: number,
): Item {
	const message =
		typeof error === 'object' && error !== null && 'message' in error
			? String(error.message)
			: String(error);
	if (timedOut(message)) {
		// The error of v1's HTTP client for a request that reached its time limit.
		const item: Item = {
			error: {
				message: `timeout of ${timeoutMs ?? 300000}ms exceeded`,
				name: 'AxiosError',
				code: 'ECONNABORTED',
			},
		};
		if (version >= 4.5) {
			item.details = {
				message: TIMEOUT_MESSAGE,
				httpCode: 'ECONNABORTED',
				body: null,
				context: { itemIndex: 0 },
			};
		}
		return item;
	}
	const refused = refusedDomainItem(message, redirected);
	if (refused !== undefined) return refused;
	const status = failureStatus(message);
	return requestFailureItem(requestReason(status, message), status, undefined, version);
}
