import { createComponentRenderer } from '@/__tests__/render';

import SkillVersionDiff from './SkillVersionDiff.vue';
import { diffSkills, SKILL_FILE } from './skillVersionDiff';

const renderDiff = createComponentRenderer(SkillVersionDiff);
const base = { name: 'Tone', description: 'Writing style', instructions: '' };

describe('SkillVersionDiff', () => {
	it('shows an unchanged run with half a code fence as plain text, not as code', () => {
		const sections = diffSkills(
			{ ...base, instructions: 'Intro\n```\nold line\n```\nOutro' },
			{ ...base, instructions: 'Intro\n```\nnew line\n```\nOutro' },
		);

		const { container } = renderDiff({ props: { sections, selectedPath: SKILL_FILE } });
		const instructions = container.querySelector<HTMLElement>(
			'[data-testid="skill-version-diff-instructions"]',
		)!;

		expect(instructions.querySelector('pre')).toBeNull();
		expect(instructions).toHaveTextContent('old line');
		expect(instructions).toHaveTextContent('new line');
	});

	it.each([
		{ content: 'AP8=', isBinary: true, changed: false },
		{ content: 'AAE=', isBinary: true, changed: true },
		{ content: 'Readable text.', isBinary: undefined, changed: true },
	] as const)(
		'shows a binary file with expected modified state $changed',
		({ content, isBinary, changed }) => {
			const path = 'assets/example';
			const sections = diffSkills(
				{ ...base, references: [{ path, content: 'AP8=', isBinary: true }] },
				{ ...base, references: [{ path, content, isBinary }] },
			);
			const view = renderDiff({ props: { sections, selectedPath: path } });

			if (changed) expect(view.getByText('Modified file')).toBeVisible();
			else expect(view.queryByText('Modified file')).not.toBeInTheDocument();
			expect(view.queryByText('AP8=')).not.toBeInTheDocument();
			if (isBinary) expect(view.queryByText('AAE=')).not.toBeInTheDocument();
			else expect(view.getByText('Readable text.')).toBeVisible();
		},
	);
});
