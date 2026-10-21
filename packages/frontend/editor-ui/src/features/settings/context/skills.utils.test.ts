import { toSkillSortOption } from './skills.utils';

describe('toSkillSortOption', () => {
	it('falls back to the most recent change first', () => {
		expect(toSkillSortOption([])).toBe('updatedAt:desc');
	});

	it.each([
		[{ id: 'name', desc: false }, 'name:asc'],
		[{ id: 'name', desc: true }, 'name:desc'],
		[{ id: 'updatedAt', desc: false }, 'updatedAt:asc'],
	])('maps %o to %s', (sort, option) => {
		expect(toSkillSortOption([sort])).toBe(option);
	});

	it('drops a column that the endpoint cannot sort', () => {
		expect(toSkillSortOption([{ id: 'scope', desc: false }])).toBeUndefined();
	});
});
