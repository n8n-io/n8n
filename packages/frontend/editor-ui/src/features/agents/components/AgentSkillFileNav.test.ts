import { fireEvent, waitFor } from '@testing-library/vue';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
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

const searchWorkflows = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows }),
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
				homeProject: { id: 'p1' },
			},
			{
				id: 'wf2',
				nodes: [{ type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, name: 'Start' }],
				activeVersionId: 'v1',
				settings: {},
				homeProject: { id: 'p1' },
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
			select: ['id', 'nodes', 'activeVersionId', 'settings', 'isArchived', 'ownedBy', 'updatedAt'],
			options: { take: 2, includeScopes: false },
		});
		const [weeklyRow, archiveRow] = container.querySelectorAll(
			'[data-testid="agent-skill-workflow-item"]',
		);
		expect(byTestId(weeklyRow, 'agent-skill-workflow-notes')).toHaveAttribute(
			'aria-label',
			"To use this workflow in agents, add an 'Execute Workflow Trigger' (When Executed by Another Workflow). To use this workflow in a published agent, publish the workflow.",
		);
		expect(byTestId(archiveRow, 'agent-skill-workflow-notes')).toBeNull();
		expect(
			byTestId(weeklyRow, 'agent-skill-workflow-notes')?.closest(
				'[data-testid="agent-skill-workflow-link"]',
			),
		).toBeNull();
	});

	it('shows the notes that block an agent as a warning in the agent context, and the other notes as info', async () => {
		flag.enabled = true;
		searchWorkflows.mockResolvedValue([
			{
				id: 'wf1',
				nodes: [{ type: SCHEDULE_TRIGGER_NODE_TYPE, name: 'Schedule' }],
				activeVersionId: null,
				settings: {},
			},
		]);
		const { container } = renderComponent({
			props: {
				skill: { ...MENTIONING_SKILL, references: [] },
				selectedPath: 'SKILL.md',
				instanceSkill: true,
				agentContext: true,
			},
		});

		await waitFor(() =>
			expect(byTestId(container, 'agent-skill-workflow-warnings')).toHaveAttribute(
				'aria-label',
				"To use this workflow in agents, add an 'Execute Workflow Trigger' (When Executed by Another Workflow). To use this workflow in a published agent, publish the workflow.",
			),
		);
		expect(byTestId(container, 'agent-skill-workflow-notes')).toHaveAttribute(
			'aria-label',
			"Agents can use this workflow only in its own project. To use it in other projects, share it with those projects and set 'This workflow can be called by' to 'Any workflow'.",
		);
	});

	it('hides the instance access note of a workflow that the agent project cannot use', async () => {
		flag.enabled = true;
		searchWorkflows.mockResolvedValue(
			['wf1', 'wf2'].map((id) => ({
				id,
				nodes: [{ type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, name: 'Start' }],
				activeVersionId: 'v1',
				settings: {},
			})),
		);
		const { container } = renderComponent({
			props: {
				skill: MENTIONING_SKILL,
				selectedPath: 'SKILL.md',
				instanceSkill: true,
				agentContext: true,
				outsideProjectWorkflowIds: ['wf2'],
			},
		});

		const rows = () => container.querySelectorAll('[data-testid="agent-skill-workflow-item"]');
		await waitFor(() =>
			expect(byTestId(rows()[0], 'agent-skill-workflow-notes')).toHaveAttribute(
				'aria-label',
				"Agents can use this workflow only in its own project. To use it in other projects, share it with those projects and set 'This workflow can be called by' to 'Any workflow'.",
			),
		);
		const [weeklyRow, archiveRow] = rows();
		expect(byTestId(weeklyRow, 'agent-skill-workflow-warnings')).toBeNull();
		expect(byTestId(archiveRow, 'agent-skill-workflow-warnings')).toHaveAttribute(
			'aria-label',
			'This agent\'s project can\'t use workflow "Archive". Share the workflow with this project and set "This workflow can be called by" to "Any workflow".',
		);
		expect(byTestId(archiveRow, 'agent-skill-workflow-notes')).toBeNull();
	});

	it('shows no warning outside the agent context', async () => {
		flag.enabled = true;
		searchWorkflows.mockResolvedValue([
			{ id: 'wf1', nodes: [], activeVersionId: null, settings: {} },
		]);
		const { container } = renderComponent({
			props: { skill: { ...MENTIONING_SKILL, references: [] }, selectedPath: 'SKILL.md' },
		});

		await waitFor(() => expect(byTestId(container, 'agent-skill-workflow-notes')).not.toBeNull());
		expect(byTestId(container, 'agent-skill-workflow-warnings')).toBeNull();
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
				"To run this workflow from MCP, add a Schedule, Webhook, Form, or Chat trigger. To run this workflow from MCP, turn on 'Available in MCP' in the workflow settings. Agents can use this workflow only in its own project. To use it in other projects, share it with those projects and set 'This workflow can be called by' to 'Any workflow'.",
			),
		);
	});

	it('loads the note data in pages of 50 workflows and keeps the pages that load', async () => {
		flag.enabled = true;
		const ids = Array.from({ length: 51 }, (_, index) => `wf${index}`);
		searchWorkflows.mockImplementation(async ({ ids: page }: { ids: string[] }) => {
			if (page.length === 1)
				return [{ id: page[0], nodes: [], activeVersionId: null, settings: {} }];
			throw new Error('Failed');
		});
		const { container } = renderComponent({
			props: {
				skill: {
					...MENTIONING_SKILL,
					instructions: ids.map((id) => `[${id}](n8n://workflow/${id})`).join(' '),
					references: [],
				},
				selectedPath: 'SKILL.md',
			},
		});

		await waitFor(() =>
			expect(container.querySelectorAll('[data-testid="agent-skill-workflow-notes"]')).toHaveLength(
				1,
			),
		);
		expect(searchWorkflows.mock.calls.map(([{ ids: page }]) => page.length)).toEqual([50, 1]);
	});

	it('notes a workflow that is archived or that the request does not return, and warns about it in the agent context', async () => {
		flag.enabled = true;
		searchWorkflows.mockResolvedValue([
			{ id: 'wf1', nodes: [], activeVersionId: null, settings: {}, isArchived: true },
		]);
		const props = { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md' };
		const { container } = renderComponent({ props });

		await waitFor(() =>
			expect(container.querySelectorAll('[data-testid="agent-skill-workflow-notes"]')).toHaveLength(
				2,
			),
		);
		const [archivedRow, missingRow] = container.querySelectorAll(
			'[data-testid="agent-skill-workflow-item"]',
		);
		expect(byTestId(archivedRow, 'agent-skill-workflow-notes')).toHaveAttribute(
			'aria-label',
			'This workflow is archived. Restore it, then publish it.',
		);
		expect(byTestId(missingRow, 'agent-skill-workflow-notes')).toHaveAttribute(
			'aria-label',
			"This workflow was deleted or you can't access it. Remove the mention or pick a different workflow.",
		);
		expect(container.querySelector('[data-testid="agent-skill-workflow-warnings"]')).toBeNull();

		const agent = renderComponent({ props: { ...props, agentContext: true } });
		await waitFor(() =>
			expect(
				agent.container.querySelectorAll('[data-testid="agent-skill-workflow-warnings"]'),
			).toHaveLength(2),
		);
	});

	it('notes a workflow outside the project of a project skill in the skills hub only', async () => {
		flag.enabled = true;
		const startNode = { type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, name: 'Start' };
		searchWorkflows.mockResolvedValue([
			{
				id: 'wf1',
				nodes: [startNode],
				activeVersionId: 'v1',
				settings: {},
				homeProject: { id: 'p2' },
				sharedWithProjects: [],
			},
			{
				id: 'wf2',
				nodes: [startNode],
				activeVersionId: 'v1',
				settings: {},
				homeProject: { id: 'p2' },
				sharedWithProjects: [{ id: 'p1' }],
			},
		]);
		const props = { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md', mentionProjectId: 'p1' };
		const { container } = renderComponent({ props });

		await waitFor(() =>
			expect(container.querySelectorAll('[data-testid="agent-skill-workflow-notes"]')).toHaveLength(
				1,
			),
		);
		const [outsideRow, sharedRow] = container.querySelectorAll(
			'[data-testid="agent-skill-workflow-item"]',
		);
		expect(byTestId(outsideRow, 'agent-skill-workflow-notes')).toHaveAttribute(
			'aria-label',
			"Agents in this skill's project can't use this workflow. Share it with this project and set 'This workflow can be called by' to 'Any workflow'.",
		);
		expect(byTestId(sharedRow, 'agent-skill-workflow-notes')).toBeNull();

		const agent = renderComponent({ props: { ...props, agentContext: true, instanceSkill: true } });
		await waitFor(() =>
			expect(
				agent.container.querySelectorAll('[data-testid="agent-skill-workflow-notes"]'),
			).toHaveLength(2),
		);
		for (const note of agent.container.querySelectorAll(
			'[data-testid="agent-skill-workflow-notes"]',
		)) {
			expect(note.getAttribute('aria-label')).not.toContain("skill's project");
		}
	});

	it('selects the column that the server sorts by, so the server can page workflows with their projects', async () => {
		flag.enabled = true;
		renderComponent({ props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md' } });

		await waitFor(() => expect(searchWorkflows).toHaveBeenCalledTimes(1));
		const [{ select, options }] = searchWorkflows.mock.calls[0];
		expect(select).toContain((options.sortBy ?? 'updatedAt').split(':')[0]);
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

	it('warns about the workflows that the agent project cannot use', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: {
				skill: MENTIONING_SKILL,
				selectedPath: 'SKILL.md',
				readOnly: true,
				outsideProjectWorkflowIds: ['wf2'],
			},
		});

		const warnings = container.querySelectorAll('[data-testid="agent-skill-workflow-warnings"]');
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toHaveAttribute(
			'aria-label',
			'This agent\'s project can\'t use workflow "Archive". Share the workflow with this project and set "This workflow can be called by" to "Any workflow".',
		);
	});

	it('shows no project warning without an agent project', () => {
		flag.enabled = true;
		const { container } = renderComponent({
			props: { skill: MENTIONING_SKILL, selectedPath: 'SKILL.md', readOnly: true },
		});

		expect(byTestId(container, 'agent-skill-workflow-warnings')).toBeNull();
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
