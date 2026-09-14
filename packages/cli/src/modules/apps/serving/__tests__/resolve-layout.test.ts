import type { AppLayout } from '@n8n/api-types';

import { resolveLayout, type LayoutPageNode } from '../resolve-layout';

const layoutWith = (id: string): AppLayout => [{ id, type: 'slot', data: {} }];

const page = (
	id: string,
	parentPageId: string | null,
	layout: AppLayout | null = null,
	route = id,
): LayoutPageNode => ({ id, route, parentPageId, layout });

describe('resolveLayout', () => {
	test('returns null when no page on the way up has a layout', () => {
		const pages = [page('root', null), page('child', 'root')];

		expect(resolveLayout(pages, 'child')).toBeNull();
	});

	test("falls back to the app index page's layout for a page outside its subtree", () => {
		const index = page('index', null, layoutWith('site'), '');
		const pages = [index, page('about', null), page('team', 'about')];

		expect(resolveLayout(pages, 'team')).toEqual({ blocks: index.layout, ownerPageId: 'index' });
	});

	test('prefers an ancestor layout over the index page default', () => {
		const pages = [
			page('index', null, layoutWith('site'), ''),
			page('about', null, layoutWith('about')),
			page('team', 'about'),
		];

		expect(resolveLayout(pages, 'team')?.ownerPageId).toBe('about');
	});

	test("returns the page's own layout first", () => {
		const pages = [
			page('root', null, layoutWith('root-slot')),
			page('child', 'root', layoutWith('own')),
		];

		expect(resolveLayout(pages, 'child')).toEqual({
			blocks: layoutWith('own'),
			ownerPageId: 'child',
		});
	});

	test('inherits the nearest ancestor layout', () => {
		const pages = [
			page('root', null, layoutWith('root-slot')),
			page('mid', 'root', layoutWith('mid-slot')),
			page('leaf', 'mid'),
		];

		expect(resolveLayout(pages, 'leaf')).toEqual({
			blocks: layoutWith('mid-slot'),
			ownerPageId: 'mid',
		});
	});

	test('skips ancestors without a layout', () => {
		const pages = [
			page('root', null, layoutWith('root-slot')),
			page('mid', 'root'),
			page('leaf', 'mid'),
		];

		expect(resolveLayout(pages, 'leaf')?.ownerPageId).toBe('root');
	});

	test('returns null for an unknown page', () => {
		expect(resolveLayout([page('root', null, layoutWith('s'))], 'nope')).toBeNull();
	});

	test('stops on a parent cycle', () => {
		const pages = [page('a', 'b'), page('b', 'a')];

		expect(resolveLayout(pages, 'a')).toBeNull();
	});
});
