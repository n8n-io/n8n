import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import type { INodeTypeDescription } from 'n8n-workflow';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { HTTP_REQUEST_NODE_TYPE, SLACK_NODE_TYPE, VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { AGENT_BUILDER_VIEW, AGENT_SESSIONS_LIST_VIEW } from '@/features/agents/constants';
import { listAgentsPageGlobal } from '@/features/agents/composables/useAgentApi';
import type { AgentResource } from '@/features/agents/types';
import { useRecentResources } from './useRecentResources';

const recentNodesRef = ref<Record<string, Array<{ nodeId: string; openedAt: number }>>>({});

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		useLocalStorage: vi.fn((key: string, defaultValue: unknown) => {
			if (key === 'n8n-recent-nodes') {
				return recentNodesRef;
			}
			return ref(defaultValue);
		}),
	};
});

const mockSetNodeActive = vi.fn();

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		setNodeActive: mockSetNodeActive,
	}),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPageGlobal: vi.fn(),
}));

const mockRouterResolve = vi.fn(
	(location: { params: { workflowId?: string; agentId?: string } }) => ({
		href: location.params.agentId
			? `/agents/${location.params.agentId}`
			: `/workflow/${location.params.workflowId}`,
	}),
);
const mockRouterPush = vi.fn();
const mockCurrentRoute = ref<{ name: string; params: Record<string, string> }>({
	name: VIEWS.WORKFLOW,
	params: { workflowId: 'workflow-1' },
});

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({
		resolve: mockRouterResolve,
		push: mockRouterPush,
		currentRoute: mockCurrentRoute,
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const workflowRoute = (
	params: Record<string, string>,
	query: Record<string, string> = {},
	name: string = VIEWS.WORKFLOW,
) => ({ name, params, query }) as unknown as RouteLocationNormalized;

const nodesById = {
	'node-1': createTestNode({ id: 'node-1', name: 'Fetch data', type: HTTP_REQUEST_NODE_TYPE }),
	'node-2': createTestNode({ id: 'node-2', name: 'Notify team', type: SLACK_NODE_TYPE }),
};

const isKnownNodeId = (nodeId: string): nodeId is keyof typeof nodesById => nodeId in nodesById;

const nodeTypeDisplayNames: Record<string, string> = {
	[HTTP_REQUEST_NODE_TYPE]: 'HTTP Request',
	[SLACK_NODE_TYPE]: 'Slack',
};

describe('useRecentResources', () => {
	let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
	let recentWorkflowsStore: ReturnType<typeof useRecentWorkflowsStore>;

	const openWorkflows = (
		trackResourceOpened: (to: RouteLocationNormalized) => void,
		workflowIds: string[],
	) => {
		for (const workflowId of workflowIds) {
			trackResourceOpened(workflowRoute({ workflowId }));
		}
	};

	const recentWorkflowIds = (items: Array<{ id: string }>) =>
		items.filter((item) => item.id.startsWith('recent-workflow')).map((item) => item.id);

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		let openedAt = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => ++openedAt);
		createTestingPinia({ stubActions: false });

		recentNodesRef.value = {};
		mockCurrentRoute.value = { name: VIEWS.WORKFLOW, params: { workflowId: 'workflow-1' } };

		mockedStore(useWorkflowsStore).workflowId = 'workflow-1';

		const nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = (name: string) =>
			({ name, displayName: nodeTypeDisplayNames[name] }) as INodeTypeDescription;

		workflowsListStore = mockedStore(useWorkflowsListStore);
		vi.spyOn(workflowsListStore, 'searchWorkflows').mockResolvedValue([]);

		recentWorkflowsStore = useRecentWorkflowsStore();

		mockedStore(useSettingsStore).isAgentsEnabled = true;
		vi.mocked(listAgentsPageGlobal).mockResolvedValue({ count: 0, data: [] });

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1'));
		vi.spyOn(workflowDocumentStore, 'findNodeByPartialId').mockImplementation((nodeId) =>
			isKnownNodeId(nodeId) ? nodesById[nodeId] : undefined,
		);

		Object.defineProperty(window, 'location', {
			value: { href: '' },
			writable: true,
		});
	});

	describe('trackResourceOpened', () => {
		it('registers the workflow when a workflow route opens', () => {
			const { trackResourceOpened } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1' }));

			expect(recentWorkflowsStore.globalRecentWorkflowOpens.map(({ id }) => id)).toEqual([
				'workflow-1',
			]);
			expect(recentNodesRef.value).toEqual({});
		});

		it('registers the workflow and the node when the route has a node id', () => {
			const { trackResourceOpened } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));

			expect(recentWorkflowsStore.globalRecentWorkflowOpens.map(({ id }) => id)).toEqual([
				'workflow-1',
			]);
			expect(recentNodesRef.value['workflow-1']).toEqual([
				{ nodeId: 'node-1', openedAt: expect.any(Number) },
			]);
		});

		it('moves a reopened node to the top of the recent nodes', () => {
			const { trackResourceOpened } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-2' }));
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));

			expect(recentNodesRef.value['workflow-1'].map(({ nodeId }) => nodeId)).toEqual([
				'node-1',
				'node-2',
			]);
		});

		it('keeps at most 5 recent nodes for each workflow', () => {
			const { trackResourceOpened } = useRecentResources();

			for (let index = 1; index <= 7; index++) {
				trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: `node-${index}` }));
			}

			expect(recentNodesRef.value['workflow-1'].map(({ nodeId }) => nodeId)).toEqual([
				'node-7',
				'node-6',
				'node-5',
				'node-4',
				'node-3',
			]);
		});

		it('keeps a separate recent node list for each workflow', () => {
			const { trackResourceOpened } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-2', nodeId: 'node-2' }));

			expect(recentNodesRef.value['workflow-1'].map(({ nodeId }) => nodeId)).toEqual(['node-1']);
			expect(recentNodesRef.value['workflow-2'].map(({ nodeId }) => nodeId)).toEqual(['node-2']);
		});

		it('does not register a new workflow', () => {
			const { trackResourceOpened } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'new' }, { new: 'true' }));

			expect(recentWorkflowsStore.globalRecentWorkflowOpens).toEqual([]);
		});

		it('does not register routes outside the workflow view', () => {
			const { trackResourceOpened } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1' }, {}, VIEWS.WORKFLOWS));

			expect(recentWorkflowsStore.globalRecentWorkflowOpens).toEqual([]);
		});
	});

	describe('recent node items', () => {
		it('returns the recent nodes of the current workflow with the most recent first', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-2' }));

			const nodeItems = commands.value.filter((item) => item.id.startsWith('recent-node'));

			expect(nodeItems.map((item) => item.id)).toEqual([
				'recent-node-workflow-1-node-2',
				'recent-node-workflow-1-node-1',
			]);
			expect(nodeItems[1]).toEqual(
				expect.objectContaining({
					title: 'Fetch data',
					description: 'HTTP Request',
					section: 'commandBar.sections.recent',
					icon: {
						component: NodeIcon,
						props: {
							nodeType: { name: HTTP_REQUEST_NODE_TYPE, displayName: 'HTTP Request' },
							size: 16,
						},
					},
				}),
			);
		});

		it('skips nodes that no longer exist in the workflow', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'deleted-node' }));

			expect(commands.value.map((item) => item.id)).toEqual(['recent-node-workflow-1-node-1']);
		});

		it('opens the node when the item handler runs', async () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			await commands.value[0].handler?.();

			expect(mockSetNodeActive).toHaveBeenCalledWith('node-1', 'command_bar');
		});

		it('returns no node items outside the workflow view', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			mockCurrentRoute.value = { name: VIEWS.WORKFLOWS, params: {} };

			expect(commands.value).toEqual([]);
		});

		it('returns no node items when the current workflow has no recent nodes', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1', nodeId: 'node-1' }));
			mockCurrentRoute.value = { name: VIEWS.WORKFLOW, params: { workflowId: 'workflow-2' } };

			expect(commands.value).toEqual([]);
		});
	});

	describe('initialize', () => {
		it('does not request workflows when no workflow was opened', async () => {
			const { initialize } = useRecentResources();

			await initialize?.();

			expect(workflowsListStore.searchWorkflows).not.toHaveBeenCalled();
		});

		it('resolves the recent workflows with one request', async () => {
			const { trackResourceOpened, initialize } = useRecentResources();
			openWorkflows(trackResourceOpened, ['workflow-1', 'workflow-2', 'workflow-3']);

			await initialize?.();

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledTimes(1);
			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith({
				ids: ['workflow-3', 'workflow-2', 'workflow-1'],
				isArchived: false,
				select: ['id', 'name'],
				options: { skip: 0, take: 3, includeScopes: false },
			});
		});

		it('lists the returned workflows in recent-open order', async () => {
			mockCurrentRoute.value = { name: VIEWS.WORKFLOWS, params: {} };
			workflowsListStore.searchWorkflows.mockResolvedValue([
				createTestWorkflow({ id: 'workflow-2' }),
				createTestWorkflow({ id: 'workflow-4' }),
				createTestWorkflow({ id: 'workflow-1' }),
			]);
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			openWorkflows(trackResourceOpened, ['workflow-1', 'workflow-2', 'workflow-3', 'workflow-4']);

			await initialize?.();

			expect(recentWorkflowIds(commands.value)).toEqual([
				'recent-workflow-workflow-4',
				'recent-workflow-workflow-2',
				'recent-workflow-workflow-1',
			]);
		});

		it('excludes the current workflow', async () => {
			workflowsListStore.searchWorkflows.mockResolvedValue([
				createTestWorkflow({ id: 'workflow-1' }),
				createTestWorkflow({ id: 'workflow-2' }),
			]);
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			openWorkflows(trackResourceOpened, ['workflow-1', 'workflow-2']);

			await initialize?.();

			expect(recentWorkflowIds(commands.value)).toEqual(['recent-workflow-workflow-2']);
		});

		it('shows at most 5 workflows', async () => {
			const workflowIds = Array.from({ length: 7 }, (_, index) => `workflow-${index + 1}`);
			mockCurrentRoute.value = { name: VIEWS.WORKFLOWS, params: {} };
			workflowsListStore.searchWorkflows.mockResolvedValue(
				workflowIds.map((id) => createTestWorkflow({ id })),
			);
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			openWorkflows(trackResourceOpened, workflowIds);

			await initialize?.();

			expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({
					ids: ['workflow-7', 'workflow-6', 'workflow-5', 'workflow-4', 'workflow-3', 'workflow-2'],
				}),
			);
			expect(recentWorkflowIds(commands.value)).toEqual([
				'recent-workflow-workflow-7',
				'recent-workflow-workflow-6',
				'recent-workflow-workflow-5',
				'recent-workflow-workflow-4',
				'recent-workflow-workflow-3',
			]);
		});

		it('keeps the previous workflows when the request fails', async () => {
			workflowsListStore.searchWorkflows.mockResolvedValueOnce([
				createTestWorkflow({ id: 'workflow-2' }),
			]);
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			openWorkflows(trackResourceOpened, ['workflow-2']);
			await initialize?.();

			workflowsListStore.searchWorkflows.mockRejectedValueOnce(new Error('Request failed'));
			await initialize?.();

			expect(recentWorkflowIds(commands.value)).toEqual(['recent-workflow-workflow-2']);
		});

		it('creates workflow items that link to the workflow and open it', async () => {
			workflowsListStore.searchWorkflows.mockResolvedValue([
				createTestWorkflow({ id: 'workflow-2', name: 'Sync contacts' }),
			]);
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			openWorkflows(trackResourceOpened, ['workflow-2']);
			await initialize?.();

			const [workflowItem] = commands.value;
			await workflowItem.handler?.();

			expect(workflowItem).toEqual({
				id: 'recent-workflow-workflow-2',
				title: 'Sync contacts',
				section: 'commandBar.sections.recent',
				icon: { type: 'icon', value: 'workflow' },
				href: '/workflow/workflow-2',
				handler: expect.any(Function),
			});
			expect(mockRouterResolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { workflowId: 'workflow-2' },
			});
			expect(window.location.href).toBe('/workflow/workflow-2');
		});
	});
	describe('recent agents', () => {
		const agentRoute = (agentId: string, name: string = AGENT_BUILDER_VIEW) =>
			({
				name,
				params: { projectId: 'project-1', agentId },
				query: {},
			}) as unknown as RouteLocationNormalized;

		const createAgent = (id: string, name = `Agent ${id}`) =>
			({ id, name, projectId: 'project-1' }) as AgentResource;

		beforeEach(() => {
			mockCurrentRoute.value = { name: VIEWS.WORKFLOWS, params: {} };
		});

		it('resolves the agents opened on any agent page with one ids request', async () => {
			const { trackResourceOpened, initialize } = useRecentResources();
			trackResourceOpened(agentRoute('agent-1'));
			trackResourceOpened(agentRoute('agent-2', AGENT_SESSIONS_LIST_VIEW));

			await initialize?.();

			expect(listAgentsPageGlobal).toHaveBeenCalledTimes(1);
			expect(listAgentsPageGlobal).toHaveBeenCalledWith(expect.anything(), {
				skip: 0,
				take: 2,
				filter: { ids: ['agent-2', 'agent-1'] },
			});
		});

		it('does not request agents when agents are disabled', async () => {
			mockedStore(useSettingsStore).isAgentsEnabled = false;
			const { trackResourceOpened, initialize } = useRecentResources();
			trackResourceOpened(agentRoute('agent-1'));

			await initialize?.();

			expect(listAgentsPageGlobal).not.toHaveBeenCalled();
		});

		it('lists agents and workflows together in recent-open order', async () => {
			workflowsListStore.searchWorkflows.mockResolvedValue([
				createTestWorkflow({ id: 'workflow-1' }),
				createTestWorkflow({ id: 'workflow-2' }),
			]);
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({
				count: 1,
				data: [createAgent('agent-1')],
			});
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-1' }));
			trackResourceOpened(agentRoute('agent-1'));
			trackResourceOpened(workflowRoute({ workflowId: 'workflow-2' }));

			await initialize?.();

			expect(commands.value.map(({ id }) => id)).toEqual([
				'recent-workflow-workflow-2',
				'recent-agent-agent-1',
				'recent-workflow-workflow-1',
			]);
		});

		it('excludes the current agent', async () => {
			mockCurrentRoute.value = { name: AGENT_BUILDER_VIEW, params: { agentId: 'agent-1' } };
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({
				count: 2,
				data: [createAgent('agent-1'), createAgent('agent-2')],
			});
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			trackResourceOpened(agentRoute('agent-1'));
			trackResourceOpened(agentRoute('agent-2'));

			await initialize?.();

			expect(commands.value.map(({ id }) => id)).toEqual(['recent-agent-agent-2']);
		});

		it('creates agent items that link to the agent builder and open it', async () => {
			vi.mocked(listAgentsPageGlobal).mockResolvedValue({
				count: 1,
				data: [createAgent('agent-1', 'Support Agent')],
			});
			const { trackResourceOpened, initialize, commands } = useRecentResources();
			trackResourceOpened(agentRoute('agent-1'));
			await initialize?.();

			const [agentItem] = commands.value;
			await agentItem.handler?.();

			const location = {
				name: AGENT_BUILDER_VIEW,
				params: { projectId: 'project-1', agentId: 'agent-1' },
			};
			expect(agentItem).toEqual({
				id: 'recent-agent-agent-1',
				title: 'Support Agent',
				section: 'commandBar.sections.recent',
				icon: { type: 'icon', value: 'bot' },
				href: '/agents/agent-1',
				handler: expect.any(Function),
			});
			expect(mockRouterPush).toHaveBeenCalledWith(location);
		});
	});
});
