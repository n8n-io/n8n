import { skillContentHash, type SkillContent } from '../skills/skill-content-hash';

const content: SkillContent = {
	name: 'Brand voice',
	description: 'Write in our voice',
	instructions: 'Use short sentences.',
	frontmatter: { 'allowed-tools': 'Read Bash(git diff:*)' },
	files: [
		{ path: 'references/z.md', content: 'z' },
		{ path: 'references/a.md', content: 'a' },
	],
};

describe('skillContentHash', () => {
	// The data migration (MigrateAgentSkillsToHub.contentHash) must produce the same value for
	// the same skill. Its test pins this input to this literal too.
	it('matches the hash the data migration writes', () => {
		expect(skillContentHash(content)).toBe(
			'fb5a3e8555463ac71ac16733c2b9fdf41d0e15977ac1583646823b0d6d855ab2',
		);
	});

	it('ignores the order of the files', () => {
		expect(skillContentHash({ ...content, files: [...content.files].reverse() })).toBe(
			skillContentHash(content),
		);
	});

	// A locale-aware sort puts `b.md` first and gives a different hash than the migration.
	it('sorts file paths by code unit, so an upper-case path comes first', () => {
		const files = [
			{ path: 'references/b.md', content: 'b' },
			{ path: 'references/B.md', content: 'B' },
		];

		expect(skillContentHash({ ...content, files })).toBe(
			'030387c0a4c961a2a79c3b896a18fb1b45c883b3ecb57e1a94e25898def497a4',
		);
	});

	it('ignores the order of the frontmatter keys', () => {
		expect(skillContentHash({ ...content, frontmatter: { b: '2', a: '1' } })).toBe(
			skillContentHash({ ...content, frontmatter: { a: '1', b: '2' } }),
		);
	});

	it('changes when the name changes', () => {
		expect(skillContentHash({ ...content, name: 'Brand tone' })).not.toBe(
			skillContentHash(content),
		);
	});

	it('changes when a file changes', () => {
		const files = [{ path: 'references/a.md', content: 'changed' }, content.files[0]];

		expect(skillContentHash({ ...content, files })).not.toBe(skillContentHash(content));
	});
});
