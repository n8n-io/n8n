import { reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentView from '../views/AgentView.vue';
import { VIEWS } from '@/app/constants';
import type { AgentReturnContext } from '../agentReturnContext.store';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {} }),
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
	});

	it('shows the back-to-workflow banner when a return context is set', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc' };
		const { getByTestId } = renderComponent();
		expect(getByTestId('agent-back-to-workflow')).toBeInTheDocument();
	});

	it('hides the banner when there is no return context', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('agent-back-to-workflow')).toBeNull();
	});

	it('navigates back to the origin workflow and node, clearing the context', async () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc' };
		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(returnContextStore.clear).toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-1', nodeId: 'abc' },
		});
	});

	it('clears the return context when unmounted', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc' };
		const { unmount } = renderComponent();

		unmount();

		expect(returnContextStore.clear).toHaveBeenCalled();
	});
});
