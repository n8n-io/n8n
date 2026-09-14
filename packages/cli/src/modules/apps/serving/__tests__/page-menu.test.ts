import { buildMenu, pagePath, pageTitle, type MenuItem } from '../page-menu';
import type { PageNode } from '../resolve-page-path';

const page = (
	id: string,
	route: string,
	parentPageId: string | null = null,
	title: string | null = null,
): PageNode => ({ id, route, parentPageId, title });

describe('pagePath', () => {
	test('joins an App base path with segments', () => {
		expect(pagePath('acme', [])).toBe('/apps/acme');
		expect(pagePath('acme', ['clients', '42'])).toBe('/apps/acme/clients/42');
	});
});

describe('pageTitle', () => {
	test('names an index page without a title after its role', () => {
		expect(pageTitle(page('index', ''), {})).toBe('Home');
	});

	test('names a static page without a title after its route', () => {
		expect(pageTitle(page('clients', 'clients'), {})).toBe('clients');
	});

	test('names a dynamic page without a title after the value the URL captured', () => {
		expect(pageTitle(page('detail', ':id'), { id: '42' })).toBe('42');
	});

	test('cannot name a dynamic page with no title and no captured value', () => {
		expect(pageTitle(page('detail', ':id'), {})).toBeUndefined();
	});

	test('names a page after its title over its route, whatever the route', () => {
		expect(pageTitle(page('index', '', null, 'Overview'), {})).toBe('Overview');
		expect(pageTitle(page('clients', 'clients', null, 'Clients'), {})).toBe('Clients');
		expect(pageTitle(page('detail', ':id', null, 'Client'), { id: '42' })).toBe('Client');
		expect(pageTitle(page('detail', ':id', null, 'Client'), {})).toBe('Client');
	});
});

describe('buildMenu', () => {
	const index = page('index', '');
	const clients = page('clients', 'clients');
	const clientDetail = page('client-detail', ':id', 'clients');
	const clientOrders = page('client-orders', 'orders', 'client-detail');
	const pages = [clients, index, clientDetail, clientOrders];

	const flatten = (items: MenuItem[]): string[] =>
		items.flatMap((item) => [item.path, ...flatten(item.children)]);

	test('lists the index page first, titled Home', () => {
		const menu = buildMenu('acme', pages, 'index', {});

		expect(menu[0]).toEqual({
			title: 'Home',
			path: '/apps/acme',
			current: true,
			children: [],
		});
	});

	test('nests children under their parent', () => {
		const menu = buildMenu('acme', pages, 'clients', { id: '42' });

		expect(menu).toEqual([
			{ title: 'Home', path: '/apps/acme', current: false, children: [] },
			{
				title: 'clients',
				path: '/apps/acme/clients',
				current: true,
				children: [
					{
						title: '42',
						path: '/apps/acme/clients/42',
						current: false,
						children: [
							{
								title: 'orders',
								path: '/apps/acme/clients/42/orders',
								current: false,
								children: [],
							},
						],
					},
				],
			},
		]);
	});

	test('leaves out a page behind an unresolved param, and everything under it', () => {
		const menu = buildMenu('acme', pages, 'clients', {});

		expect(flatten(menu)).toEqual(['/apps/acme', '/apps/acme/clients']);
	});

	test('marks the current page and nothing else', () => {
		const menu = buildMenu('acme', pages, 'client-orders', { id: '42' });
		const current = (items: MenuItem[]): MenuItem[] =>
			items.flatMap((item) => (item.current ? [item] : current(item.children)));

		expect(current(menu).map((item) => item.path)).toEqual(['/apps/acme/clients/42/orders']);
	});

	test('orders siblings the same way whatever order the pages arrive in', () => {
		const forward = buildMenu('acme', pages, 'index', { id: '1' });
		const reversed = buildMenu('acme', [...pages].reverse(), 'index', { id: '1' });

		expect(reversed).toEqual(forward);
	});

	test('labels a page with its title over its route, and keeps the route in the path', () => {
		const titled = [
			page('index', '', null, 'Overview'),
			page('clients', 'clients', null, 'Clients'),
			page('client-detail', ':id', 'clients', 'Client'),
		];

		const menu = buildMenu('acme', titled, 'index', { id: '42' });

		expect(menu.map((item) => [item.title, item.path])).toEqual([
			['Overview', '/apps/acme'],
			['Clients', '/apps/acme/clients'],
		]);
		expect(menu[1].children).toEqual([
			{ title: 'Client', path: '/apps/acme/clients/42', current: false, children: [] },
		]);
	});

	test('still leaves out a titled page behind an unresolved param', () => {
		const titled = [clients, page('client-detail', ':id', 'clients', 'Client')];

		expect(flatten(buildMenu('acme', titled, 'clients', {}))).toEqual(['/apps/acme/clients']);
	});

	test('gives an index page its parent path, not its own segment', () => {
		const nested = [clients, page('clients-index', '', 'clients')];

		expect(buildMenu('acme', nested, 'clients', {})).toEqual([
			{
				title: 'clients',
				path: '/apps/acme/clients',
				current: true,
				children: [{ title: 'Home', path: '/apps/acme/clients', current: false, children: [] }],
			},
		]);
	});
});
