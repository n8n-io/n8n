import { groupByFolder } from './skillSourceReview.utils';

const at = (...locations: string[]) => locations.map((location) => ({ location }));

describe('groupByFolder', () => {
	it('puts skills with the same parent folder in one group, in the order of the source', () => {
		const groups = groupByFolder(at('skills/pdf', 'tools/lint', 'skills/docx'));

		expect(groups).toEqual([
			{ folder: 'skills', skills: at('skills/pdf', 'skills/docx') },
			{ folder: 'tools', skills: at('tools/lint') },
		]);
	});

	it('groups a skill at the root and a top-level skill folder under the root', () => {
		expect(groupByFolder(at('/', 'pdf'))).toEqual([{ folder: '/', skills: at('/', 'pdf') }]);
	});

	it('keeps nested folders apart', () => {
		expect(groupByFolder(at('a/b/one', 'a/two'))).toEqual([
			{ folder: 'a/b', skills: at('a/b/one') },
			{ folder: 'a', skills: at('a/two') },
		]);
	});

	it('gives no group for no skills', () => {
		expect(groupByFolder([])).toEqual([]);
	});
});
