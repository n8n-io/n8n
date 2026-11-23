import { fireEvent, waitFor } from '@testing-library/vue';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import AgentSkillFileNav from './AgentSkillFileNav.vue';

const flag = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: () => flag.enabled }),
}));

const searchWorkflows = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows }),
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
		searchWorkflows.mockReset();
		searchWorkflows.mockResolvedValue([]);
	});

	it('loads the note data of all mentioned workflows in one request and notes what each caller misses', async () => {
		flag.enabled = true;
		searchWorkflows.mockResolvedValue([
			{
				id: 'wf1',
				nodes: [{ type: SCHEDULE_TRIGGER_NODE_TYPE, name: 'Schedule' }],
				activeVersionId: null,
				settings: {},
			},
			{
				id: 'wf2',
				nodes: [{ type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, name: 'Start' }],
				activeVersionId: 'v1',
				settings: {},
			},
		]);
		const { container } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md', mentionProjectId: 'p1' },
		});

		await waitFor(() =>
			expect(container.querySelectorAll('[data-testid="agent-skill-workflow-notes"]')).toHaveLength(
				1,
			),
		);
		expect(searchWorkflows).toHaveBeenCalledTimes(1);
		expect(searchWorkflows).toHaveBeenCalledWith({
			ids: ['wf1', 'wf2'],
			select: ['id', 'nodes', 'activeVersionId', 'settings'],
			options: { take: 2, includeScopes: false },
		});
		const [weeklyRow, archiveRow] = container.querySelectorAll(
			'[data-testid="agent-skill-workflow-item"]',
		);
		expect(byTestId(weeklyRow, 'agent-skill-workflow-notes')).toHaveAttribute(
			'aria-label',
			"To use this workflow in agents, add the 'When Executed by Another Workflow' trigger. To use this workflow in a published agent, publish the workflow.",
		);
		expect(byTestId(archiveRow, 'agent-skill-workflow-notes')).toBeNull();
	});

	it('adds the MCP notes for a skill available to MCP and the access note for an instance skill', async () => {
		flag.enabled = true;
		searchWorkflows.mockResolvedValue([
			{
				id: 'wf1',
				nodes: [{ type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, name: 'Start' }],
				activeVersionId: 'v1',
				settings: { availableInMCP: false },
			},
		]);
		const { container } = renderComponent({
			props: {
				skill: { ...MENTIONING_SKILL, references: [] },
				selectedPath: 'SKILL.md',
				instanceSkill: true,
				availableToMcp: true,
			},
		});

		await waitFor(() =>
			expect(byTestId(container, 'agent-skill-workflow-notes')).toHaveAttribute(
				'aria-label',
				"To run this workflow from MCP, add a Schedule, Webhook, Form, or Chat trigger. To run this workflow from MCP, turn on 'Available in MCP' in the workflow settings. Agents can use this workflow only in its own project. To use it in other projects, share it with them and set 'This workflow can be called by' to 'Any workflow'.",
			),
		);
	});

	it('sends no request for notes while the flag is off', () => {
		renderComponent({ props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md' } });

		expect(searchWorkflows).not.toHaveBeenCalled();
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
});
