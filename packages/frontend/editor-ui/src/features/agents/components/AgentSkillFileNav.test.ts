import { createComponentRenderer } from '@/__tests__/render';

import AgentSkillFileNav from './AgentSkillFileNav.vue';

const renderComponent = createComponentRenderer(AgentSkillFileNav);

// The file list uses `data-testid`, which the shared test setup does not query.
const byTestId = (root: Element, id: string) => root.querySelector(`[data-testid="${id}"]`);

describe('AgentSkillFileNav', () => {
	it('marks new and deleted reference files and shows only their lines', () => {
		const { container } = renderComponent({
			props: {
				skill: {
					name: 'Tone',
					description: 'Writing style',
					instructions: 'Be brief.',
					references: [
						{ path: 'references/new.md', content: 'One\nTwo' },
						{ path: 'references/old.md', content: 'Old' },
						{ path: 'references/same.md', content: 'Same\nOther' },
					],
				},
				selectedPath: 'SKILL.md',
				readOnly: true,
				changeCounts: {
					'SKILL.md': { added: 0, removed: 0 },
					'references/new.md': { added: 2, removed: 0, status: 'added' },
					'references/old.md': { added: 0, removed: 1, status: 'removed' },
					'references/same.md': { added: 1, removed: 1 },
				},
			},
		});

		const newRow = byTestId(container, 'agent-skill-reference-nav-item-references-new-md');
		const oldRow = byTestId(container, 'agent-skill-reference-nav-item-references-old-md');
		const sameRow = byTestId(container, 'agent-skill-reference-nav-item-references-same-md');

		expect(
			byTestId(container, 'agent-skill-reference-nav-item-references-new-md-added'),
		).not.toBeNull();
		expect(
			byTestId(container, 'agent-skill-reference-nav-item-references-old-md-removed'),
		).not.toBeNull();
		// The icon is hidden from screen readers, so the row's name says the status.
		expect(newRow).toHaveAttribute('aria-label', 'references/new.md, New file');
		expect(oldRow).toHaveAttribute('aria-label', 'references/old.md, Deleted file');
		expect(sameRow).toHaveAttribute('aria-label', 'references/same.md');
		// A new file has no removed lines, and a deleted file has no added lines.
		expect(newRow).toHaveTextContent('+2');
		expect(newRow).not.toHaveTextContent('−0');
		expect(oldRow).toHaveTextContent('−1');
		expect(oldRow).not.toHaveTextContent('+0');
		expect(sameRow).toHaveTextContent('−1+1');
		expect(
			byTestId(container, 'agent-skill-reference-nav-item-references-same-md-added'),
		).toBeNull();
	});
});
