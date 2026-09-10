import type { Page } from '@/features/apps/apps.types';
import { findPageIdByPath, flattenPageTree, getPageOptions } from '@/features/apps/pageTree.utils';

const page = (id: string, route: string, parentPageId: string | null = null): Page => ({
	id,
	appId: 'app1',
	parentPageId,
	route,
	content: [],
	layout: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
});

describe('pageTree.utils', () => {
	const pages = [
		page('reports', 'reports'),
		page('index', ''),
		page('weekly', 'weekly', 'reports'),
		page('leads', 'leads', 'reports'),
		page('about', 'about'),
	];

	it('flattenPageTree() lists pages depth-first with siblings sorted by route', () => {
		expect(flattenPageTree(pages).map(({ page: p, depth }) => `${depth}:${p.id}`)).toEqual([
			'0:index',
			'0:about',
			'0:reports',
			'1:leads',
			'1:weekly',
		]);
	});

	it('getPageOptions() labels every page with its full path', () => {
		expect(getPageOptions(pages, 'index').map((option) => option.label)).toEqual([
			'/ (index)',
			'/about',
			'/reports',
			'/reports/leads',
			'/reports/weekly',
		]);
	});

	describe('findPageIdByPath()', () => {
		const withDynamic = [...pages, page('report', ':id', 'reports')];

		it.each([
			['/apps/crm', 'index'],
			['/apps/crm/', 'index'],
			['/apps/crm/reports/weekly', 'weekly'],
			['/apps/crm/reports/weekly/', 'weekly'],
			['/apps/crm/nowhere', null],
			['/apps/other/about', null],
			['/apps/crm/reports/42', null],
		])('resolves %s to %s', (path, expected) => {
			expect(findPageIdByPath(withDynamic, 'crm', path)).toBe(expected);
		});
	});
});
