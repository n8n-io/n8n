import { buildPageRows } from '@/features/apps/pageTree.utils';
import type { Page } from '@/features/apps/apps.types';

const page = (id: string, parentPageId: string | null, route: string): Page => ({
	id,
	parentPageId,
	route,
});

describe('buildPageRows', () => {
	// index -> clients -> :id -> edit -> confirm (4 levels deep)
	const pages = [
		page('index', null, ''),
		page('clients', null, 'clients'),
		page('client', 'clients', ':id'),
		page('edit', 'client', 'edit'),
		page('confirm', 'edit', 'confirm'),
	];

	it('shows up to 3 levels from the tree root, indenting each level', () => {
		const rows = buildPageRows(pages, null);

		expect(rows.map((row) => [row.page.id, row.indent])).toEqual([
			['index', 0],
			['clients', 0],
			['client', 1],
			['edit', 2],
		]);
	});

	it('shows up to 3 levels from any page, not just the tree root', () => {
		const rows = buildPageRows(pages, 'clients');

		expect(rows.map((row) => [row.page.id, row.indent])).toEqual([
			['client', 0],
			['edit', 1],
			['confirm', 2],
		]);
	});

	it('respects a smaller explicit limit', () => {
		const rows = buildPageRows(pages, 'clients', 1);

		expect(rows.map((row) => row.page.id)).toEqual(['client']);
	});

	it('returns nothing for a page with no descendants', () => {
		expect(buildPageRows(pages, 'confirm')).toEqual([]);
	});
});
