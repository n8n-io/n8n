import { useAgentNavigation } from '../composables/useAgentNavigation';
import { AGENT_BUILDER_VIEW, AGENT_VIEW } from '../constants';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

const workflowsStore = {
	workflowId: 'wf-1',
	getPartialIdForNode: vi.fn((id: string) => id.slice(0, 6)),
};
vi.mock('@/app/stores/workflows.store', () => ({ useWorkflowsStore: () => workflowsStore }));

const returnContextStore = { set: vi.fn(), clear: vi.fn(), context: null };
vi.mock('../agentReturnContext.store', () => ({
	useAgentReturnContextStore: () => returnContextStore,
}));

describe('useAgentNavigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		workflowsStore.workflowId = 'wf-1';
	});

	it('openBuilder remembers the origin (partial node id) and pushes the builder route', async () => {
		await useAgentNavigation().openBuilder('proj-1', 'agent-9', 'node-abcdef-full');

		expect(workflowsStore.getPartialIdForNode).toHaveBeenCalledWith('node-abcdef-full');
		expect(returnContextStore.set).toHaveBeenCalledWith({ workflowId: 'wf-1', nodeId: 'node-a' });
		expect(push).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'proj-1', agentId: 'agent-9' },
		});
	});

	it('openAgent remembers an origin without a node and pushes the agent route', async () => {
		await useAgentNavigation().openAgent('proj-1', 'agent-9');

		expect(returnContextStore.set).toHaveBeenCalledWith({ workflowId: 'wf-1', nodeId: '' });
		expect(push).toHaveBeenCalledWith({
			name: AGENT_VIEW,
			params: { projectId: 'proj-1', agentId: 'agent-9' },
		});
	});

	it('does not set a return context when there is no origin workflow, but still navigates', async () => {
		workflowsStore.workflowId = '';

		await useAgentNavigation().openBuilder('proj-1', 'agent-9', 'node-1');

		expect(returnContextStore.set).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalled();
	});
});
