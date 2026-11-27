import { fireEvent } from '@testing-library/vue';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import AgentSkillFileNav from './AgentSkillFileNav.vue';
import {
	countsByFile,
	diffSkills,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

const flag = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: (name: string, variant: string) =>
			name === '152_workflows_in_skills' && variant === (flag.enabled ? 'variant' : 'control'),
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ params }: { params: { workflowId: string } }) => ({
			href: `/base/workflow/${params.workflowId}`,
		}),
	}),
}));

const PickerStub = defineComponent({
	name: 'SkillWorkflowMentionPicker',
	props: ['mode', 'projectId', 'projectName', 'mentionedWorkflowIds'],
	emits: ['select'],
	template: `<button data-testid="picker-stub" :data-ids="mentionedWorkflowIds.join(',')" @click="$emit('select', { workflowId: 'wf9', name: 'New flow' })" />`,
});

const renderComponent = createComponentRenderer(AgentSkillFileNav, {
	global: { stubs: { SkillWorkflowMentionPicker: PickerStub } },
});

const MENTIONING_SKILL = {
	name: 'Report',
	description: 'Send the report',
	instructions:
		'Run [Weekly report](n8n://workflow/wf1), then [Weekly report](n8n://workflow/wf1).',
	references: [{ path: 'references/steps.md', content: 'Or [Archive](n8n://workflow/wf2).' }],
};

// The file list uses `data-testid`, which the shared test setup does not query.
const byTestId = (root: Element, id: string) => root.querySelector(`[data-testid="${id}"]`);

describe('AgentSkillFileNav', () => {
	beforeEach(() => {
		flag.enabled = false;
	});

	it('lists each mentioned workflow once, from SKILL.md and the references', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md', mentionProjectId: 'p1' },
		});

		const rows = container.querySelectorAll('[data-testid="agent-skill-workflow-item"]');
		expect([...rows].map((row) => row.textContent?.trim())).toEqual(['Weekly report', 'Archive']);
		expect(byTestId(container, 'picker-stub')).toHaveAttribute('data-ids', 'wf1,wf2');
	});

	it('shows the workflow ID when a mention has no name', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: {
				skill: { ...MENTIONING_SKILL, instructions: 'Run [](n8n://workflow/wf3).', references: [] },
				selectedPath: 'SKILL.md',
			},
		});

		expect(byTestId(container, 'agent-skill-workflow-link')).toHaveTextContent('wf3');
	});

	it('links each listed workflow to its page in a new tab', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md' },
		});

		const links = container.querySelectorAll('[data-testid="agent-skill-workflow-link"]');
		expect([...links].map((link) => link.getAttribute('href'))).toEqual([
			'/base/workflow/wf1',
			'/base/workflow/wf2',
		]);
		expect(links[0]).toHaveAttribute('target', '_blank');
		expect(links[0]).toHaveAttribute('rel', 'noopener');
		expect(links[0]).toHaveTextContent('Weekly report');
	});

	it('shows an empty state when the skill mentions no workflow', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: {
				skill: { ...MENTIONING_SKILL, instructions: 'No links', references: [] },
				selectedPath: 'SKILL.md',
			},
		});

		expect(byTestId(container, 'agent-skill-workflows')).toHaveTextContent('No workflows yet');
	});

	it('emits the workflow that the user adds', async () => {
		flag.enabled = true;
		const { container, emitted } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md' },
		});

		await fireEvent.click(byTestId(container, 'picker-stub')!);

		expect(emitted('add-workflow')).toEqual([[{ workflowId: 'wf9', name: 'New flow' }]]);
	});

	it('hides the add button for a read-only skill', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md', readOnly: true },
		});

		expect(byTestId(container, 'agent-skill-workflows')).not.toBeNull();
		expect(byTestId(container, 'picker-stub')).toBeNull();
	});

	it('hides the workflows section when the flag is off', () => {
		const { container } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md' },
		});

		expect(byTestId(container, 'agent-skill-workflows')).toBeNull();
	});

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

	it('marks changed binary files in the file list without a line count', () => {
		const path = 'assets/logo.png';
		const skill = {
			name: 'Tone',
			description: 'Writing style',
			instructions: 'Be brief.',
			references: [{ path, content: 'AP8=', isBinary: true as const }],
		};
		const previous = { ...skill, references: [{ ...skill.references[0], content: 'AAE=' }] };
		const view = renderComponent({
			props: {
				skill,
				selectedPath: path,
				readOnly: true,
				changeCounts: countsByFile(diffSkills(previous, skill)),
			},
		});

		const item = view.getByRole('button', { name: 'assets/logo.png, Modified file' });
		expect(byTestId(item, 'agent-skill-reference-nav-item-assets-logo-png-modified')).toBeVisible();
		expect(byTestId(item, 'skill-diff-count')).toBeNull();
	});
});
