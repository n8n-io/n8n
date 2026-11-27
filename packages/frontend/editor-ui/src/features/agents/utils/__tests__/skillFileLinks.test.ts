import { resolveSkillFileLink } from '../skillFileLinks';

describe('resolveSkillFileLink', () => {
	const paths = ['reference/guide.md', 'reference/degraded/fallback.md', 'notes/Q&A #1.md'];

	it.each([
		['reference/guide.md', 'SKILL.md', 'reference/guide.md'],
		['./reference/degraded/fallback.md', 'SKILL.md', 'reference/degraded/fallback.md'],
		['../guide.md', 'reference/degraded/fallback.md', 'reference/guide.md'],
		['../../SKILL.md', 'reference/degraded/fallback.md', 'SKILL.md'],
		['guide.md#usage', 'reference/other.md', 'reference/guide.md'],
		['notes/Q%26A%20%231.md', 'SKILL.md', 'notes/Q&A #1.md'],
	])('resolves %s from %s to %s', (href, from, expected) => {
		expect(resolveSkillFileLink(href, from, paths)).toBe(expected);
	});

	it.each([
		['a path above the skill folder', '../other/SKILL.md', 'SKILL.md'],
		['a file that the skill does not have', 'reference/none.md', 'SKILL.md'],
		['a web address', 'https://example.com/reference/guide.md', 'SKILL.md'],
		['an address from the site root', '/reference/guide.md', 'SKILL.md'],
		['an anchor', '#usage', 'SKILL.md'],
		['an address that cannot be decoded', 'reference/%E0%A4%A.md', 'SKILL.md'],
	])('gives no file for %s', (_case, href, from) => {
		expect(resolveSkillFileLink(href, from, paths)).toBeUndefined();
	});
});
