import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IWorkflowDb } from '@/Interface';

import {
	isWorkflowCompatibleWithAgentTools,
	toolCategoryForNodeType,
	useAgentToolCatalog,
} from './useAgentToolCatalog';

vi.mock('virtual:node-popularity-data', () => ({
	default: [
		{ id: 'n8n-nodes-base.slack', popularity: 100 },
		{ id: '@n8n/n8n-nodes-langchain.openAi', popularity: 45 },
		{ id: '@n8n/n8n-nodes-langchain.toolCode', popularity: 30 },
		{ id: 'mcpClientTool', popularity: 20 },
		{ id: 'toolCalculator', popularity: 10 },
	],
}));

function makeNodeType(
	overrides: Partial<INodeTypeDescription> & Pick<INodeTypeDescription, 'name' | 'displayName'>,
): INodeTypeDescription {
	return {
		group: ['output'],
		version: 1,
		description: overrides.displayName,
		defaults: { name: overrides.displayName },
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool }],
		properties: [],
		credentials: [],
		...overrides,
	};
}

const SLACK = makeNodeType({
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	credentials: [{ name: 'slackApi', required: true }],
});

const CODE_TOOL = makeNodeType({
	name: '@n8n/n8n-nodes-langchain.toolCode',
	displayName: 'Code Tool',
	codex: {
		categories: ['AI'],
		subcategories: { AI: ['Tools'], Tools: ['Recommended Tools'] },
	},
});

const OPENAI = makeNodeType({
	name: '@n8n/n8n-nodes-langchain.openAi',
	displayName: 'OpenAI',
	inputs: [],
});

const MCP = makeNodeType({
	name: 'mcpClientTool',
	displayName: 'GitHub MCP',
});

const CALCULATOR = makeNodeType({
	name: 'toolCalculator',
	displayName: 'Calculator',
});

const SUBAGENT = makeNodeType({
	name: 'n8n-nodes-base.subagent',
	displayName: 'Subagent',
	inputs: ['main'],
});

const HIDDEN_CHAT_TOOL = makeNodeType({
	name: '@n8n/n8n-nodes-langchain.chatTool',
	displayName: 'Chat Tool',
});

const executeWorkflowTrigger = {
	id: 't',
	name: 'When Executed by Another Workflow',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0] as [number, number],
	parameters: {},
};
const TRIGGER_NAME = executeWorkflowTrigger.name;

function makeWorkflow(overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return {
		id: 'wf-1',
		name: 'Daily sales digest',
		description: 'Ship a summary',
		active: true,
		isArchived: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-02T00:00:00Z',
		versionId: 'v-1',
		activeVersionId: null,
		nodes: [executeWorkflowTrigger],
		connections: {},
		...overrides,
	} as IWorkflowDb;
}

describe('useAgentToolCatalog', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	const allTypes = [SLACK, CODE_TOOL, OPENAI, MCP, CALCULATOR, SUBAGENT, HIDDEN_CHAT_TOOL];

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		nodeTypesStore = mockedStore(useNodeTypesStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			return allTypes.find((nt) => nt.name === name) ?? null;
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: allTypes.map((nt) => nt.name),
		};
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([]);
	});

	it('includes AiTool node types, excluding input-taking and hidden types', () => {
		const { availableToolTypes } = useAgentToolCatalog();
		const names = availableToolTypes.value.map((nt) => nt.name);

		expect(names).toContain(SLACK.name);
		expect(names).toContain(CODE_TOOL.name);
		expect(names).toContain(MCP.name);
		expect(names).not.toContain(SUBAGENT.name);
		expect(names).not.toContain(HIDDEN_CHAT_TOOL.name);
	});

	it('drops the reasoning helpers, which an agent has no use for', () => {
		const { availableToolTypes } = useAgentToolCatalog();

		expect(availableToolTypes.value.map((nt) => nt.name)).not.toContain(CALCULATOR.name);
	});

	it('drops model providers', () => {
		const { availableToolTypes } = useAgentToolCatalog();

		expect(availableToolTypes.value.map((nt) => nt.name)).not.toContain(OPENAI.name);
	});

	it('orders MCP, then n8n tools, then the rest by popularity', () => {
		const { availableToolTypes } = useAgentToolCatalog();
		const names = availableToolTypes.value.map((nt) => nt.name);

		expect(names.indexOf(MCP.name)).toBeLessThan(names.indexOf(CODE_TOOL.name));
		expect(names.indexOf(CODE_TOOL.name)).toBeLessThan(names.indexOf(SLACK.name));
	});

	it('categorizes community packages by provenance, ignoring a self-declared n8n subcategory', () => {
		const community = makeNodeType({
			name: 'n8n-nodes-firecrawl.firecrawlTool',
			displayName: 'Firecrawl',
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'], Tools: ['Recommended Tools'] },
			},
		});

		expect(toolCategoryForNodeType(community)).toBe('app-action');
		expect(toolCategoryForNodeType(SLACK)).toBe('app-action');
		expect(toolCategoryForNodeType(MCP)).toBe('mcp');
		expect(toolCategoryForNodeType(CODE_TOOL)).toBe('n8n');
	});

	it('keeps uninstalled verified community tools that getNodeType cannot resolve', () => {
		const preview = makeNodeType({
			name: 'n8n-nodes-firecrawl.firecrawlTool',
			displayName: 'Firecrawl',
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [SLACK.name, preview.name],
		};
		nodeTypesStore.communityNodeType = vi
			.fn()
			.mockImplementation((name: string) =>
				name === preview.name ? { nodeDescription: preview } : undefined,
			);

		const { availableToolTypes } = useAgentToolCatalog();

		expect(availableToolTypes.value.map((nt) => nt.name)).toContain(preview.name);
	});

	it('loads and filters project workflows for agent-tool compatibility', async () => {
		const compatible = makeWorkflow({ id: 'ok' });
		const archived = makeWorkflow({ id: 'archived', isArchived: true });
		const formBody = makeWorkflow({
			id: 'form',
			nodes: [
				executeWorkflowTrigger,
				{
					id: 'f',
					name: 'Form',
					type: 'n8n-nodes-base.form',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			// Form is reachable from the trigger, so it actually runs and must be flagged.
			connections: { [TRIGGER_NAME]: { main: [[{ node: 'Form', type: 'main', index: 0 }]] } },
		});
		// A reachable Wait node no longer blocks a workflow: the tool hands its
		// suspension off to HITL, so this one is selectable.
		const waitBody = makeWorkflow({
			id: 'wait',
			nodes: [
				executeWorkflowTrigger,
				{
					id: 'w',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { [TRIGGER_NAME]: { main: [[{ node: 'Wait', type: 'main', index: 0 }]] } },
		});
		const noTrigger = makeWorkflow({
			id: 'no-trigger',
			nodes: [
				{
					id: 's',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});
		// Only the execute-workflow trigger is supported; a manual trigger is not.
		const manualOnly = makeWorkflow({
			id: 'manual',
			nodes: [
				{
					id: 'm',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});
		workflowsListStore.searchWorkflows = vi
			.fn()
			.mockResolvedValue([compatible, archived, formBody, waitBody, noTrigger, manualOnly]);

		const { availableWorkflows, incompatibleWorkflows, loadWorkflows } = useAgentToolCatalog();
		await loadWorkflows('p-1');

		// Compatible workflows surface as selectable; archived ones are excluded
		// entirely. A wait-bearing workflow is now among the selectable ones.
		expect(availableWorkflows.value.map((wf) => wf.id)).toEqual(['ok', 'wait']);

		// Incompatible workflows surface with their reason, greyed out at the
		// bottom of the picker. Archived ones are not surfaced as incompatible.
		expect(incompatibleWorkflows.value).toEqual([
			{
				workflow: expect.objectContaining({ id: 'form' }),
				reason: { reason: 'incompatible_nodes', nodeTypes: ['n8n-nodes-base.form'] },
			},
			{
				workflow: expect.objectContaining({ id: 'no-trigger' }),
				reason: { reason: 'no_supported_trigger' },
			},
			{
				workflow: expect.objectContaining({ id: 'manual' }),
				reason: { reason: 'no_supported_trigger' },
			},
		]);
	});
});

describe('isWorkflowCompatibleWithAgentTools', () => {
	it('requires a supported trigger and no incompatible body nodes', () => {
		expect(isWorkflowCompatibleWithAgentTools(makeWorkflow())).toBe(true);
		expect(
			isWorkflowCompatibleWithAgentTools(
				makeWorkflow({
					nodes: [
						{
							id: 't',
							name: 'Cron',
							type: 'n8n-nodes-base.scheduleTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
				}),
			),
		).toBe(false);
		const formNode = {
			id: 'f',
			name: 'Form',
			type: 'n8n-nodes-base.form',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};
		const triggerToForm: IWorkflowDb['connections'] = {
			[TRIGGER_NAME]: { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
		};
		// An incompatible node reachable from the trigger blocks the workflow.
		expect(
			isWorkflowCompatibleWithAgentTools(
				makeWorkflow({ nodes: [executeWorkflowTrigger, formNode], connections: triggerToForm }),
			),
		).toBe(false);
		// An incompatible node that is NOT reachable from the trigger never runs,
		// so it must not block the workflow.
		expect(
			isWorkflowCompatibleWithAgentTools(
				makeWorkflow({ nodes: [executeWorkflowTrigger, formNode] }),
			),
		).toBe(true);
		// A disabled incompatible node never runs, so it must not block the workflow.
		expect(
			isWorkflowCompatibleWithAgentTools(
				makeWorkflow({
					nodes: [executeWorkflowTrigger, { ...formNode, disabled: true }],
					connections: triggerToForm,
				}),
			),
		).toBe(true);
	});
});
