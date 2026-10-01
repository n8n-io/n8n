import { int, isRecord, json, obj, paginate, str } from '@n8n/node-sdk';

import { httpRequest } from '../http-request.node';
import { common, toItems } from '../request';

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

export const getRequest = httpRequest.action('get', {
	patch: 3,
	action: 'GET a URL',
	summary: 'Read from any HTTP API. Use a dedicated action when one exists for the service.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
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
	async *run({ input, http }) {
		const { pagination } = input;
		yield* paginate(http, {
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
	},
});
