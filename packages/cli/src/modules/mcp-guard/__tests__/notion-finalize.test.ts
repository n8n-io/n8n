import { withTitles } from '../notion-finalize';
import { removeUnprovenLiterals } from '../plan-template';

describe('withTitles', () => {
	it('names a page or a database without a title, and keeps a real title', () => {
		const overlay = {
			world_version: 1,
			native: {
				notion: {
					pages: [
						{ ref: 'page:a', title: '' },
						{ ref: 'page:b' },
						{ ref: 'page:c', title: 'People' },
					],
					databases: [{ ref: 'db:a' }],
				},
			},
		};
		expect(withTitles(overlay)).toEqual({
			world_version: 1,
			native: {
				notion: {
					pages: [
						{ ref: 'page:a', title: 'Untitled' },
						{ ref: 'page:b', title: 'Untitled' },
						{ ref: 'page:c', title: 'People' },
					],
					databases: [{ ref: 'db:a', title: 'Untitled' }],
				},
			},
		});
	});

	it('returns an overlay without Notion data as it is', () => {
		const overlay = { world_version: 1 };
		expect(withTitles(overlay)).toBe(overlay);
	});

	it('does not count the name Untitled as text that the real data lacks', () => {
		const { cleaned, flagged } = removeUnprovenLiterals({ title: 'Untitled' }, 'other text');
		expect(flagged).toEqual([]);
		expect(cleaned).toEqual({ title: 'Untitled' });
	});

	it('accepts an id with dashes that the real text shows without them', () => {
		const { flagged } = removeUnprovenLiterals(
			{ note: '2765b6e0-c94f-80d6-910c-d1719dcf5bdc' },
			'database url https://www.notion.so/x-2765b6e0c94f80d6910cd1719dcf5bdc',
		);
		expect(flagged).toEqual([]);
	});

	it('accepts an id without dashes that the real text shows with them', () => {
		const { flagged } = removeUnprovenLiterals(
			{ note: '2765b6e0c94f80f0919a000b9cdd2af1' },
			'data source collection://2765b6e0-c94f-80f0-919a-000b9cdd2af1',
		);
		expect(flagged).toEqual([]);
	});

	it('still flags an id that the real text does not show', () => {
		const { flagged } = removeUnprovenLiterals(
			{ note: '11111111222233334444555566667777' },
			'data source collection://2765b6e0-c94f-80f0-919a-000b9cdd2af1',
		);
		expect(flagged).toHaveLength(1);
	});
});
