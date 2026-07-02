import { reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentView from '../views/AgentView.vue';
import { VIEWS } from '@/app/constants';
import type { AgentReturnContext } from '../agentReturnContext.store';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const route = reactive<{ params: { agentId?: string } }>({ params: { agentId: 'agent-1' } });
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => route,
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

const returnContextStore = reactive<{ context: AgentReturnContext | null; clear: () => void }>({
	context: null,
	clear: vi.fn(() => {
		returnContextStore.context = null;
	}),
});
vi.mock('../agentReturnContext.store', () => ({
	useAgentReturnContextStore: () => returnContextStore,
}));

const renderComponent = createComponentRenderer(AgentView, {
	global: { stubs: { RouterView: true } },
});

describe('AgentView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		returnContextStore.context = null;
		route.params = { agentId: 'agent-1' };
	});

	it('shows the back-to-workflow banner on the pages of the round-trip agent', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc', agentId: 'agent-1' };
		const { getByTestId } = renderComponent();
		expect(getByTestId('agent-back-to-workflow')).toBeInTheDocument();
	});

	it('hides the banner when there is no return context', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('agent-back-to-workflow')).toBeNull();
	});

	it('hides the banner when viewing a different agent than the round-trip', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc', agentId: 'agent-1' };
		route.params = { agentId: 'agent-2' };
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('agent-back-to-workflow')).toBeNull();
	});

	it('navigates back to the origin workflow and node, clearing the context', async () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc', agentId: 'agent-1' };
		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(returnContextStore.clear).toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-1', nodeId: 'abc' },
		});
	});

	it('omits the node id from the back navigation when the origin had none', async () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: '', agentId: 'agent-1' };
		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(push).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-1' },
		});
	});

	it('clears the round-trip context when the agent feature unmounts', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc', agentId: 'agent-1' };
		const { unmount } = renderComponent();

		unmount();

		expect(returnContextStore.clear).toHaveBeenCalled();
	});
});
