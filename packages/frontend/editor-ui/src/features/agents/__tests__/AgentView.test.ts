import { reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentView from '../views/AgentView.vue';
import { VIEWS } from '@/app/constants';
import type { AgentReturnContext } from '../agentReturnContext.store';

const { push, routeLeaveGuards } = vi.hoisted(() => ({
	push: vi.fn(),
	routeLeaveGuards: [] as Array<() => unknown>,
}));
const route = reactive<{ params: { agentId?: string } }>({ params: { agentId: 'agent-1' } });
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => route,
	RouterLink: vi.fn(),
	// Capture the guard so a test can simulate a real route-level exit.
	onBeforeRouteLeave: (guard: () => unknown) => {
		routeLeaveGuards.push(guard);
	},
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
		routeLeaveGuards.length = 0;
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

	it('clears the round-trip context on a real route-level exit', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc', agentId: 'agent-1' };
		renderComponent();

		// Leaving the agent route fires the onBeforeRouteLeave guard.
		routeLeaveGuards.forEach((guard) => guard());

		expect(returnContextStore.clear).toHaveBeenCalled();
	});

	it('does not clear the context on a bare unmount (survives the Suspense remount on first navigation)', () => {
		returnContextStore.context = { workflowId: 'wf-1', nodeId: 'abc', agentId: 'agent-1' };
		const { unmount } = renderComponent();

		// A transient unmount — e.g. <Suspense> swapping in an async child-route
		// chunk on the first (uncached) navigation — must NOT wipe the just-set
		// round-trip context, or the "Back to workflow" banner blinks and vanishes.
		unmount();

		expect(returnContextStore.clear).not.toHaveBeenCalled();
	});
});
