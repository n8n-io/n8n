import {
	defineAction,
	defineNode,
	int,
	isRecord,
	json,
	obj,
	oneOf,
	paginate,
	record,
	str,
	variant,
} from '@n8n/node-sdk';

export const httpRequest = defineNode({
	id: 'httpRequest',
	displayName: 'HTTP Request',
	credentials: ['httpHeaderAuth', 'httpBearerAuth', 'httpBasicAuth', 'httpQueryAuth', 'oAuth2Api'],
	authOptional: true,
});

/** An array body becomes one item per element; any other body becomes one item. */
function toItems(body: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(body)) return body.map((entry) => (isRecord(entry) ? entry : { data: entry }));
	return [isRecord(body) ? body : { data: body }];
}

/** Same page limit as the legacy HTTP Request node. */
const MAX_PAGES = 100;

/** An empty, null, or missing cursor ends pagination. */
function cursorAt(body: unknown, path: string): string | undefined {
	const value = path
		.split('.')
		.reduce<unknown>((node, key) => (isRecord(node) ? node[key] : undefined), body);
	return typeof value === 'string' || typeof value === 'number'
		? String(value) || undefined
		: undefined;
}

const common = {
	url: str().hint('Full URL; never URL-encode an expression'),
	query: record(str()).hint('Never put secrets here; attach a credential').optional(),
	headers: record(str()).hint('Never put secrets here; attach a credential').optional(),
};

export const getRequest = defineAction({
	node: httpRequest,
	id: 'httpRequest.get',
	patch: 2,
	action: 'GET a URL',
	summary: 'Read from any HTTP API. Use a dedicated action when one exists for the service.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input: {
		...common,
		pagination: obj({
			cursorPath: str().hint('Dot path to the next cursor in the response body, e.g. next_cursor'),
			queryParameter: str().hint('Query parameter that sends the cursor, e.g. cursor'),
			maxPages: int().with({ minimum: 1 }).default(MAX_PAGES),
		})
			.hint('Cursor pagination; each page emits items; stops on a null or empty cursor')
			.optional(),
	},
	output: json().hint('The parsed response body; an array body emits one item per element'),
	async run({ input, http, emit }) {
		const { pagination } = input;
		const items = paginate(http, {
			request: (cursor) => ({
				method: 'GET',
				url: input.url,
				query:
					pagination && cursor !== undefined
						? { ...input.query, [pagination.queryParameter]: cursor }
						: input.query,
				headers: input.headers,
			}),
			items: toItems,
			next: (body) => (pagination ? cursorAt(body, pagination.cursorPath) : undefined),
			maxPages: pagination?.maxPages ?? MAX_PAGES,
		});
		for await (const item of items) emit(item);
	},
});

export const sendRequest = defineAction({
	node: httpRequest,
	id: 'httpRequest.send',
	patch: 2,
	action: 'Send a request',
	summary: 'POST, PUT, PATCH, or DELETE to any HTTP API.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	input: {
		method: oneOf('POST', 'PUT', 'PATCH', 'DELETE'),
		...common,
		body: variant('kind', {
			json: { json: json().hint('A JSON object; build it in one lambda, never as a string') },
			form: { fields: record(str()) },
			text: { text: str(), contentType: str().hint('e.g. text/plain') },
		}).optional(),
	},
	output: json().hint('The parsed response body'),
	async run({ input, http, emit }) {
		const { body } = input;
		const headers =
			body?.kind === 'form'
				? { 'content-type': 'application/x-www-form-urlencoded', ...input.headers }
				: body?.kind === 'text'
					? { 'content-type': body.contentType, ...input.headers }
					: input.headers;
		const payload =
			body?.kind === 'json'
				? body.json
				: body?.kind === 'form'
					? new URLSearchParams(body.fields).toString()
					: body?.text;
		const response = await http.request({
			method: input.method,
			url: input.url,
			query: input.query,
			headers,
			body: payload,
		});
		toItems(response ?? {}).forEach(emit);
	},
});
