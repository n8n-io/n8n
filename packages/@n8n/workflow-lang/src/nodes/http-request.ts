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
import { defineNode, type Item } from '@n8n/workflow-lang';

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
	 * Pagination: the request parameters of one page, merged into the request
	 * as v1 does (lodash `merge`). The node then never fails on the status and
	 * gives one item `{ response: { body, headers, statusCode }, items }`. The
	 * converter writes the page loop around it.
	 */
	page?: PageRequest;
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

/** The headers and body of the request: a file body has the MIME type of the file. */
function requestParts(p: HttpRequestParameters): {
	headers: Record<string, string>;
	body: unknown;
	multipart?: Part[];
} {
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
	async run(ctx, parameters, _items, credential) {
		const method = parameters.method ?? 'GET';
		const options = parameters.response ?? {};
		const version = parameters.version ?? 4;
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
				headers: textValues(headers),
				qs: query,
				body,
				credential,
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
		const sent = requestParts(parameters);
		let response = await ctx.http<unknown>({
			method,
			url: parameters.url,
			headers: sent.headers,
			qs: parameters.qs ?? {},
			body: sent.body,
			multipart: sent.multipart,
			credential,
		});
		// The v1 node follows redirects (axios, at most 21). 303 changes the method to GET;
		// 307 and 308 keep the method and the body.
		let url = parameters.url;
		let current = method;
		for (let hop = 0; hop < 21; hop++) {
			const status = response.status;
			const location = response.headers.location;
			if (![301, 302, 303, 307, 308].includes(status) || typeof location !== 'string') break;
			url = resolveUrl(url, location);
			const keep = status === 307 || status === 308;
			current = keep ? current : status === 303 || current !== 'HEAD' ? 'GET' : current;
			response = await ctx.http<unknown>({
				method: current,
				url,
				headers: sent.headers,
				qs: {},
				body: keep ? sent.body : undefined,
				multipart: keep ? sent.multipart : undefined,
				credential,
			});
		}
		const status = response.status;
		if (status >= 400 && options.neverError !== true) {
			if (parameters.errorItems === true) {
				const error: Item = {
					message: `${status} - ${JSON.stringify(bodyText(response.body))}`,
					name: 'AxiosError',
					status,
					statusCode: status,
					error: bodyText(response.body),
				};
				if (version < 4.5) return [{ error }];
				const details: Item = {
					message: apiErrorMessage(status),
					httpCode: String(status),
					body: response.body,
					context: { itemIndex: 0 },
				};
				const description = errorDescription(response.body);
				if (description !== undefined) details.description = description;
				return [{ error, details }];
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
		return responseItems(response.body, response.headers, status, options, version);
	},
});
