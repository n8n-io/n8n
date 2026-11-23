import { skillGroupPage } from '../utils/skill-group-page';

describe('source group pages', () => {
	const groups = [
		{ sourceId: 'alpha', count: 2 },
		{ sourceId: 'beta', count: 4 },
		{ sourceId: 'empty', count: 0 },
		{ sourceId: null, count: 7 },
	];

	it('fills pages across source boundaries and continues oversized sources', () => {
		const pages = Array.from({ length: 5 }, (_, page) => skillGroupPage(groups, page, 3));
		expect(pages.map(({ groups: sources }) => sources)).toEqual([
			[
				{ sourceId: 'alpha', count: 2, skip: 0, take: 2 },
				{ sourceId: 'beta', count: 4, skip: 0, take: 1 },
			],
			[{ sourceId: 'beta', count: 4, skip: 1, take: 3 }],
			[{ sourceId: 'empty', count: 0, skip: 0, take: 0 }],
			[],
			[],
		]);
		expect(pages.map(({ localSkip, localTake }) => [localSkip, localTake])).toEqual([
			[0, 0],
			[0, 0],
			[0, 3],
			[3, 3],
			[6, 1],
		]);
		expect(pages[0]).toMatchObject({ count: 13, pageCount: 5 });
	});

	it('puts one skill and nine skills on the first ten-skill page', () => {
		const uneven = [
			{ sourceId: 'alpha', count: 1 },
			{ sourceId: 'beta', count: 10 },
		];
		expect(skillGroupPage(uneven, 0, 10).groups).toEqual([
			{ sourceId: 'alpha', count: 1, skip: 0, take: 1 },
			{ sourceId: 'beta', count: 10, skip: 0, take: 9 },
		]);
		expect(skillGroupPage(uneven, 1, 10)).toMatchObject({
			groups: [{ sourceId: 'beta', count: 10, skip: 9, take: 1 }],
			count: 11,
			page: 1,
			pageCount: 2,
		});
	});

	it('selects the first page of a requested source and keeps an unknown target on the current page', () => {
		expect(skillGroupPage(groups, 4, 3, 'beta').page).toBe(0);
		expect(skillGroupPage(groups, 0, 3, 'empty').page).toBe(2);
		expect(skillGroupPage(groups, 3, 3, 'unknown').page).toBe(3);
	});

	it('keeps trailing empty headers on the last page without an extra page', () => {
		const trailingEmpty = [
			{ sourceId: 'alpha', count: 3 },
			{ sourceId: 'empty', count: 0 },
		];
		expect(skillGroupPage(trailingEmpty, 0, 3, 'empty')).toMatchObject({
			page: 0,
			pageCount: 1,
			count: 3,
			groups: [
				{ sourceId: 'alpha', count: 3, skip: 0, take: 3 },
				{ sourceId: 'empty', count: 0, skip: 0, take: 0 },
			],
		});
	});

	it('keeps empty sources visible when there are no skills', () => {
		expect(skillGroupPage([{ sourceId: 'empty', count: 0 }], 9, 10)).toMatchObject({
			page: 0,
			pageCount: 1,
			count: 0,
			groups: [{ sourceId: 'empty', count: 0, skip: 0, take: 0 }],
		});
	});

	it('clamps an invalid page and keeps all skills when no size is supplied', () => {
		expect(skillGroupPage(groups, 100, 3)).toMatchObject({ page: 4, localTake: 1 });
		expect(skillGroupPage(groups, 100)).toMatchObject({ page: 0, pageCount: 1, localTake: 7 });
		expect(skillGroupPage([], 0, 10)).toMatchObject({ count: 0, page: 0, pageCount: 1 });
	});
});
