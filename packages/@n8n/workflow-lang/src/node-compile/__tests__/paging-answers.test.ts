import { describe, expect, it } from 'vitest';

import { NEXT_PAGE, lastPagesOf, loopPaths, nextPageOf } from './paging-answers.ts';

describe('the answers that end the paging of a node', () => {
	it('reads the members of the answer in the condition of a loop', () => {
		const source = `
			do {
				responseData = await __request(options);
				returnData.push(...responseData.results);
			} while (responseData.has_more !== false);
		`;
		expect(loopPaths(source)).toEqual([['has_more']]);
	});

	it('follows a name of the condition to the member that gives its value', () => {
		const source = `
			let cursor;
			while (cursor !== undefined) {
				const response = await __request(options);
				cursor = response.paging.next;
			}
			for (let k = 0; k < response.items.length; k++) {}
		`;
		expect(loopPaths(source)).toEqual([['items'], ['paging', 'next']]);
	});

	it('reads a name that a pattern takes from the answer', () => {
		const source = `
			do {
				const { next_cursor } = responseData;
				token = next_cursor;
			} while (next_cursor);
		`;
		expect(loopPaths(source)).toEqual([['next_cursor']]);
	});

	it('makes last pages that set, remove or empty the members', () => {
		const body = { ok: true, data: [{ id: 'r1' }] };
		const pages = lastPagesOf(body, [['has_more'], ['paging', 'next']]);
		expect(pages[0]).toEqual({ ...body, has_more: false, paging: { next: false } });
		expect(pages).toContainEqual({ ...body, has_more: null, paging: { next: null } });
		expect(pages).toContainEqual(body);
		expect(pages).toContainEqual({ ok: true, data: [] });
		expect(pages.at(-1)).toEqual([]);
		expect(new Set(pages.map((page) => JSON.stringify(page))).size).toBe(pages.length);
	});

	it('makes a next page that keeps the lists of the answer', () => {
		const body = { data: [{ id: 'r1' }], total: 1 };
		expect(nextPageOf(body, [['data'], ['total'], ['meta', 'next']])).toEqual({
			data: [{ id: 'r1' }],
			total: NEXT_PAGE,
			meta: { next: NEXT_PAGE },
		});
	});
});
