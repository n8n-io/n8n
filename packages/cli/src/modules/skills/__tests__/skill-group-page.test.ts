import { skillGroupPage } from '../utils/skill-group-page';

describe('source group pages', () => {
	const groups = [
		{ sourceId: 'alpha', count: 2 },
		{ sourceId: 'beta', count: 4 },
		{ sourceId: 'empty', count: 0 },
		{ sourceId: null, count: 7 },
	];

	it('keeps an oversized source on one page and paginates local skills after it', () => {
		const pages = Array.from({ length: 5 }, (_, page) =>
			skillGroupPage(groups, new Set(), page, 3),
		);
		expect(pages.map(({ groups: sources }) => sources.map(({ sourceId }) => sourceId))).toEqual([
			['alpha'],
			['beta'],
			['empty'],
			[],
			[],
		]);
		expect(pages.map(({ localSkip, localTake }) => [localSkip, localTake])).toEqual([
			[0, 0],
			[0, 0],
			[0, 2],
			[2, 3],
			[5, 2],
		]);
		expect(pages[0]).toMatchObject({ count: 14, pageCount: 5 });
	});

	it('counts a folded source once and selects the page of a requested source', () => {
		const page = skillGroupPage(groups, new Set(['beta']), 9, 3, 'empty');
		expect(page).toMatchObject({ page: 1, pageCount: 4, count: 11 });
		expect(page.groups).toEqual([{ sourceId: 'empty', count: 0 }]);
	});

	it('clamps a page after the last page and keeps all rows when no size is supplied', () => {
		expect(skillGroupPage(groups, new Set(), 100, 3)).toMatchObject({ page: 4, localTake: 2 });
		expect(skillGroupPage(groups, new Set(), 0)).toMatchObject({ pageCount: 1, localTake: 7 });
		expect(skillGroupPage([], new Set(), 0, 10)).toMatchObject({ count: 0, page: 0, pageCount: 1 });
	});
});
