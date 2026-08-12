import { describe, expect, it, vi } from 'vitest';

import {
	currentPageId,
	findPagedNode,
	matchPath,
	normalisePath,
	pageInfos,
	pageLabel,
	pageNodes,
	resolveRoute,
} from './pages';
import type { UiNode, UiPageInfo } from './types';

function page(id: string, path: string, title = ''): UiNode {
	return { id, type: 'page', props: { path, title }, tree: {} };
}

function frame(pages: UiNode[], props: Record<string, unknown> = {}): UiNode {
	return {
		id: 'frame-1',
		type: 'frame',
		props,
		tree: { header: [{ id: 'text-1', type: 'text', props: {}, tree: {} }], default: pages },
	};
}

const HOME = page('page-1', '/', 'Home');
const ORDERS = page('page-2', '/orders', 'Orders');
const ORDER = page('page-3', '/orders/:id', 'One order');

describe('normalisePath', () => {
	it('adds the leading slash a path was written without', () => {
		expect(normalisePath('orders')).toBe('/orders');
	});

	it('strips a trailing slash so one page is not two', () => {
		expect(normalisePath('/orders/')).toBe('/orders');
	});

	it('reads the empty path as the root', () => {
		expect(normalisePath('')).toBe('/');
	});

	it('reads a lone slash as the root', () => {
		expect(normalisePath('/')).toBe('/');
	});
});

describe('matchPath', () => {
	it('matches a path against its own pattern', () => {
		expect(matchPath('/orders', '/orders')).toEqual({});
	});

	it('does not match a different path', () => {
		expect(matchPath('/orders', '/settings')).toBeUndefined();
	});

	it('captures a named parameter', () => {
		expect(matchPath('/orders/:id', '/orders/42')).toEqual({ id: '42' });
	});

	it('decodes a percent-encoded parameter', () => {
		expect(matchPath('/orders/:id', '/orders/a%20b')).toEqual({ id: 'a b' });
	});

	it('takes a malformed percent-escape as written rather than throwing', () => {
		expect(matchPath('/orders/:id', '/orders/100%')).toEqual({ id: '100%' });
	});

	it('does not match when the paths have different numbers of segments', () => {
		expect(matchPath('/orders/:id', '/orders')).toBeUndefined();
		expect(matchPath('/orders', '/orders/42')).toBeUndefined();
	});
});

describe('pageInfos', () => {
	it('normalises each page path on the way out', () => {
		expect(pageInfos(frame([page('page-1', 'orders/')]))).toEqual([
			{ id: 'page-1', path: '/orders', title: '' },
		]);
	});

	it("keeps an untitled page's title empty rather than inventing one", () => {
		const [info] = pageInfos(frame([page('page-1', '/orders')]));

		expect(info.title).toBe('');
	});

	it('ignores whatever else the frame holds outside its paged region', () => {
		expect(pageInfos(frame([ORDERS]))).toHaveLength(1);
	});
});

describe('pageNodes', () => {
	it('finds no pages in a node that holds none', () => {
		expect(pageNodes({ id: 'stack-1', type: 'stack', props: {}, tree: {} })).toEqual([]);
	});
});

describe('pageLabel', () => {
	it('calls a page by its title', () => {
		expect(pageLabel({ id: 'page-1', path: '/orders', title: 'Orders' })).toBe('Orders');
	});

	it('falls back to the path when a page has no title', () => {
		expect(pageLabel({ id: 'page-1', path: '/orders', title: '' })).toBe('/orders');
	});
});

describe('resolveRoute', () => {
	const pages: UiPageInfo[] = pageInfos(frame([HOME, ORDERS, ORDER]));

	it('resolves an exact route to its page', () => {
		expect(resolveRoute(pages, '/orders')).toEqual({
			path: '/orders',
			params: {},
			pageId: 'page-2',
		});
	});

	it('resolves a parameterised route and hands back the parameter', () => {
		expect(resolveRoute(pages, '/orders/42')).toEqual({
			path: '/orders/42',
			params: { id: '42' },
			pageId: 'page-3',
		});
	});

	it('falls back to the default page when no page answers the route', () => {
		expect(resolveRoute(pages, '/nowhere', '/orders')).toEqual({
			path: '/orders',
			params: {},
			pageId: 'page-2',
		});
	});

	it('falls back to the first page when no default page is set', () => {
		expect(resolveRoute(pageInfos(frame([ORDERS, HOME])), '/nowhere')?.pageId).toBe('page-2');
	});

	it('resolves nothing when there are no pages at all', () => {
		expect(resolveRoute([], '/orders')).toBeUndefined();
	});

	it('says the default page is gone rather than that none was set', () => {
		// No page answers `/` here, so the empty route has to fall back, which is
		// the only situation in which the default page is consulted at all.
		const homeless = pageInfos(frame([ORDERS, ORDER]));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		resolveRoute(homeless, '/', '/deleted');

		expect(warn).toHaveBeenCalledWith(
			'[ui-builder] the default page',
			'/deleted',
			'is gone, opening',
			'/orders',
		);

		warn.mockRestore();
	});

	it('says nothing when an empty route lands on the default page', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		resolveRoute(pages, '/', '/');

		expect(warn).not.toHaveBeenCalled();

		warn.mockRestore();
	});
});

describe('currentPageId', () => {
	it('shows the page the route names', () => {
		const node = frame([HOME, ORDERS]);

		expect(currentPageId(node, { path: '/orders', params: {}, pageId: 'page-2' })).toBe('page-2');
	});

	it('falls back to the path when the route names a page that has since gone', () => {
		const node = frame([HOME, ORDERS]);

		expect(currentPageId(node, { path: '/orders', params: {}, pageId: 'page-9' })).toBe('page-2');
	});

	it('falls back to the default page when there is no route yet', () => {
		const node = frame([HOME, ORDERS], { defaultPage: '/orders' });

		expect(currentPageId(node, undefined)).toBe('page-2');
	});

	it('falls back to the first page when there is neither a route nor a default', () => {
		const node = frame([ORDERS, ORDER]);

		expect(currentPageId(node, undefined)).toBe('page-2');
	});

	it('shows nothing when the frame holds no pages', () => {
		expect(currentPageId(frame([]), undefined)).toBeUndefined();
	});
});

describe('findPagedNode', () => {
	it('finds the frame when the frame is the root', () => {
		const node = frame([HOME]);

		expect(findPagedNode(node)).toBe(node);
	});

	it('finds a frame nested inside the document', () => {
		const inner = frame([HOME]);
		const root: UiNode = {
			id: 'page',
			type: 'page',
			props: {},
			tree: { default: [{ id: 'stack-1', type: 'stack', props: {}, tree: { default: [inner] } }] },
		};

		expect(findPagedNode(root)).toBe(inner);
	});

	it('finds nothing in a document with no frame', () => {
		const root: UiNode = { id: 'page', type: 'page', props: {}, tree: {} };

		expect(findPagedNode(root)).toBeUndefined();
	});
});
