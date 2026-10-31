import type { SkillContent } from '../utils/skill-content-hash';
import { SKILL_PREVIEW_MAX_LENGTH, skillPreview } from '../utils/skill-preview';

const content = (overrides: Partial<SkillContent> = {}): SkillContent => ({
	name: 'translate',
	description: 'Translates text',
	instructions: '# Translate\n\nFollow these steps.',
	frontmatter: null,
	files: [],
	...overrides,
});

describe('skillPreview', () => {
	it('shows SKILL.md with its frontmatter and marks where the instructions start', () => {
		const { files, truncated } = skillPreview(
			content({ frontmatter: { 'allowed-tools': ['Bash'] } }),
		);

		expect(truncated).toBe(false);
		expect(files).toEqual([
			{
				path: 'SKILL.md',
				text: [
					'---',
					'name: translate',
					'description: Translates text',
					'allowed-tools: ["Bash"]',
					'---',
					'',
					'# Translate',
					'',
					'Follow these steps.',
				].join('\n'),
				instructionsLine: 7,
			},
		]);
	});

	it('shows each hidden character as a marker and keeps the line breaks', () => {
		const { files } = skillPreview(content({ instructions: 'Follow\u200b these\nsteps.' }));

		expect(files[0].text.split('\n').slice(-2)).toEqual([
			'Follow\u27e6U+200B\u27e7 these',
			'steps.',
		]);
	});

	it('counts the lines of a description with line breaks', () => {
		const { files } = skillPreview(content({ description: 'One\nTwo' }));

		expect(files[0].instructionsLine).toBe(7);
		expect(files[0].text.split('\n')[6]).toBe('# Translate');
	});

	it('lists the reference files after SKILL.md', () => {
		const { files } = skillPreview(
			content({ files: [{ path: 'references/guide.md', content: 'Read me.' }] }),
		);

		expect(files.map(({ path }) => path)).toEqual(['SKILL.md', 'references/guide.md']);
		expect(files[1]).toEqual({ path: 'references/guide.md', text: 'Read me.' });
	});

	it('leaves out the files after the limit', () => {
		const big = 'x'.repeat(SKILL_PREVIEW_MAX_LENGTH - 10);
		const { files, truncated } = skillPreview(
			content({ files: [{ path: 'references/big.md', content: big }] }),
		);

		expect(truncated).toBe(true);
		expect(files.map(({ path }) => path)).toEqual(['SKILL.md']);
	});
});
