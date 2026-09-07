import { useAgentNavigation } from '../composables/useAgentNavigation';
import { AGENT_BUILDER_VIEW, AGENT_VIEW } from '../constants';
import { VIEWS } from '@/app/constants';

const { push, currentRoute } = vi.hoisted(() => ({
	push: vi.fn(),
	currentRoute: {
		value: {
			name: '',
			fullPath: '/workflow/wf-1',
			params: { workflowId: 'wf-1' } as Record<string, string>,
		},
	},
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push, currentRoute }) }));

const workflowId = { value: '' };
vi.mock('@/app/composables/useWorkflowId', () => ({ useWorkflowId: () => workflowId }));

const workflowsStore = { workflowId: 'wf-1', isNewWorkflow: false };
vi.mock('@/app/stores/workflows.store', () => ({ useWorkflowsStore: () => workflowsStore }));

const returnContextStore = { set: vi.fn(), clear: vi.fn(), context: null };
vi.mock('../agentReturnContext.store', () => ({
	useAgentReturnContextStore: () => returnContextStore,
}));

describe('useAgentNavigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		workflowId.value = '';
		workflowsStore.workflowId = 'wf-1';
		workflowsStore.isNewWorkflow = false;
		currentRoute.value = {
			name: VIEWS.WORKFLOW,
			fullPath: '/workflow/wf-1',
			params: { workflowId: 'wf-1' },
		};
	});

	it('openBuilder remembers the origin (workflow, node, agent) and pushes the builder route', async () => {
		await useAgentNavigation().openBuilder('proj-1', 'agent-9', 'node-abcdef');

		expect(returnContextStore.set).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			nodeId: 'node-abcdef',
			agentId: 'agent-9',
		});
		expect(push).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'proj-1', agentId: 'agent-9' },
		});
	});

	it('openAgent remembers an origin without a node and pushes the agent route', async () => {
		await useAgentNavigation().openAgent('proj-1', 'agent-9');

		expect(returnContextStore.set).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			nodeId: '',
			agentId: 'agent-9',
		});
		expect(push).toHaveBeenCalledWith({
			name: AGENT_VIEW,
			params: { projectId: 'proj-1', agentId: 'agent-9' },
		});
	});

	it('falls back to the route workflow id when the store id is empty', async () => {
		workflowsStore.workflowId = '';
		workflowId.value = 'wf-route';

		await useAgentNavigation().openBuilder('proj-1', 'agent-9', 'node-1');

		expect(returnContextStore.set).toHaveBeenCalledWith({
			workflowId: 'wf-route',
			nodeId: 'node-1',
			agentId: 'agent-9',
		});
	});

	it('remembers the caller route and embedded workflow id for an artifact', async () => {
		currentRoute.value = {
			name: 'InstanceAiThread',
			fullPath: '/assistant/thread-1',
			params: { threadId: 'thread-1' },
		};
		workflowId.value = 'artifact-workflow';
		workflowsStore.workflowId = 'stale-workflow';

		await useAgentNavigation().openBuilder('proj-1', 'agent-9');

		expect(returnContextStore.set).toHaveBeenCalledWith({
			workflowId: 'artifact-workflow',
			nodeId: '',
			agentId: 'agent-9',
			returnPath: '/assistant/thread-1',
		});
	});
});
