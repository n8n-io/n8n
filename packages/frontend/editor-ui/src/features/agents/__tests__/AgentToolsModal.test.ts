import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { fireEvent, waitFor } from '@testing-library/vue';

import AgentToolsModal from '../components/AgentToolsModal.vue';
import type { AgentJsonToolRef } from '../types';
import type { IWorkflowDb } from '@/Interface';

const showErrorMock = vi.fn();
const showMessageMock = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: showErrorMock,
		showMessage: showMessageMock,
		showToast: vi.fn(),
	}),
}));

const getWorkflowMock = vi.fn();
vi.mock('@/app/api/workflows', () => ({
	getWorkflow: (...args: unknown[]) => getWorkflowMock(...args),
}));

vi.mock('virtual:node-popularity-data', () => ({
	default: [
		{ id: 'n8n-nodes-base.slack', popularity: 100 },
		{ id: 'n8n-nodes-base.gmail', popularity: 90 },
		{ id: 'n8n-nodes-base.github', popularity: 50 },
		{ id: 'toolWikipedia', popularity: 40 },
	],
}));

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string, opts?: { interpolate?: Record<string, unknown> }) => {
			if (opts?.interpolate) {
				const { count, query } = opts.interpolate as { count?: number; query?: string };
				if (key === 'agents.tools.availableTools') return `Available tools (${count})`;
				if (key === 'agents.tools.availableWorkflows') return `Workflows (${count})`;
				if (key === 'agents.tools.noResults.withQuery') return `No tools match “${query}”`;
			}
			const map: Record<string, string> = {
				'agents.tools.title': 'Tools',
				'agents.tools.search.placeholder': 'Search tools',
				'agents.tools.noResults': 'No tools available',
				'agents.tools.connected': 'Connected',
				'agents.tools.connect': 'Connect',
				'agents.tools.configure': 'Configure',
				'agents.tools.added': 'Tool added',
				'agents.tools.addCredentials': 'Add credentials',
			};
			return map[key] ?? key;
		},
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const mockConfirm = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
}));

const uuidMockState = vi.hoisted(() => ({ counter: 0 }));
vi.mock('uuid', () => ({ v4: () => `mock-uuid-${++uuidMockState.counter}` }));

// Stand-in for the canvas credential validator — see AgentToolsPanel.test for
// the rationale. Minimal honoring of the `required` flag is enough to cover
// the "chip shows / chip hides" assertions in this suite.
vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({
		getNodeCredentialIssues: (
			node: { credentials?: Record<string, { id: string | null }> },
			nodeType: { credentials?: Array<{ name: string; required?: boolean }> } | null,
		) => {
			const required = (nodeType?.credentials ?? []).filter((c) => c.required !== false);
			if (required.length === 0) return null;
			const saved = node.credentials ?? {};
			const missing: Record<string, unknown> = {};
			for (const slot of required) {
				if (!saved[slot.name]?.id) missing[slot.name] = true;
			}
			return Object.keys(missing).length > 0 ? { credentials: missing } : null;
		},
	}),
}));

const SLACK: INodeTypeDescription = {
	displayName: 'Slack',
	name: 'n8n-nodes-base.slack',
	group: ['output'],
	version: 1,
	description: 'Send messages to Slack',
	defaults: { name: 'Slack' },
	inputs: [],
	outputs: [{ type: NodeConnectionTypes.AiTool }],
	properties: [],
	credentials: [{ name: 'slackApi', required: true }],
};

const GMAIL: INodeTypeDescription = {
	...SLACK,
	displayName: 'Gmail',
	name: 'n8n-nodes-base.gmail',
	description: 'Send emails via Gmail',
	credentials: [{ name: 'gmailOAuth2', required: true }],
};

const GITHUB: INodeTypeDescription = {
	...SLACK,
	displayName: 'GitHub',
	name: 'n8n-nodes-base.github',
	description: 'Manage GitHub repositories',
	credentials: [{ name: 'githubApi', required: true }],
};

const WIKIPEDIA: INodeTypeDescription = {
	...SLACK,
	displayName: 'Wikipedia',
	name: 'toolWikipedia',
	description: 'Search Wikipedia',
	defaults: { name: 'Wikipedia' },
	properties: [{ displayName: 'Notice', name: 'notice', type: 'notice', default: '' }],
	credentials: [],
};

const NODE_WITH_INPUTS: INodeTypeDescription = {
	...SLACK,
	name: 'n8n-nodes-base.subagent',
	displayName: 'Subagent',
	inputs: ['main'],
};

const ElDialogStub = {
	template: `
		<div role="dialog">
			<slot name="header" />
			<slot />
			<slot name="footer" />
		</div>
	`,
	props: [
		'modelValue',
		'beforeClose',
		'class',
		'center',
		'width',
		'showClose',
		'closeOnClickModal',
		'closeOnPressEscape',
		'style',
		'appendTo',
		'lockScroll',
		'appendToBody',
	],
};

const MODAL_NAME = 'AgentToolsModal';

const renderComponent = createComponentRenderer(AgentToolsModal, {
	global: {
		stubs: {
			ElDialog: ElDialogStub,
			NodeIcon: { template: '<div data-test-id="node-icon" />' },
		},
	},
});

function makeWorkflow(overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return {
		id: 'wf-1',
		name: 'Daily sales digest',
		description: 'Ship a summary to #sales every morning',
		active: true,
		isArchived: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-02T00:00:00Z',
		versionId: 'v-1',
		activeVersionId: null,
		...overrides,
	} as IWorkflowDb;
}

describe('AgentToolsModal', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		uuidMockState.counter = 0;
		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		uiStore = mockedStore(useUIStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === SLACK.name) return SLACK;
			if (name === GMAIL.name) return GMAIL;
			if (name === GITHUB.name) return GITHUB;
			if (name === WIKIPEDIA.name) return WIKIPEDIA;
			if (name === NODE_WITH_INPUTS.name) return NODE_WITH_INPUTS;
			return null;
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [SLACK.name, GMAIL.name, GITHUB.name, NODE_WITH_INPUTS.name],
		};

		workflowsListStore.fetchAllWorkflows = vi.fn().mockResolvedValue([]);
		// Default: no workflows returned from the fetch. Tests opt in by calling
		// `seedWorkflows(...)`, which sets `searchWorkflows`'s return value
		// (the modal's local workflow catalog is populated from this result —
		// it no longer reads from the global `workflowsListStore` cache).
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([]);

		// Default: `getWorkflow` returns a node-free workflow, which is
		// compatible — tests that need incompatibility override this.
		getWorkflowMock.mockReset();
		getWorkflowMock.mockResolvedValue({ id: 'wf-1', name: 'Daily sales digest', nodes: [] });
		showErrorMock.mockReset();
		showMessageMock.mockReset();

		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
		uiStore.openModalWithData = vi.fn();
	});

	function seedWorkflows(workflows: IWorkflowDb[]) {
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue(workflows);
	}

	function defaultProps(tools: AgentJsonToolRef[] = [], onConfirm = vi.fn()) {
		return {
			props: {
				modalName: MODAL_NAME,
				data: { tools, onConfirm },
			},
		};
	}

	function toolRef(
		nodeType: string,
		overrides: Partial<AgentJsonToolRef['node']> = {},
	): AgentJsonToolRef {
		return {
			type: 'node',
			name: nodeType,
			node: {
				nodeType,
				nodeTypeVersion: 1,
				credentials: { slackApi: { id: 'c', name: 'cred' } },
				...overrides,
			},
		};
	}

	async function typeInSearch(container: Element, value: string) {
		const input = container.querySelector('input') as HTMLInputElement | null;
		expect(input).not.toBeNull();
		await fireEvent.update(input!, value);
	}

	it('renders the modal header', () => {
		const { getByRole } = renderComponent(defaultProps());
		expect(getByRole('dialog').textContent).toContain('Tools');
	});

	it('lists available node-type tools, excluding nodes that take main inputs', () => {
		const { getByTestId, queryByText } = renderComponent(defaultProps());
		const available = getByTestId('agent-tools-available-list');
		expect(available.textContent).toContain('Slack');
		expect(available.textContent).toContain('Gmail');
		expect(available.textContent).toContain('GitHub');
		// Nodes with inputs are not simple tools — they should be excluded.
		expect(queryByText('Subagent')).toBeNull();
	});

	it('shows an empty Connected section when no tools are configured', () => {
		const { queryByTestId } = renderComponent(defaultProps());
		expect(queryByTestId('agent-tools-connected-list')).toBeNull();
	});

	it('renders configured node tools in the Connected list', () => {
		const { getByTestId } = renderComponent(defaultProps([toolRef(SLACK.name)]));
		const connected = getByTestId('agent-tools-connected-list');
		expect(connected.textContent).toContain(SLACK.name);
	});

	it('surfaces the "Add credentials" chip on rows missing credentials', () => {
		const tool = toolRef(GMAIL.name, { credentials: undefined });
		const { queryByTestId } = renderComponent(defaultProps([tool]));
		expect(queryByTestId('agent-tool-add-credentials-chip')).not.toBeNull();
	});

	it('does not surface the chip when credentials are present', () => {
		const tool = toolRef(SLACK.name);
		const { queryByTestId } = renderComponent(defaultProps([tool]));
		expect(queryByTestId('agent-tool-add-credentials-chip')).toBeNull();
	});

	it('keeps already-connected node types listed under Available (duplicates allowed)', () => {
		// Users can add a 2nd Slack tool with a different name + credentials.
		// The config modal enforces tool-name uniqueness on save.
		const { getByTestId } = renderComponent(defaultProps([toolRef(SLACK.name)]));
		const available = getByTestId('agent-tools-available-list');
		expect(available.textContent).toContain('Slack');
		expect(available.textContent).toContain('Gmail');
	});

	it('filters both sections by search query (debounced)', async () => {
		const { getByTestId, queryByTestId, container } = renderComponent(
			defaultProps([toolRef(SLACK.name)]),
		);

		await typeInSearch(container, 'gmail');

		await waitFor(() => {
			const available = getByTestId('agent-tools-available-list');
			expect(available.textContent).toContain('Gmail');
			expect(available.textContent).not.toContain('GitHub');
		});
		expect(queryByTestId('agent-tools-connected-list')).toBeNull();
	});

	it('shows a query-aware empty state when search matches nothing', async () => {
		const { queryByTestId, queryByText, container } = renderComponent(defaultProps());
		await typeInSearch(container, 'zzzzz');

		await waitFor(() => {
			expect(queryByText(/No tools match.*zzzzz/)).not.toBeNull();
			expect(queryByTestId('agent-tools-available-list')).toBeNull();
		});
	});

	it('opens the config modal (not the list commit) when Connect is clicked on an available node', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderComponent(defaultProps([], onConfirm));

		const available = getByTestId('agent-tools-available-list');
		const addButton = available.querySelector('button');
		expect(addButton).not.toBeNull();
		await fireEvent.click(addButton!);

		// Connect no longer commits directly — it opens the config modal and waits
		// for the user to Save (onConfirm fires only after the config modal saves).
		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(payload.name).toBe('agentToolConfigModal');
		expect(payload.data.toolRef).toMatchObject({
			type: 'node',
			node: { nodeType: SLACK.name },
		});
		expect(typeof payload.data.onConfirm).toBe('function');
	});

	it('adds setup-less node tools directly without opening the config modal', async () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [WIKIPEDIA.name],
		};
		const onConfirm = vi.fn();
		const { getByTestId } = renderComponent(defaultProps([], onConfirm));

		const available = getByTestId('agent-tools-available-list');
		await fireEvent.click(available.querySelector('button')!);

		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		const [tools] = onConfirm.mock.calls[0];
		expect(tools[0].id).toBeUndefined();
		expect(tools).toEqual([
			expect.objectContaining({
				type: 'node',
				name: 'Wikipedia',
				node: {
					nodeType: WIKIPEDIA.name,
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			}),
		]);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		expect(showMessageMock).toHaveBeenCalledWith({ title: 'Tool added', type: 'success' });
	});

	it('uniquifies setup-less node tool names when adding duplicates directly', async () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [WIKIPEDIA.name],
		};
		const existing: AgentJsonToolRef = {
			type: 'node',
			name: 'Wikipedia',
			node: {
				nodeType: WIKIPEDIA.name,
				nodeTypeVersion: 1,
				nodeParameters: {},
			},
		};
		const onConfirm = vi.fn();
		const { getByTestId } = renderComponent(defaultProps([existing], onConfirm));

		const available = getByTestId('agent-tools-available-list');
		await fireEvent.click(available.querySelector('button')!);

		const [tools] = onConfirm.mock.calls[0];
		expect(tools[1]).toMatchObject({ name: 'Wikipedia (1)' });
	});

	it('appends the configured tool to workingTools once the config modal saves', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderComponent(defaultProps([], onConfirm));

		const available = getByTestId('agent-tools-available-list');
		await fireEvent.click(available.querySelector('button')!);

		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		const configuredRef: AgentJsonToolRef = {
			type: 'node',
			name: 'Slack',
			description: 'Send a message to Slack',
			node: {
				nodeType: SLACK.name,
				nodeTypeVersion: 1,
				nodeParameters: { resource: 'message' },
				credentials: { slackApi: { id: 'c-1', name: 'Prod Slack' } },
			},
		};
		payload.data.onConfirm(configuredRef);

		expect(onConfirm).toHaveBeenCalledTimes(1);
		const [tools] = onConfirm.mock.calls[0];
		expect(tools).toHaveLength(1);
		expect(tools[0]).toStrictEqual(configuredRef);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		expect(showMessageMock).toHaveBeenCalledWith({ title: 'Tool added', type: 'success' });
	});

	it('shows the available tools count in the section heading', () => {
		const { getByTestId } = renderComponent(defaultProps());
		const wrapper = getByTestId('agent-tools-list');
		expect(wrapper.textContent).toContain('Available tools (3)');
	});

	it('opens the config modal with the clicked tool ref when the gear is clicked', async () => {
		const tool = toolRef(SLACK.name);
		const { getByTestId } = renderComponent(defaultProps([tool]));

		const connectedList = getByTestId('agent-tools-connected-list');
		const gearButton = connectedList.querySelector(
			'button[aria-label], button',
		) as HTMLButtonElement | null;
		expect(gearButton).not.toBeNull();
		await fireEvent.click(gearButton!);

		expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(payload.name).toBe('agentToolConfigModal');
		// Vue's reactivity wraps array items in a proxy, so compare by value.
		expect(payload.data.toolRef).toStrictEqual(tool);
		expect(payload.data.existingToolNames).toEqual([]);
		expect(typeof payload.data.onConfirm).toBe('function');
	});

	it('round-trips config edits back into workingTools via the onConfirm callback', async () => {
		const onConfirm = vi.fn();
		const tool = toolRef(SLACK.name);
		const { getByTestId } = renderComponent(defaultProps([tool], onConfirm));

		const connectedList = getByTestId('agent-tools-connected-list');
		const gearButton = connectedList.querySelector('button') as HTMLButtonElement | null;
		await fireEvent.click(gearButton!);

		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		const editedRef: AgentJsonToolRef = {
			...tool,
			name: 'Slack renamed',
		};
		payload.data.onConfirm(editedRef);

		expect(onConfirm).toHaveBeenCalled();
		const [committed] = onConfirm.mock.calls[onConfirm.mock.calls.length - 1];
		expect(committed).toHaveLength(1);
		expect(committed[0].name).toBe('Slack renamed');
	});

	describe('workflow tools', () => {
		it('fetches project workflows on open, pre-filtered to supported trigger types', () => {
			renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [], projectId: 'p-42', onConfirm: vi.fn() },
				},
			});
			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith({
				projectId: 'p-42',
				triggerNodeTypes: expect.arrayContaining([
					'n8n-nodes-base.executeWorkflowTrigger',
					'@n8n/n8n-nodes-langchain.chatTrigger',
					'n8n-nodes-base.manualTrigger',
					'n8n-nodes-base.scheduleTrigger',
					'n8n-nodes-base.formTrigger',
				]),
			});
		});

		it('renders a Workflows section with non-archived available workflows', async () => {
			seedWorkflows([
				makeWorkflow({ id: 'wf-1', name: 'Daily sales digest' }),
				makeWorkflow({ id: 'wf-archived', name: 'Old archived', isArchived: true }),
			]);

			const { getByTestId, queryByText, getAllByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [], projectId: 'p-42', onConfirm: vi.fn() },
				},
			});

			const list = await waitFor(() => getByTestId('agent-tools-available-workflows-list'));
			const rows = getAllByTestId('agent-tools-available-workflow-row');
			expect(rows).toHaveLength(1);
			expect(list.textContent).toContain('Daily sales digest');
			// Archived workflows are excluded.
			expect(queryByText('Old archived')).toBeNull();
		});

		it('keeps already-connected workflows listed under Available (duplicates allowed)', async () => {
			seedWorkflows([makeWorkflow({ id: 'wf-1', name: 'Daily digest' })]);
			const existing: AgentJsonToolRef = {
				type: 'workflow',
				workflow: 'Daily digest',
				name: 'Daily digest',
			};

			const { getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [existing], projectId: 'p-42', onConfirm: vi.fn() },
				},
			});

			// Users can add the same workflow twice with different descriptions or
			// input schemas — the config modal enforces tool-name uniqueness.
			const list = await waitFor(() => getByTestId('agent-tools-available-workflows-list'));
			expect(list.textContent).toContain('Daily digest');
		});

		it('opens the config modal with a workflow ref when Connect is clicked on a workflow row', async () => {
			seedWorkflows([
				makeWorkflow({ id: 'wf-1', name: 'Daily sales digest', description: 'Summary' }),
			]);
			// Workflow has no incompatible body nodes — Connect should open config.
			getWorkflowMock.mockResolvedValueOnce({ id: 'wf-1', name: 'Daily sales digest', nodes: [] });

			const { getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [], projectId: 'p-42', onConfirm: vi.fn() },
				},
			});

			const row = await waitFor(() => getByTestId('agent-tools-available-workflow-row'));
			await fireEvent.click(row.querySelector('button')!);

			await waitFor(() => {
				expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
			});
			const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(payload.name).toBe('agentToolConfigModal');
			expect(payload.data.toolRef).toMatchObject({
				type: 'workflow',
				workflow: 'Daily sales digest',
				name: 'Daily sales digest',
				description: 'Summary',
				allOutputs: false,
			});
			expect(showErrorMock).not.toHaveBeenCalled();
		});

		it('blocks Connect and shows an error toast when the workflow contains incompatible body nodes', async () => {
			seedWorkflows([makeWorkflow({ id: 'wf-1', name: 'Daily sales digest' })]);
			getWorkflowMock.mockResolvedValueOnce({
				id: 'wf-1',
				name: 'Daily sales digest',
				nodes: [
					{ name: 'Wait a bit', type: 'n8n-nodes-base.wait' },
					{ name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				],
			});

			const { getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [], projectId: 'p-42', onConfirm: vi.fn() },
				},
			});

			const row = await waitFor(() => getByTestId('agent-tools-available-workflow-row'));
			await fireEvent.click(row.querySelector('button')!);

			await waitFor(() => {
				expect(showErrorMock).toHaveBeenCalledTimes(1);
			});
			// The config modal must NOT open for an incompatible workflow.
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		});

		it('shows an error toast when the compatibility pre-check fetch fails', async () => {
			seedWorkflows([makeWorkflow({ id: 'wf-1', name: 'Daily sales digest' })]);
			getWorkflowMock.mockRejectedValueOnce(new Error('network down'));

			const { getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [], projectId: 'p-42', onConfirm: vi.fn() },
				},
			});

			const row = await waitFor(() => getByTestId('agent-tools-available-workflow-row'));
			await fireEvent.click(row.querySelector('button')!);

			await waitFor(() => {
				expect(showErrorMock).toHaveBeenCalledTimes(1);
			});
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		});

		it('renders connected workflow tools in the Connected section', () => {
			const existing: AgentJsonToolRef = {
				type: 'workflow',
				workflow: 'Daily digest',
				name: 'Daily digest',
				description: 'Summary',
			};

			const { getAllByTestId, getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [existing], onConfirm: vi.fn() },
				},
			});

			const connectedList = getByTestId('agent-tools-connected-list');
			expect(connectedList.textContent).toContain('Daily digest');
			expect(connectedList.textContent).toContain('Summary');
			// Workflow rows read identically to node rows: "✓ Connected" badge + gear,
			// no trash. Removal is sidebar-only for all tool types.
			expect(connectedList.textContent).toContain('Connected');
			expect(getAllByTestId('agent-tools-connected-workflow-row')).toHaveLength(1);
			expect(getByTestId('agent-tools-connected-workflow-configure')).toBeTruthy();
		});

		it('opens the config modal when the configure button on a connected workflow row is clicked', async () => {
			const existing: AgentJsonToolRef = {
				type: 'workflow',
				workflow: 'Daily digest',
				name: 'Daily digest',
			};
			const { getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [existing], onConfirm: vi.fn() },
				},
			});

			await fireEvent.click(getByTestId('agent-tools-connected-workflow-configure'));

			expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
			const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(payload.name).toBe('agentToolConfigModal');
			expect(payload.data.toolRef).toStrictEqual(existing);
		});

		it('appends the configured workflow ref to workingTools on save', async () => {
			seedWorkflows([makeWorkflow({ id: 'wf-1', name: 'Daily sales digest' })]);
			getWorkflowMock.mockResolvedValueOnce({ id: 'wf-1', name: 'Daily sales digest', nodes: [] });
			const onConfirm = vi.fn();

			const { getByTestId } = renderComponent({
				props: {
					modalName: MODAL_NAME,
					data: { tools: [], projectId: 'p-42', onConfirm },
				},
			});

			const row = await waitFor(() => getByTestId('agent-tools-available-workflow-row'));
			await fireEvent.click(row.querySelector('button')!);

			await waitFor(() => {
				expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
			});
			const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
			const savedRef: AgentJsonToolRef = {
				type: 'workflow',
				workflow: 'Daily sales digest',
				name: 'Sales summary',
				description: 'LLM-facing description',
				allOutputs: true,
			};
			payload.data.onConfirm(savedRef);

			expect(onConfirm).toHaveBeenCalledTimes(1);
			const [tools] = onConfirm.mock.calls[0];
			expect(tools).toHaveLength(1);
			expect(tools[0]).toStrictEqual(savedRef);
			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
			expect(showMessageMock).toHaveBeenCalledWith({ title: 'Tool added', type: 'success' });
		});
	});
});
