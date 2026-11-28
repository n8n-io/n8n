import type { SkillContent } from '../utils/skill-content-hash';
import { SKILL_PREVIEW_MAX_LENGTH, skillPreview } from '../utils/skill-preview';

const skill = (overrides: Partial<SkillContent> = {}): SkillContent => ({
	name: 'Brand voice',
	description: 'Write in our voice',
	instructions: 'Use short sentences.',
	frontmatter: null,
	files: [],
	...overrides,
});

describe('skillPreview', () => {
	it('shows SKILL.md with one line for each frontmatter key, then each reference', () => {
		const content = skill({
			frontmatter: { license: 'MIT', metadata: { owner: 'docs' } },
			files: [{ path: 'references/tone.md', content: 'Friendly and direct.' }],
		});

		expect(skillPreview(content)).toEqual({
			files: [
				{
					path: 'SKILL.md',
					text: [
						'---',
						'name: Brand voice',
						'description: Write in our voice',
						'license: "MIT"',
						'metadata: {"owner":"docs"}',
						'---',
						'',
						'Use short sentences.',
					].join('\n'),
				},
				{ path: 'references/tone.md', text: 'Friendly and direct.' },
			],
			truncated: false,
		});
	});

	it('shows each hidden character as a marker', () => {
		const content = skill({
			instructions: 'Use short​ sentences.',
			files: [{ path: 'references/a.md', content: 'run ‮txt.exe' }],
		});

		const { files } = skillPreview(content);

		expect(files[0].text.endsWith('Use short⟦U+200B⟧ sentences.')).toBe(true);
		expect(files[1].text).toBe('run ⟦U+202E⟧txt.exe');
	});

	it('leaves out the references that do not fit, and says so', () => {
		const half = 'a'.repeat(SKILL_PREVIEW_MAX_LENGTH / 2);
		const content = skill({
			files: [
				{ path: 'references/a.md', content: half },
				{ path: 'references/b.md', content: half },
				{ path: 'references/c.md', content: 'short' },
			],
		});

		const { files, truncated } = skillPreview(content);

		expect(files.map((file) => file.path)).toEqual(['SKILL.md', 'references/a.md']);
		expect(truncated).toBe(true);
	});

	it('always shows SKILL.md, cut at the last whole line before the limit', () => {
		const line = 'a'.repeat(99);
		const content = skill({ instructions: Array(1000).fill(line).join('\n') });

		const { files, truncated } = skillPreview(content);

		expect(files).toHaveLength(1);
		expect(files[0].text.length).toBeLessThanOrEqual(SKILL_PREVIEW_MAX_LENGTH);
		expect(files[0].text.endsWith(line)).toBe(true);
		expect(truncated).toBe(true);
	});

	it('does not cut a marker of a hidden character in half', () => {
		const content = skill({
			instructions: `${'a'.repeat(SKILL_PREVIEW_MAX_LENGTH - 80)}\u200b${'b'.repeat(100)}`,
		});

		const { files } = skillPreview(content);

		expect(files[0].text).not.toContain('\u27e6');
	});
});
