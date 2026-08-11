import { useAgentNavigation } from '../composables/useAgentNavigation';
import { AGENT_BUILDER_VIEW, AGENT_VIEW } from '../constants';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

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
});
