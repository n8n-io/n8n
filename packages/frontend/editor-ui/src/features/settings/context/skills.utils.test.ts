import { frontmatterDiff } from './skills.utils';

describe('frontmatterDiff', () => {
	it('is null when only the key order changed, also in nested maps', () => {
		expect(
			frontmatterDiff(
				{ name: 'a', metadata: { owner: 'x', tags: [{ b: 1, a: 2 }] } },
				{ metadata: { tags: [{ a: 2, b: 1 }], owner: 'x' }, name: 'a' },
			),
		).toBeNull();
	});

	it('counts one changed line for a changed nested value', () => {
		const diff = frontmatterDiff(
			{ name: 'a', metadata: { owner: 'x', team: 'y' } },
			{ name: 'a', metadata: { team: 'y', owner: 'z' } },
		);
		expect(diff).toMatchObject({ added: 1, removed: 1 });
	});
});
