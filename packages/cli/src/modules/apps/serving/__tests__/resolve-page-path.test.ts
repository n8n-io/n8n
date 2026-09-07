import { resolvePagePath, type PageNode } from '../resolve-page-path';

const page = (id: string, route: string, parentPageId: string | null = null): PageNode => ({
	id,
	route,
	parentPageId,
});

describe('resolvePagePath', () => {
	const index = page('index', '');
	const clients = page('clients', 'clients');
	const clientDetail = page('client-detail', ':id', 'clients');
	const clientOrders = page('client-orders', 'orders', 'client-detail');
	const newClient = page('new-client', 'new', 'clients');
	const pages = [index, clients, clientDetail, clientOrders, newClient];

	test('resolves an empty path to the index page', () => {
		expect(resolvePagePath(pages, [])).toEqual({ page: index, params: {} });
	});

	test('resolves a static path', () => {
		expect(resolvePagePath(pages, ['clients'])).toEqual({ page: clients, params: {} });
	});

	test('captures a dynamic segment', () => {
		expect(resolvePagePath(pages, ['clients', '42'])).toEqual({
			page: clientDetail,
			params: { id: '42' },
		});
	});

	test('keeps captured params while walking past a dynamic segment', () => {
		expect(resolvePagePath(pages, ['clients', '42', 'orders'])).toEqual({
			page: clientOrders,
			params: { id: '42' },
		});
	});

	test('prefers a static sibling over a dynamic one', () => {
		expect(resolvePagePath(pages, ['clients', 'new'])).toEqual({ page: newClient, params: {} });
	});

	test('resolves the same way whatever order the pages arrive in', () => {
		expect(resolvePagePath([...pages].reverse(), ['clients', 'new'])).toEqual({
			page: newClient,
			params: {},
		});
	});

	test('picks dynamic siblings deterministically', () => {
		const byId = page('by-id', ':id', 'clients');
		const bySlug = page('by-slug', ':slug', 'clients');

		expect(resolvePagePath([clients, byId, bySlug], ['clients', 'x'])).toEqual({
			page: byId,
			params: { id: 'x' },
		});
		expect(resolvePagePath([clients, bySlug, byId], ['clients', 'x'])).toEqual({
			page: byId,
			params: { id: 'x' },
		});
	});

	test('does not resolve an unknown path', () => {
		expect(resolvePagePath(pages, ['unknown'])).toBeUndefined();
		expect(resolvePagePath(pages, ['clients', '42', 'unknown'])).toBeUndefined();
	});

	test('does not resolve a path longer than the tree', () => {
		expect(resolvePagePath(pages, ['clients', '42', 'orders', 'deeper'])).toBeUndefined();
	});

	test('never reaches an index page through a segment', () => {
		expect(resolvePagePath(pages, [''])).toBeUndefined();
	});

	test('resolves nothing when the app has no index page', () => {
		expect(resolvePagePath([clients], [])).toBeUndefined();
	});

	test('rejects traversal and empty segments', () => {
		expect(resolvePagePath(pages, ['..'])).toBeUndefined();
		expect(resolvePagePath(pages, ['clients', '..'])).toBeUndefined();
		expect(resolvePagePath(pages, ['.'])).toBeUndefined();
		expect(resolvePagePath(pages, ['clients', '4/2'])).toBeUndefined();
	});

	test('captures a dynamic segment that looks like a param name', () => {
		expect(resolvePagePath(pages, ['clients', ':id'])).toEqual({
			page: clientDetail,
			params: { id: ':id' },
		});
	});
});
