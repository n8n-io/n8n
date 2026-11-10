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
});
