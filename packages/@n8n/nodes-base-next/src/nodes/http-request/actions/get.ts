import {
	isRecord,
	nextLinkOf,
	nextOffsetOf,
	pages,
	pageValueOf,
	t,
	type HttpRequest,
	type ResponsePage,
} from '@n8n/node-sdk';

import { httpRequest } from '../http-request.node';
import { common, toItems } from '../request';

/** A parameter name: a fixed value, as the request needs it before any page. */
const name = t.str().with({ minLength: 1, 'x-n8n-literal': true });

/** Where the next request sends the cursor or the page number. */
const send = t
	.union(t.obj({ query: name }), t.obj({ header: name }))
	.hint('e.g. { query: "cursor" }; the first request sends none');

/** The fields of every page style. */
const each = {
	more: t
		.pageValue(t.bool())
		.hint('false ends the list, e.g. (page) => page.body.has_more')
		.optional(),
	// Same page limit as the legacy HTTP Request node.
	maxPages: t.int().with({ minimum: 1, 'x-n8n-literal': true }).default(100),
};

const pagesInput = t
	.variant('style', {
		cursor: {
			next: t
				.pageValue(t.nullable(t.union(t.str(), t.num())))
				.hint('The next cursor, e.g. (page) => page.body.next_cursor; empty ends the list'),
			send,
			...each,
		},
		link: {
			next: t
				.pageValue(t.nullable(t.str()))
				.hint('The next URL, e.g. (page) => page.body.next; else the Link header')
				.optional(),
			...each,
		},
		offset: {
			send,
			unit: t
				.oneOf('item', 'page')
				.hint('item: send the count of items so far; page: the page number'),
			start: t
				.int()
				.with({ 'x-n8n-literal': true })
				.hint('The number of the first page; 1 when not set')
				.optional(),
			size: t
				.int()
				.with({ minimum: 1, 'x-n8n-literal': true })
				.hint('Items per page; a shorter page ends the list. Also set the page size in query')
				.optional(),
			...each,
		},
	})
	.hint('Each page emits its items; an empty page ends an offset list');

/** v2 read the cursor at a dot path of the body: `meta.next` is `$response.body.meta.next`. */
const bodyPathOf = (path: string) =>
	path
		.split('.')
		.map((key) => (/^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`))
		.join('');

/** The page of a full response. A header with more values joins them, as `fetch` does. */
const responsePageOf = (response: unknown): ResponsePage => {
	const full = isRecord(response) ? response : {};
	const headers = isRecord(full.headers) ? full.headers : {};
	return {
		body: full.body,
		headers: Object.fromEntries(
			Object.entries(headers).map(([key, value]) => [
				key.toLowerCase(),
				Array.isArray(value) ? value.join(', ') : String(value),
			]),
		),
		statusCode: typeof full.statusCode === 'number' ? full.statusCode : 0,
	};
};

export const getRequest = httpRequest.action('get', {
	// Major 2: the action declares that it reaches the host of `url`.
	// Major 3: cursor, link and offset pages, with page values read from each response.
	version: 3,
	action: 'GET a URL',
	summary: 'Read from any HTTP API. Use a dedicated action when one exists for the service.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	egress: { fromInput: 'url' },
	input: {
		...common,
		items: t
			.pageValue(t.arr(t.jsonValue()))
			.hint('The items of a page, e.g. (page) => page.body.data; else the body')
			.optional(),
		pages: pagesInput.optional(),
	},
	output: t.json().hint('One item per page item; an array body emits one item per element'),
	migrate: (fromMajor, params) => {
		const { pagination, ...rest } = params;
		if (fromMajor !== 2 || !isRecord(pagination)) return rest;
		const { cursorPath, queryParameter, maxPages } = pagination;
		return {
			...rest,
			pages: {
				style: 'cursor',
				next: `={{ $response.body${bodyPathOf(String(cursorPath))} }}`,
				send: { query: queryParameter },
				...(maxPages === undefined ? {} : { maxPages }),
			},
		};
	},
	async *run({ input, http }) {
		const { pages: paged, items: itemsAt } = input;
		const first: HttpRequest = {
			method: 'GET',
			url: input.url,
			query: input.query,
			headers: input.headers,
		};
		// One request, as before pages existed: its body is the page.
		if (!paged && !itemsAt) {
			yield* toItems(await http.request(first));
			return;
		}
		const itemsOf = (page: ResponsePage) => {
			if (!itemsAt) return toItems(page.body);
			const found = pageValueOf(itemsAt, page);
			if (!Array.isArray(found)) throw new Error(`input.items gives no list: ${itemsAt}`);
			return toItems(found);
		};
		const withCursor = (cursor: string): HttpRequest => {
			if (paged?.style === 'link')
				return { url: new URL(cursor, input.url).href, headers: input.headers };
			const at = paged && 'send' in paged ? paged.send : undefined;
			if (at && 'header' in at)
				return { ...first, headers: { ...input.headers, [at.header]: cursor } };
			return at ? { ...first, query: { ...input.query, [at.query]: cursor } } : first;
		};
		const nextOf = (page: ResponsePage, items: readonly unknown[], cursor: string | undefined) => {
			if (!paged || (paged.more !== undefined && !pageValueOf(paged.more, page))) return undefined;
			if (paged.style === 'cursor') {
				const next = pageValueOf(paged.next, page);
				return typeof next === 'string' || typeof next === 'number' ? next : undefined;
			}
			if (paged.style === 'link') {
				const next =
					paged.next === undefined
						? nextLinkOf(page.headers.link, input.url)
						: pageValueOf(paged.next, page);
				return typeof next === 'string' ? next : undefined;
			}
			const { unit, size, start } = paged;
			return nextOffsetOf(unit, { count: items.length, size, cursor, start });
		};
		yield* pages(http, {
			page: responsePageOf,
			request: (cursor) => ({
				...(cursor === undefined ? first : withCursor(cursor)),
				fullResponse: true,
			}),
			items: itemsOf,
			next: (page, { items, cursor }) => nextOf(page, items, cursor),
			maxPages: paged?.maxPages ?? 1,
		});
	},
});
